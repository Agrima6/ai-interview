import Client from "../models/client.model.js"

export const upsertByOnboarding = (onboardingId, data) =>
    Client.findOneAndUpdate({ onboardingId }, { onboardingId, ...data }, { upsert: true, new: true, setDefaultsOnInsert: true })

export const findById = (id) => Client.findById(id)

export const list = async ({ search, type, status, cursor, limit = 25 }) => {
    const query = {}
    if (type) query.type = type
    if (status) query.status = status
    if (search) query.name = { $regex: search, $options: "i" }
    if (cursor) query._id = { $lt: cursor }

    const docs = await Client.find(query).sort({ _id: -1 }).limit(limit + 1)
    const hasNext = docs.length > limit
    const items = hasNext ? docs.slice(0, limit) : docs
    return { items, hasNext, nextCursor: hasNext ? String(items[items.length - 1]._id) : null }
}

export const updateStatus = (id, status) => Client.findByIdAndUpdate(id, { status }, { new: true })

export const countByStatus = async () => {
    const rows = await Client.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    return Object.fromEntries(rows.map((r) => [r._id, r.count]))
}
