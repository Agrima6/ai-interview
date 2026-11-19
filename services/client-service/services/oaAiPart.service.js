import { ApiError } from "../utils/response.js"
import { OaAccount, OaAssessment, OaAttempt, OaStudent } from "../models/oa.model.js"
import { addCandidatesToDrive } from "./interviewDrive.service.js"

/**
 * The AI interview part of a test round: once a candidate has submitted the test they are added to the chosen AI
 * interview, which emails their invitation. Runs once per attempt (claimed atomically) and never throws, so a
 * problem on the AI side can never affect the test result. The outcome is kept on the attempt for the organizer.
 */
export const handOffToAiInterview = async (attemptId) => {
    try {
        const claimed = await OaAttempt.findOneAndUpdate({ _id: attemptId, $or: [{ "aiHandoff.at": null }, { "aiHandoff.status": "FAILED" }] }, { $set: { "aiHandoff.at": new Date(), "aiHandoff.status": "SENDING" } }, { new: true })
        if (!claimed) return
        const [assessment, student, account] = await Promise.all([OaAssessment.findById(claimed.assessmentId), OaStudent.findById(claimed.studentId), OaAccount.findById(claimed.accountId)])
        const part = assessment?.aiPart
        const done = (status, error = null) => OaAttempt.updateOne({ _id: attemptId }, { $set: { "aiHandoff.status": status, "aiHandoff.error": error } })
        if (!part?.enabled || !part.aiInterviewDriveId || !student || !account?.tenantId) return done("FAILED", "This round has no AI interview chosen.")
        try {
            await addCandidatesToDrive(account.tenantId, part.aiInterviewDriveId, [{ name: student.name, email: student.email, phone: student.phone || undefined, rollNumber: student.rollNumber || undefined }], { requestId: `oa-${attemptId}` }, part.roundNumber || 1)
            await done("SENT")
        } catch (error) {
            if (error.code === "NO_NEW_CANDIDATES") await done("ALREADY")
            else { console.error("[client-service] OA AI interview hand-off failed:", error.message); await done("FAILED", String(error.message || "Could not invite").slice(0, 200)) }
        }
    } catch (error) {
        console.error("[client-service] OA AI interview hand-off crashed:", error.message)
    }
}

/**
 * The organizer invites finished candidates to the AI interview after looking at the scores. `minPercent` limits it to
 * those who scored at least that; anyone removed for cheating or disqualified is never invited. Safe to repeat: someone
 * already invited is skipped, and an earlier failed invite is tried again.
 */
export const inviteToAiInterview = async (accountId, assessmentId, { minPercent = 0 } = {}) => {
    const assessment = await OaAssessment.findOne({ _id: assessmentId, accountId })
    if (!assessment) throw new ApiError(404, "NOT_FOUND", "Round not found.")
    if (!assessment.aiPart?.enabled || !assessment.aiPart.aiInterviewDriveId) throw new ApiError(409, "NO_AI_PART", "Add an AI interview to this round first.")
    const min = Math.max(0, Math.min(100, Number(minPercent) || 0))
    const attempts = await OaAttempt.find({ assessmentId, status: { $in: ["SUBMITTED", "AUTO_SUBMITTED"] }, adminDecision: { $ne: "DISQUALIFIED" }, percent: { $gte: min }, $or: [{ "aiHandoff.at": null }, { "aiHandoff.status": "FAILED" }] }).select("_id").lean()
    let invited = 0, failed = 0
    for (const a of attempts) {
        await handOffToAiInterview(a._id)
        const after = await OaAttempt.findById(a._id).select("aiHandoff").lean()
        if (["SENT", "ALREADY"].includes(after?.aiHandoff?.status)) invited += 1; else failed += 1
    }
    return { invited, failed, considered: attempts.length }
}
