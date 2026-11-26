import { InterviewDrive } from "../models/interviewDrive.model.js"
import { OaAccount, OaAssessment, OaAttempt, OaStudent } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"

const LIMIT = 20
const ENDED = ["SUBMITTED", "AUTO_SUBMITTED", "TERMINATED"]

/**
 * What happened recently in the organization's hiring, newest first: candidates who finished an online test and
 * candidates who completed an AI interview. Read-only and scoped to the signed-in organization.
 */
export const listNotifications = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    const items = []

    const account = await OaAccount.findOne({ tenantId: String(tenantId) }).sort({ createdAt: 1, _id: 1 }).select("_id").lean()
    if (account) {
        const attempts = await OaAttempt.find({ accountId: account._id, status: { $in: ENDED } }).sort({ submittedAt: -1, updatedAt: -1 }).limit(LIMIT)
            .select("studentId assessmentId status submittedAt updatedAt percent gradingStatus").lean()
        const [students, assessments] = await Promise.all([
            OaStudent.find({ _id: { $in: attempts.map((a) => a.studentId) } }).select("name").lean(),
            OaAssessment.find({ _id: { $in: attempts.map((a) => a.assessmentId) } }).select("title").lean(),
        ])
        const name = new Map(students.map((s) => [String(s._id), s.name]))
        const title = new Map(assessments.map((a) => [String(a._id), a.title]))
        for (const a of attempts) {
            const who = name.get(String(a.studentId)) || "A candidate"
            const what = title.get(String(a.assessmentId)) || "the assessment"
            const at = a.submittedAt || a.updatedAt
            const message = a.status === "TERMINATED" ? `${who}'s test "${what}" was ended` : `${who} finished "${what}"`
            const detail = a.status === "TERMINATED" ? "Ended after too many proctoring warnings" : a.gradingStatus === "PENDING_REVIEW" ? "Written answers are being marked" : `Scored ${Math.round(a.percent || 0)}%`
            items.push({ id: `oa-${a._id}`, type: a.status === "TERMINATED" ? "TEST_ENDED" : "TEST_FINISHED", message, detail, at })
        }
    }

    const drives = await InterviewDrive.aggregate([
        { $match: { tenantId: String(tenantId), deletedAt: null } },
        { $unwind: "$rounds" }, { $unwind: "$rounds.candidates" },
        { $match: { "rounds.candidates.attemptedDate": { $ne: null }, "rounds.candidates.status": { $in: ["COMPLETED", "SHORTLISTED", "REJECTED"] } } },
        { $sort: { "rounds.candidates.attemptedDate": -1 } }, { $limit: LIMIT },
        { $project: { title: 1, round: "$rounds.roundNumber", name: "$rounds.candidates.name", at: "$rounds.candidates.attemptedDate", cid: "$rounds.candidates._id" } },
    ])
    for (const d of drives) items.push({ id: `ai-${d._id}-${d.cid}`, type: "INTERVIEW_COMPLETED", message: `${d.name} completed the AI interview for "${d.title}"`, detail: `Round ${d.round}`, at: d.at })

    items.sort((x, y) => new Date(y.at) - new Date(x.at))
    return items.slice(0, LIMIT)
}
