import OnboardingSession from "../models/session.model.js"

export const create = (data) => OnboardingSession.create(data)
export const findById = (id) => OnboardingSession.findById(id)
export const update = (id, patch) => OnboardingSession.findByIdAndUpdate(id, patch, { new: true })
export const list = async ({ type, status, search, cursor, limit = 25 }) => {
    const query = {}
    if (type) query.type = type
    if (status) query.status = status
    // Search must match what the reviewer actually sees in the Name column
    // (listView's company_name/college_name/full_name fallback chain), not
    // just the submitting contact's own name - those can be completely
    // different people (e.g. an HR contact submitting on behalf of "IBM
    // India"), so matching only contact.name/email silently misses the
    // exact searches a reviewer would actually try.
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

// `type`/`from`/`to` narrow the same registration-type + date-range window
// the dashboard's KPI cards and onboarding funnel are computed from - both
// must query through this one function so they can never disagree.
const buildTypeDateMatch = ({ type, from, to } = {}) => {
    const match = {}
    if (type) match.type = type
    if (from || to) {
        match.createdAt = {}
        if (from) match.createdAt.$gte = from
        if (to) match.createdAt.$lte = to
    }
    return match
}

export const countByStatus = async (filters = {}) => {
    const match = buildTypeDateMatch(filters)
    const pipeline = [...(Object.keys(match).length ? [{ $match: match }] : []), { $group: { _id: "$status", count: { $sum: 1 } } }]
    const rows = await OnboardingSession.aggregate(pipeline)
    return Object.fromEntries(rows.map((r) => [r._id, r.count]))
}

export const recentlyUpdated = (limit = 10) => OnboardingSession.find().sort({ updatedAt: -1 }).limit(limit)

// Cursor-based pagination for the dashboard's "Recent Activity" feed.
// Sorted by updatedAt (not _id), so the cursor has to encode both
// updatedAt and _id - updatedAt alone isn't unique enough to page past
// a tie, and a plain skip/offset would re-scan and drift as sessions
// keep updating underneath the paginated request.
export const recentActivityPage = async ({ cursor, limit = 10 } = {}) => {
    const query = {}
    if (cursor) {
        const [ts, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|")
        const cursorDate = new Date(ts)
        query.$or = [
            { updatedAt: { $lt: cursorDate } },
            { updatedAt: cursorDate, _id: { $lt: id } },
        ]
    }
    const docs = await OnboardingSession.find(query).sort({ updatedAt: -1, _id: -1 }).limit(limit + 1)
    const hasNext = docs.length > limit
    const items = hasNext ? docs.slice(0, limit) : docs
    const last = items[items.length - 1]
    const nextCursor = hasNext ? Buffer.from(`${last.updatedAt.toISOString()}|${last._id}`).toString("base64url") : null
    return { items, hasNext, nextCursor }
}

// Daily registration counts (a session is created 1:1 with a registration,
// see createInvitationForRegistration) since `since`, plus a total-by-type
// breakdown over the same window - backs the dashboard trend chart and the
// registrations-by-type donut.
export const dailyCountsSince = async (since, { type, until } = {}) => {
    const match = { createdAt: { $gte: since, ...(until ? { $lte: until } : {}) } }
    if (type) match.type = type

    const [byDay, byType] = await Promise.all([
        OnboardingSession.aggregate([
            { $match: match },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
        OnboardingSession.aggregate([
            { $match: match },
            { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),
    ])
    return {
        byDay: byDay.map((r) => ({ date: r._id, count: r.count })),
        byType: Object.fromEntries(byType.map((r) => [r._id, r.count])),
    }
}

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
