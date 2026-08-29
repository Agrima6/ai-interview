import OnboardingSession from "../models/session.model.js"
import { isRedisEnabled, getRedisClient } from "@workmateiq/common"

export const create = (data) => OnboardingSession.create(data)

export const findById = async (id) => {
    const doc = await OnboardingSession.findById(id)
    if (!doc) return null

    if (isRedisEnabled()) {
        const redis = getRedisClient()
        try {
            const cachedStr = await redis.get(`workmateiq:onboarding:draft:${id}`)
            if (cachedStr) {
                const draft = JSON.parse(cachedStr)
                doc.data = { ...doc.data, ...draft.data }
                if (draft.currentStep) doc.currentStep = draft.currentStep
                if (draft.lastSavedAt) doc.lastSavedAt = new Date(draft.lastSavedAt)
            } else {
                const draftData = {
                    data: doc.data || {},
                    currentStep: doc.currentStep,
                    lastSavedAt: doc.lastSavedAt || new Date(),
                }
                await redis.set(`workmateiq:onboarding:draft:${id}`, JSON.stringify(draftData), {
                    EX: 7 * 24 * 3600
                })
            }
        } catch (err) {
            console.error("[SessionRepo] Redis draft read error:", err.message)
        }
    }
    return doc
}

export const update = async (id, patch) => {
    const doc = await OnboardingSession.findByIdAndUpdate(id, patch, { new: true })
    if (isRedisEnabled()) {
        const redis = getRedisClient()
        try {
            await redis.del(`workmateiq:onboarding:draft:${id}`)
            await redis.del(`workmateiq:onboarding:mongo-write-pending:${id}`)
        } catch (err) {
            console.error("[SessionRepo] Redis delete error on update:", err.message)
        }
    }
    return doc
}

export const list = async ({ type, status, search, cursor, limit = 25 }) => {
    const query = {}
    if (type) query.type = type
    if (status) query.status = status
    if (search) {
        const rx = { $regex: search, $options: "i" }
        query.$or = [
            { "contact.name": rx },
            { "contact.email": rx },
            { "data.company_name": rx },
            { "data.college_name": rx },
            { "data.full_name": rx },
        ]
    }
    if (cursor) query._id = { $lt: cursor }

    const docs = await OnboardingSession.find(query).sort({ _id: -1 }).limit(limit + 1)
    const hasNext = docs.length > limit
    const items = hasNext ? docs.slice(0, limit) : docs
    return { items, hasNext, nextCursor: hasNext ? String(items[items.length - 1]._id) : null }
}

export const countByStatus = async () => {
    const rows = await OnboardingSession.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    return Object.fromEntries(rows.map((r) => [r._id, r.count]))
}

export const recentlyUpdated = (limit = 10) => OnboardingSession.find().sort({ updatedAt: -1 }).limit(limit)

export const dailyCountsSince = async (since) => {
    const [byDay, byType] = await Promise.all([
        OnboardingSession.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
        OnboardingSession.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),
    ])
    return {
        byDay: byDay.map((r) => ({ date: r._id, count: r.count })),
        byType: Object.fromEntries(byType.map((r) => [r._id, r.count])),
    }
}

export const mergeData = async (id, dataPatch, currentStep) => {
    const now = new Date()
    if (isRedisEnabled()) {
        const redis = getRedisClient()
        try {
            let draft = { data: {}, currentStep, lastSavedAt: now }
            const cachedStr = await redis.get(`workmateiq:onboarding:draft:${id}`)
            if (cachedStr) {
                draft = JSON.parse(cachedStr)
            } else {
                const doc = await OnboardingSession.findById(id)
                if (doc) {
                    draft.data = doc.data || {}
                    draft.currentStep = doc.currentStep || currentStep
                }
            }

            draft.data = { ...draft.data, ...dataPatch }
            if (currentStep) draft.currentStep = currentStep
            draft.lastSavedAt = now

            await redis.set(`workmateiq:onboarding:draft:${id}`, JSON.stringify(draft), {
                EX: 7 * 24 * 3600
            })

            const pendingKey = `workmateiq:onboarding:mongo-write-pending:${id}`
            const isPending = await redis.get(pendingKey)
            if (!isPending) {
                await redis.set(pendingKey, "true", { EX: 60 })
                setTimeout(async () => {
                    try {
                        const latestCachedStr = await redis.get(`workmateiq:onboarding:draft:${id}`)
                        if (latestCachedStr) {
                            const latestDraft = JSON.parse(latestCachedStr)
                            await OnboardingSession.findByIdAndUpdate(
                                id,
                                {
                                    $set: {
                                        data: latestDraft.data,
                                        currentStep: latestDraft.currentStep,
                                        lastSavedAt: new Date(latestDraft.lastSavedAt),
                                        status: "IN_PROGRESS"
                                    }
                                }
                            )
                        }
                        await redis.del(pendingKey)
                    } catch (err) {
                        console.error("[SessionRepo] Write-behind to MongoDB failed:", err.message)
                        await redis.del(pendingKey)
                    }
                }, 5000)
            }

            return { lastSavedAt: now, currentStep: draft.currentStep }
        } catch (err) {
            console.error("[SessionRepo] Redis draft write error, falling back to DB:", err.message)
        }
    }

    return OnboardingSession.findByIdAndUpdate(
        id,
        {
            $set: {
                ...Object.fromEntries(Object.entries(dataPatch).map(([k, v]) => [`data.${k}`, v])),
                lastSavedAt: now,
                ...(currentStep ? { currentStep } : {}),
                status: "IN_PROGRESS",
            },
        },
        { new: true }
    )
}
