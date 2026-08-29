import mongoose from "mongoose"
import { closeRedis } from "./redis.js"
import { closeQueue } from "./queue.js"

let isShuttingDown = false
const cleanupCallbacks = []

export const registerCleanupTask = (callback) => {
    cleanupCallbacks.push(callback)
}

export const setupGracefulShutdown = (server) => {
    const shutdown = async (signal) => {
        if (isShuttingDown) return
        isShuttingDown = true
        console.log(`[${process.env.SERVICE_NAME || "service"}] Received ${signal}. Starting graceful shutdown...`)

        for (const cb of cleanupCallbacks) {
            try {
                await cb()
            } catch (err) {
                console.error(`[${process.env.SERVICE_NAME || "service"}] Cleanup task failed:`, err.message)
            }
        }

        if (server) {
            server.close(() => {
                console.log(`[${process.env.SERVICE_NAME || "service"}] HTTP server closed`)
            })
        }

        try {
            await closeQueue()
        } catch (err) {
            console.error(`[${process.env.SERVICE_NAME || "service"}] Error closing Queue:`, err.message)
        }

        try {
            await closeRedis()
        } catch (err) {
            console.error(`[${process.env.SERVICE_NAME || "service"}] Error closing Redis:`, err.message)
        }

        try {
            if (mongoose.connection && mongoose.connection.readyState !== 0) {
                await mongoose.connection.close()
                console.log(`[${process.env.SERVICE_NAME || "service"}] MongoDB connection closed`)
            }
        } catch (err) {
            console.error(`[${process.env.SERVICE_NAME || "service"}] Error closing MongoDB:`, err.message)
        }

        console.log(`[${process.env.SERVICE_NAME || "service"}] Graceful shutdown completed. Exiting.`)
        process.exit(0)
    }

    process.on("SIGINT", () => shutdown("SIGINT"))
    process.on("SIGTERM", () => shutdown("SIGTERM"))
}

export const checkIsShuttingDown = (req, res, next) => {
    if (isShuttingDown) {
        res.setHeader("Connection", "close")
        return res.status(503).json({ success: false, error: "Service is shutting down" })
    }
    next()
}
