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

export const update = (id, patch) => Enquiry.findByIdAndUpdate(id, patch, { new: true })

export const countByStatus = async () => {
    const rows = await Enquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    return Object.fromEntries(rows.map((r) => [r._id, r.count]))
}
