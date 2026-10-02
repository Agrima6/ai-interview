import Enquiry from "../models/enquiry.model.js"

export const create = (data) => Enquiry.create(data)
export const findById = (id) => Enquiry.findById(id)

export const list = async ({ status, search, cursor, limit = 25 }) => {
    const query = {}
    if (status) query.status = status
    if (search) query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    if (cursor) query._id = { $lt: cursor }

    const docs = await Enquiry.find(query).sort({ _id: -1 }).limit(limit + 1)
    const hasNext = docs.length > limit
    const items = hasNext ? docs.slice(0, limit) : docs
    return { items, hasNext, nextCursor: hasNext ? String(items[items.length - 1]._id) : null }
}

// runValidators is required here - Mongoose skips schema validators
// (including the `enum` on status) on findByIdAndUpdate by default, so
// without it a caller could persist a status value outside the enum.
export const update = (id, patch) => Enquiry.findByIdAndUpdate(id, patch, { new: true, runValidators: true })

export const countByStatus = async ({ type, from, to } = {}) => {
    const match = {}
    if (type) match.type = type
    if (from || to) {
        match.createdAt = {}
        if (from) match.createdAt.$gte = from
        if (to) match.createdAt.$lte = to
    }
    const pipeline = [...(Object.keys(match).length ? [{ $match: match }] : []), { $group: { _id: "$status", count: { $sum: 1 } } }]
    const rows = await Enquiry.aggregate(pipeline)
    return Object.fromEntries(rows.map((r) => [r._id, r.count]))
}

// Daily enquiry counts since `since` (optionally bounded by `until` and/or
// narrowed to one registration type) - backs the dashboard trend chart.
export const dailyCountsSince = async (since, { type, until } = {}) => {
    const match = { createdAt: { $gte: since, ...(until ? { $lte: until } : {}) } }
    if (type) match.type = type
    const rows = await Enquiry.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ])
    return rows.map((r) => ({ date: r._id, count: r.count }))
}
