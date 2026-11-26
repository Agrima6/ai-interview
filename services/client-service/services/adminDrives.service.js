import { InterviewDrive } from "../models/interviewDrive.model.js"
import Client from "../models/client.model.js"
import { OaAccount, OaAssessment, OaDrive, OaStudent } from "../models/oa.model.js"

/**
 * For the platform owner: every drive an organization has deleted, so a deletion is never invisible. Deleted drives are hidden from the
 * organization's own lists (it can restore them from the Deleted filter), but the candidates and what was already billed remain.
 */

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const listDeletedDrives = async (query = {}) => {
    const [ai, oaDrives, clients, accounts] = await Promise.all([
        InterviewDrive.aggregate([
            { $match: { deletedAt: { $ne: null } } },
            { $project: {
                title: 1, tenantId: 1, createdAt: 1, deletedAt: 1, deletedBy: 1,
                candidates: { $sum: { $map: { input: { $ifNull: ["$rounds", []] }, as: "r", in: { $size: { $ifNull: ["$$r.candidates", []] } } } } },
                invited: { $sum: { $map: { input: { $ifNull: ["$rounds", []] }, as: "r", in: { $size: { $filter: { input: { $ifNull: ["$$r.candidates", []] }, as: "c", cond: { $or: [{ $ne: [{ $ifNull: ["$$c.invitedAt", null] }, null] }, { $ne: [{ $ifNull: ["$$c.lastInviteAt", null] }, null] }] } } } } } } },
            } },
        ]),
        OaDrive.find({ deletedAt: { $ne: null } }).select("title accountId createdAt deletedAt deletedBy").lean(),
        Client.find({}).select("name tenantId").lean(),
        OaAccount.find({}).select("orgName tenantId").lean(),
    ])
    const orgByTenant = new Map(clients.map((c) => [String(c.tenantId || c._id), c.name]))
    const accountById = new Map(accounts.map((a) => [String(a._id), a]))

    // An AI interview that belongs to a deleted round-wise drive is part of that row, not a drive of its own.
    const rounds = oaDrives.length ? await OaAssessment.find({ driveId: { $in: oaDrives.map((d) => d._id) } }).select("driveId aiInterviewDriveId aiPart.aiInterviewDriveId").lean() : []
    const inside = new Set(rounds.flatMap((r) => [r.aiInterviewDriveId, r.aiPart?.aiInterviewDriveId]).filter(Boolean).map(String))
    const roundIds = rounds.map((r) => r._id)
    const students = roundIds.length ? await OaStudent.aggregate([
        { $match: { assessmentId: { $in: roundIds }, "approval.status": { $nin: ["PENDING", "REJECTED"] } } },
        { $group: { _id: "$assessmentId", candidates: { $sum: 1 }, invited: { $sum: { $cond: [{ $or: [{ $ne: [{ $ifNull: ["$invite.firstSentAt", null] }, null] }, { $eq: ["$invite.status", "SENT"] }] }, 1, 0] } } } },
    ]) : []
    const byRound = new Map(students.map((s) => [String(s._id), s]))

    const items = [
        ...ai.filter((d) => !inside.has(String(d._id))).map((d) => ({ kind: "AI", id: String(d._id), title: d.title, organization: orgByTenant.get(String(d.tenantId)) || "Unknown organization", deletedAt: d.deletedAt, deletedBy: d.deletedBy || "", createdAt: d.createdAt, candidates: d.candidates, invitationsSent: d.invited })),
        ...oaDrives.map((d) => {
            const mine = rounds.filter((r) => String(r.driveId) === String(d._id)).map((r) => byRound.get(String(r._id))).filter(Boolean)
            const account = accountById.get(String(d.accountId))
            return { kind: "MULTI", id: String(d._id), title: d.title, organization: (account?.tenantId && orgByTenant.get(String(account.tenantId))) || account?.orgName || "Unknown organization", deletedAt: d.deletedAt, deletedBy: d.deletedBy || "", createdAt: d.createdAt, candidates: mine.reduce((n, s) => Math.max(n, s.candidates), 0), invitationsSent: mine.reduce((n, s) => n + s.invited, 0) }
        }),
    ]
    const term = String(query.search || "").trim().slice(0, 80)
    const rx = term ? new RegExp(escapeRegex(term), "i") : null
    const rows = items.filter((d) => !rx || rx.test(d.title) || rx.test(d.organization) || rx.test(d.deletedBy)).sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
    const pageSize = [10, 25, 50, 100].includes(Number(query.pageSize)) ? Number(query.pageSize) : 25
    const page = Math.max(1, Number(query.page) || 1)
    return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize }
}
