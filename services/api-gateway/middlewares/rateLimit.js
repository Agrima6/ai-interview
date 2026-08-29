import { isRedisEnabled, getRedisClient } from "@workmateiq/common"

export const rateLimiter = () => {
    return async (req, res, next) => {
        if (process.env.RATE_LIMIT_ENABLED !== "true") {
            return next()
        }

        const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10)
        const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10)

        if (req.path === "/health" || req.path === "/ready" || req.path === "/healthz") {
            return next()
        }

        const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress
        const key = `rate-limit:${ip}`

        if (isRedisEnabled()) {
            const redis = getRedisClient()
            try {
                const current = await redis.incr(key)
                if (current === 1) {
                    await redis.expire(key, Math.ceil(windowMs / 1000))
                }
                if (current > max) {
                    return res.status(429).json({
                        success: false,
                        error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." }
                    })
                }
                return next()
            } catch (err) {
                console.error("Redis rate limiting error, falling back to memory:", err)
            }
        }

        if (!global.memoryRateLimiterStore) {
            global.memoryRateLimiterStore = new Map()
        }

        const store = global.memoryRateLimiterStore
        const now = Date.now()
        let record = store.get(ip)

        if (!record || (now - record.resetTime) > windowMs) {
            record = { count: 0, resetTime: now + windowMs }
        }

        record.count++
        store.set(ip, record)

        if (record.count > max) {
            return res.status(429).json({
                success: false,
                error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." }
            })
        }

        next()
    }
}
