import { ApiError } from "../utils/response.js"
import { OaAccount, OaAssessment, OaAttempt, OaStudent } from "../models/oa.model.js"
import { addCandidatesToDrive, findOwnRosterEntry, resendInvites } from "./interviewDrive.service.js"
import { authServiceClient } from "../config/internalClients.js"

/**
 * The AI interview part of a test round: once a candidate has submitted the test they are added to the chosen AI
 * interview, which emails their invitation. Runs once per attempt (claimed atomically) and never throws, so a
 * problem on the AI side can never affect the test result. The outcome is kept on the attempt for the organizer.
 */
export const handOffToAiInterview = async (attemptId, { invite = true } = {}) => {
    try {
        const claimed = await OaAttempt.findOneAndUpdate({ _id: attemptId, $or: [{ "aiHandoff.at": null }, { "aiHandoff.status": "FAILED" }] }, { $set: { "aiHandoff.at": new Date(), "aiHandoff.status": "SENDING" } }, { new: true })
        if (!claimed) return
        const [assessment, student, account] = await Promise.all([OaAssessment.findById(claimed.assessmentId), OaStudent.findById(claimed.studentId), OaAccount.findById(claimed.accountId)])
        const part = assessment?.aiPart
        const done = (status, error = null) => OaAttempt.updateOne({ _id: attemptId }, { $set: { "aiHandoff.status": status, "aiHandoff.error": error } })
        if (!part?.enabled || !part.aiInterviewDriveId || !student || !account?.tenantId) return done("FAILED", "This round has no AI interview chosen.")
        try {
            await addCandidatesToDrive(account.tenantId, part.aiInterviewDriveId, [{ name: student.name, email: student.email, phone: student.phone || undefined, rollNumber: student.rollNumber || undefined }], { requestId: `oa-${attemptId}` }, part.roundNumber || 1, { invite })
            await done(invite ? "SENT" : "ADDED")
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
        if (["SENT", "ALREADY", "ADDED"].includes(after?.aiHandoff?.status)) invited += 1; else failed += 1
    }
    return { invited, failed, considered: attempts.length }
}

/**
 * The candidate has just finished the test and asks to go on, in the same sitting, to the AI interview. They are put on
 * the interview's list (without an email), and get a one-time ticket that signs them in to the interview room. If the
 * automatic route is not possible (the account belongs to someone with other roles, the sign-in service is down...)
 * the normal invitation email is sent instead and `emailed: true` tells the page to say so.
 */
export const continueToAiInterview = async ({ assessmentId, studentId }, ctx = {}) => {
    const [assessment, student, attempt] = await Promise.all([OaAssessment.findById(assessmentId), OaStudent.findById(studentId), OaAttempt.findOne({ assessmentId, studentId })])
    if (!assessment?.aiPart?.enabled || !assessment.aiPart.aiInterviewDriveId) throw new ApiError(409, "NO_AI_PART", "This test has no AI interview.")
    if (!attempt || !["SUBMITTED", "AUTO_SUBMITTED"].includes(attempt.status) || attempt.adminDecision === "DISQUALIFIED") throw new ApiError(409, "NOT_ELIGIBLE", "The AI interview opens after you finish the test.")
    if (assessment.aiPart.when === "AFTER_REVIEW") throw new ApiError(409, "AFTER_REVIEW", "You will be invited by email if you qualify.")
    const account = await OaAccount.findById(assessment.accountId)
    if (!account?.tenantId) throw new ApiError(409, "NO_AI_PART", "This test has no AI interview.")
    const driveId = assessment.aiPart.aiInterviewDriveId
    const roundNumber = assessment.aiPart.roundNumber || 1
    await handOffToAiInterview(attempt._id, { invite: false })           // no-op if already on the list
    try {
        // The submit may be adding them in the background at this very moment: wait briefly for the list entry.
        for (let i = 0; ; i += 1) {
            try { await findOwnRosterEntry(account.tenantId, student.email, driveId, roundNumber); break } catch (error) { if (i >= 20 || error.code !== "NOT_APPLIED") throw error; await new Promise((r) => setTimeout(r, 250)) }
        }
        const { ticket } = await authServiceClient.createCandidateHandoff({ email: student.email, name: student.name, tenantId: String(account.tenantId) }, ctx)
        return { ticket, path: `/candidate/interview/${driveId}/${roundNumber}`, emailed: false }
    } catch (error) {
        console.error("[client-service] OA continue-to-AI failed, falling back to the invitation email:", error.message)
        try {
            const { candidate } = await findOwnRosterEntry(account.tenantId, student.email, driveId, roundNumber)
            await resendInvites(account.tenantId, driveId, roundNumber, [candidate.id], ctx)
        } catch (mailError) { console.error("[client-service] OA fallback invitation failed:", mailError.message) }
        return { ticket: null, path: null, emailed: true }
    }
}
