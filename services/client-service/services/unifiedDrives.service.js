import { InterviewDrive } from "../models/interviewDrive.model.js"
import { OaAccount, OaAssessment } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"
import { listEveryDrive } from "./oaDrive.service.js"

/**
 * One list of everything an organization hires with. A "multi-round drive" holds rounds that are online tests or AI
 * interviews in any order; an "AI drive" is a classic AI Interview drive on its own. An AI interview that a multi-round
 * drive uses as one of its rounds is shown inside that drive (as a round) and not again as a separate row.
 */

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const aiDrives = async (tenantId) => InterviewDrive.aggregate([
    { $match: { tenantId: String(tenantId) } },
    { $project: {
        title: 1, status: 1, createdAt: 1, updatedAt: 1, department: 1, roleCategory: 1, experienceLevel: 1, driveKind: 1,
        rounds: { $map: { input: { $ifNull: ["$rounds", []] }, as: "r", in: { roundNumber: "$$r.roundNumber", title: "$$r.title", status: "$$r.status", candidates: { $size: { $ifNull: ["$$r.candidates", []] } } } } },
    } },
])

/**
 * @param tenantId the organization (from the signed-in user)
 * @param query { search, kind: "AI" | "MULTI", archived: "1", page, pageSize }
 */
export const listAllDrives = async (tenantId, query = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    const account = await OaAccount.findOne({ tenantId: String(tenantId) }).select("_id").lean()
    const [ai, multi, linked] = await Promise.all([
        aiDrives(tenantId),
        account ? listEveryDrive(account._id) : [],
        account ? OaAssessment.find({ accountId: account._id, kind: "AI_INTERVIEW", aiInterviewDriveId: { $ne: null } }).select("aiInterviewDriveId").lean() : [],
    ])
    const used = new Set(linked.map((a) => String(a.aiInterviewDriveId)))

    const items = [
        ...ai.filter((d) => !used.has(String(d._id))).map((d) => ({
            kind: "AI", id: String(d._id), title: d.title, status: d.status, createdAt: d.createdAt, updatedAt: d.updatedAt,
            department: d.department || "", role: d.roleCategory || "", examKind: d.driveKind || "HIRING",
            candidates: d.rounds.reduce((n, r) => n + r.candidates, 0),
            rounds: d.rounds.map((r) => ({ number: r.roundNumber, kind: "AI_INTERVIEW", name: r.title || "AI interview", status: r.status, candidates: r.candidates })),
        })),
        ...multi.map((m) => ({
            kind: "MULTI", id: m.id, title: m.title, status: m.status, createdAt: m.createdAt, updatedAt: m.updatedAt, department: "", role: "", examKind: "HIRING",
            candidates: m.rounds.reduce((n, r) => Math.max(n, r.stats?.candidates || 0), 0),
            rounds: m.rounds.map((r) => ({ number: r.roundNumber, kind: r.kind, name: r.name || (r.kind === "AI_INTERVIEW" ? "AI interview" : "Online test"), status: r.status, phase: r.phase, candidates: r.stats?.candidates || 0, id: r.id })),
        })),
    ]

    const archived = query.archived === "1" || query.archived === true
    const term = String(query.search || "").trim().slice(0, 80)
    const rx = term ? new RegExp(escapeRegex(term), "i") : null
    const kind = ["AI", "MULTI"].includes(query.kind) ? query.kind : null
    const rows = items
        .filter((d) => (d.status === "ARCHIVED") === archived)
        .filter((d) => !kind || d.kind === kind)
        .filter((d) => !rx || rx.test(d.title) || rx.test(d.department) || rx.test(d.role))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))

    const pageSize = [10, 25, 50, 100].includes(Number(query.pageSize)) ? Number(query.pageSize) : 25
    const page = Math.max(1, Number(query.page) || 1)
    const counts = { all: items.filter((d) => (d.status === "ARCHIVED") === archived).length }
    return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, counts }
}
