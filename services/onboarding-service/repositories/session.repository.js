import OnboardingSession from "../models/session.model.js"

export const create = (data) => OnboardingSession.create(data)
export const findById = (id) => OnboardingSession.findById(id)
export const update = (id, patch) => OnboardingSession.findByIdAndUpdate(id, patch, { new: true })
export const list = async ({ type, status, search, cursor, limit = 25 }) => {
    const query = {}
    if (type) query.type = type
    if (status) query.status = status
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

export const mergeData = (id, dataPatch, currentStep) =>
    OnboardingSession.findByIdAndUpdate(
        id,
        {
            $set: {
                ...Object.fromEntries(Object.entries(dataPatch).map(([k, v]) => [`data.${k}`, v])),
                lastSavedAt: new Date(),
                ...(currentStep ? { currentStep } : {}),
                status: "IN_PROGRESS",
            },
        },
        { new: true }
    )
