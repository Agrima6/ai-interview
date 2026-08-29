import amqp from "amqplib"
import { Router } from "express"
import axios from "axios"
import crypto from "crypto"

let connection = null
let channel = null
const subscribers = []

const delays = [0, 1000, 5000, 30000, 120000]

const DIRECT_ROUTING = {
    'REGISTRATION_SUBMITTED': [
        { envUrl: 'ONBOARDING_SERVICE_URL', apiKeyEnv: 'ONBOARDING_SERVICE_API_KEY', path: '/internal/v1/events/REGISTRATION_SUBMITTED' }
    ],
    'INVITATION_CREATED': [
        { envUrl: 'REGISTRATION_SERVICE_URL', apiKeyEnv: 'REGISTRATION_SERVICE_API_KEY', path: '/internal/v1/events/INVITATION_CREATED' },
        { envUrl: 'COMMUNICATION_SERVICE_URL', apiKeyEnv: 'COMMUNICATION_SERVICE_API_KEY', path: '/internal/v1/events/INVITATION_CREATED' }
    ],
    'ONBOARDING_APPROVED': [
        { envUrl: 'CLIENT_SERVICE_URL', apiKeyEnv: 'CLIENT_SERVICE_API_KEY', path: '/internal/v1/events/ONBOARDING_APPROVED' },
        { envUrl: 'AUTH_SERVICE_URL', apiKeyEnv: 'AUTH_SERVICE_API_KEY', path: '/internal/v1/events/ONBOARDING_APPROVED' },
        { envUrl: 'COMMUNICATION_SERVICE_URL', apiKeyEnv: 'COMMUNICATION_SERVICE_API_KEY', path: '/internal/v1/events/ONBOARDING_APPROVED' }
    ],
    'CLIENT_CREATED': [
        { envUrl: 'AUTH_SERVICE_URL', apiKeyEnv: 'AUTH_SERVICE_API_KEY', path: '/internal/v1/events/CLIENT_CREATED' }
    ],
    'USER_CREATED': [
        { envUrl: 'COMMUNICATION_SERVICE_URL', apiKeyEnv: 'COMMUNICATION_SERVICE_API_KEY', path: '/internal/v1/events/USER_CREATED' }
    ],
    'WELCOME_NOTIFICATION_REQUESTED': [
        { envUrl: 'COMMUNICATION_SERVICE_URL', apiKeyEnv: 'COMMUNICATION_SERVICE_API_KEY', path: '/internal/v1/events/WELCOME_NOTIFICATION_REQUESTED' }
    ],
    'COMMUNICATION_SEND': [
        { envUrl: 'COMMUNICATION_SERVICE_URL', apiKeyEnv: 'COMMUNICATION_SERVICE_API_KEY', path: '/internal/v1/events/COMMUNICATION_SEND' }
    ]
}

export const initQueue = async () => {
    const provider = process.env.QUEUE_PROVIDER || "direct"
    if (provider !== "rabbitmq") {
        console.log(`[${process.env.SERVICE_NAME || "service"}] Queue provider is ${provider}`)
        return
    }

    const rabbitUrl = process.env.RABBITMQ_URL
    if (!rabbitUrl) {
        if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
            console.error(`[${process.env.SERVICE_NAME || "service"}] QUEUE_PROVIDER=rabbitmq but RABBITMQ_URL is not set in production!`)
            process.exit(1)
        }
        throw new Error("RABBITMQ_URL is required when QUEUE_PROVIDER is rabbitmq")
    }

    try {
        connection = await amqp.connect(rabbitUrl)
        channel = await connection.createChannel()
        const exchange = process.env.RABBITMQ_EXCHANGE || "workmateiq.events"
        await channel.assertExchange(exchange, "topic", { durable: true })
        console.log(`[${process.env.SERVICE_NAME || "service"}] RabbitMQ connected and exchange asserted: ${exchange}`)
    } catch (error) {
        console.error(`[${process.env.SERVICE_NAME || "service"}] RabbitMQ connection error:`, error.message)
        if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
            process.exit(1)
        }
    }
}

export const publish = async (routingKey, payload, headers = {}) => {
    const provider = process.env.QUEUE_PROVIDER || "direct"
    if (provider === "rabbitmq") {
        if (!channel) {
            console.warn(`[${process.env.SERVICE_NAME || "service"}] RabbitMQ channel not available, skipping publish of ${routingKey}`)
            return
        }
        const exchange = process.env.RABBITMQ_EXCHANGE || "workmateiq.events"
        const content = Buffer.from(JSON.stringify(payload))
        channel.publish(exchange, routingKey, content, {
            persistent: true,
            headers: {
                ...headers,
                'x-attempts': headers['x-attempts'] || 0,
                requestId: headers.requestId || crypto.randomUUID(),
                correlationId: headers.correlationId || headers.requestId || crypto.randomUUID(),
            }
        })
        console.log(`[${process.env.SERVICE_NAME || "service"}] Published event ${routingKey} to RabbitMQ`)
    } else {
        const targets = DIRECT_ROUTING[routingKey] || []
        for (const target of targets) {
            const url = process.env[target.envUrl]
            const apiKey = process.env[target.apiKeyEnv]
            if (!url) continue

            setImmediate(async () => {
                try {
                    await axios.post(`${url}${target.path}`, { payload, headers }, {
                        headers: {
                            "X-Service-Name": process.env.SERVICE_NAME || "service",
                            "X-Service-API-Key": apiKey,
                            "X-Request-ID": headers.requestId || crypto.randomUUID(),
                            "X-Correlation-ID": headers.correlationId || headers.requestId || crypto.randomUUID(),
                        },
                        timeout: 10000,
                    })
                    console.log(`[${process.env.SERVICE_NAME || "service"}] Direct delivered event ${routingKey} to ${url}`)
                } catch (err) {
                    console.error(`[${process.env.SERVICE_NAME || "service"}] Direct delivery of ${routingKey} to ${url} failed:`, err.message)
                }
            })
        }
    }
}

export const subscribe = (queueName, routingKeys, handler) => {
    subscribers.push({ queueName, routingKeys, handler })
}

export const startConsumers = async () => {
    const provider = process.env.QUEUE_PROVIDER || "direct"
    if (provider !== "rabbitmq") {
        console.log(`[${process.env.SERVICE_NAME || "service"}] Direct mode: consumers registered for HTTP events`)
        return
    }
    if (!channel) return

    const exchange = process.env.RABBITMQ_EXCHANGE || "workmateiq.events"
    const maxAttempts = parseInt(process.env.QUEUE_RETRY_ATTEMPTS || "5", 10)

    for (const sub of subscribers) {
        const { queueName, routingKeys, handler } = sub
        await channel.assertQueue(queueName, { durable: true })
        for (const rk of routingKeys) {
            await channel.bindQueue(queueName, exchange, rk)
        }
        await channel.prefetch(10)
        await channel.consume(queueName, async (msg) => {
            if (!msg) return
            const payload = JSON.parse(msg.content.toString())
            const headers = msg.properties.headers || {}
            try {
                await handler(payload, headers)
                channel.ack(msg)
            } catch (error) {
                const attempts = (headers['x-attempts'] || 0) + 1
                if (attempts < maxAttempts) {
                    const delay = delays[attempts] || 1000
                    console.warn(`[Queue] Message ${msg.fields.routingKey} failed, retrying attempt ${attempts}/${maxAttempts} in ${delay}ms: ${error.message}`)
                    setTimeout(async () => {
                        try {
                            await publish(msg.fields.routingKey, payload, { ...headers, 'x-attempts': attempts })
                            channel.ack(msg)
                        } catch (pubError) {
                            console.error('[Queue] Failed to republish for retry', pubError)
                            channel.nack(msg, false, true)
                        }
                    }, delay)
                } else {
                    console.error(`[Queue] Message ${msg.fields.routingKey} failed after ${maxAttempts} attempts. Routing to DLQ: ${queueName}.dlq`)
                    try {
                        const dlqName = `${queueName}.dlq`
                        await channel.assertQueue(dlqName, { durable: true })
                        channel.sendToQueue(dlqName, msg.content, {
                            persistent: true,
                            headers: { ...headers, error: error.message, failedAt: new Date().toISOString() }
                        })
                        channel.ack(msg)
                    } catch (dlqError) {
                        console.error('[Queue] Failed to send to DLQ', dlqError)
                        channel.nack(msg, false, true)
                    }
                }
            }
        })
        console.log(`[${process.env.SERVICE_NAME || "service"}] Subscribed to queue ${queueName} on keys: ${routingKeys.join(", ")}`)
    }
}

export const getDirectEventRouter = () => {
    const router = Router()
    router.post("/internal/v1/events/:routingKey", async (req, res) => {
        const { routingKey } = req.params
        const { payload, headers } = req.body
        const sub = subscribers.find(s => s.routingKeys.includes(routingKey))
        if (!sub) {
            return res.status(404).json({ success: false, error: "No subscriber for event " + routingKey })
        }
        try {
            await sub.handler(payload, headers)
            res.json({ success: true })
        } catch (err) {
            console.error(`[Queue] Direct handler error for ${routingKey}:`, err.message)
            res.status(500).json({ success: false, error: err.message })
        }
    })
    return router
}

export const closeQueue = async () => {
    if (channel) {
        try { await channel.close() } catch {}
    }
    if (connection) {
        try {
            await connection.close()
            console.log(`[${process.env.SERVICE_NAME || "service"}] RabbitMQ connection closed`)
        } catch {}
    }
}
