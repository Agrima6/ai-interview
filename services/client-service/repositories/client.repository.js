import Client from "../models/client.model.js"
import ClientAuditLog from "../models/clientAuditLog.model.js"

export const upsertByOnboarding = (onboardingId, data) =>
    Client.findOneAndUpdate({ onboardingId }, { onboardingId, ...data }, { upsert: true, new: true, setDefaultsOnInsert: true })

export const findById = (id) => Client.findById(id)

const SORT_FIELDS = { createdAt: "createdAt", updatedAt: "updatedAt", name: "name", status: "status" }

export const list = async ({ search, type, status, dateFrom, dateTo, cursor, limit = 25, page, sortBy, sortOrder }) => {
    const query = {}
    if (type) query.type = type
    if (status) query.status = status
    if (dateFrom || dateTo) {
        query.createdAt = {}
        if (dateFrom) query.createdAt.$gte = dateFrom
        if (dateTo) query.createdAt.$lte = dateTo
    }
    // Matches the identifiers an admin actually searches by - name, the
    // primary contact's email/phone, or the assigned subdomain.
    if (search) {
        const rx = { $regex: search, $options: "i" }
        query.$or = [{ name: rx }, { "primaryContact.email": rx }, { "primaryContact.phone": rx }, { subdomain: rx }]
    }

    // Page-oriented mode (used by the improved Clients table): returns a
    // total count alongside the page so the UI can render "Showing 1-25 of
    // 428" and real page numbers.
    if (page) {
        const sortField = SORT_FIELDS[sortBy] || "createdAt"
        const direction = sortOrder === "asc" ? 1 : -1
        const pageNum = Math.max(Number(page) || 1, 1)
        const [items, total] = await Promise.all([
            Client.find(query).sort({ [sortField]: direction, _id: direction }).skip((pageNum - 1) * limit).limit(limit),
            Client.countDocuments(query),
        ])
        return { items, total, page: pageNum, pageSize: limit }
    }

    // Legacy cursor mode - unchanged behavior/shape for any existing caller
    // that doesn't pass `page`.
    if (cursor) query._id = { $lt: cursor }
    const docs = await Client.find(query).sort({ _id: -1 }).limit(limit + 1)
    const hasNext = docs.length > limit
    const items = hasNext ? docs.slice(0, limit) : docs
    return { items, hasNext, nextCursor: hasNext ? String(items[items.length - 1]._id) : null }
}

export const updateStatus = (id, status) => Client.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })

// Partial update of the whitelisted editable fields. When `expectedUpdatedAt`
// is given, the write only applies if the document hasn't changed since the
// caller last read it (optimistic concurrency) - returns "CONFLICT" if
// someone else updated it in between, or "NOT_FOUND" if the id doesn't
// exist at all, so the service layer can tell the two apart.
export const updateFields = async (id, patch, expectedUpdatedAt) => {
    if (expectedUpdatedAt) {
        const query = { _id: id, updatedAt: expectedUpdatedAt }
        const updated = await Client.findOneAndUpdate(query, { $set: patch }, { new: true, runValidators: true })
        if (updated) return updated
        const exists = await Client.exists({ _id: id })
        return exists ? "CONFLICT" : null
    }
    return Client.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true })
}

export const addAuditEntry = ({ clientId, changedBy, changedByEmail, changedFields }) =>
    ClientAuditLog.create({ clientId, changedBy, changedByEmail, changedFields })

export const listAuditEntries = (clientId, limit = 50) =>
    ClientAuditLog.find({ clientId }).sort({ createdAt: -1 }).limit(limit)

export const countByStatus = async ({ type, from, to } = {}) => {
    const match = {}
    if (type) match.type = type
    if (from || to) {
        match.createdAt = {}
        if (from) match.createdAt.$gte = from
        if (to) match.createdAt.$lte = to
    }
    const pipeline = [...(Object.keys(match).length ? [{ $match: match }] : []), { $group: { _id: "$status", count: { $sum: 1 } } }]
    const rows = await Client.aggregate(pipeline)
    return Object.fromEntries(rows.map((r) => [r._id, r.count]))
}
