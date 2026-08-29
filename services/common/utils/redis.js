import { createClient } from "redis"

let client = null

export const initRedis = async () => {
    if (process.env.REDIS_ENABLED !== "true") {
        console.log(`[${process.env.SERVICE_NAME || "service"}] Redis is disabled`)
        return null
    }
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
        if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
            console.error(`[${process.env.SERVICE_NAME || "service"}] REDIS_ENABLED=true but REDIS_URL is not set in production!`)
            process.exit(1)
        }
        throw new Error("REDIS_URL is required when REDIS_ENABLED is true")
    }

    client = createClient({
        url: redisUrl,
        socket: {
            connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || "5000", 10),
        }
    })

    client.on("error", (err) => {
        console.error(`[${process.env.SERVICE_NAME || "service"}] Redis error:`, err)
        if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
            console.error(`[${process.env.SERVICE_NAME || "service"}] Redis connection error in production. Exiting...`)
            process.exit(1)
        }
    })

    try {
        await client.connect()
        console.log(`[${process.env.SERVICE_NAME || "service"}] Redis connected successfully`)
    } catch (err) {
        console.error(`[${process.env.SERVICE_NAME || "service"}] Redis failed to connect during init:`, err.message)
        if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
            process.exit(1)
        }
        client = null
    }
    return client
}

export const getRedisClient = () => {
    if (process.env.REDIS_ENABLED !== "true") {
        return null
    }
    return client
}

export const isRedisEnabled = () => {
    return process.env.REDIS_ENABLED === "true" && client !== null
}

export const closeRedis = async () => {
    if (client) {
        try {
            await client.quit()
        } catch (err) {
            console.error(`[${process.env.SERVICE_NAME || "service"}] Error closing Redis:`, err.message)
        }
        client = null
    }
}
