import { OaAccount, OaAssessment, OaAttempt, OaStudent } from "../models/oa.model.js"
import { addCandidatesToDrive } from "./interviewDrive.service.js"

/**
 * The AI interview part of a test round: once a candidate has submitted the test they are added to the chosen AI
 * interview, which emails their invitation. Runs once per attempt (claimed atomically) and never throws, so a
 * problem on the AI side can never affect the test result. The outcome is kept on the attempt for the organizer.
 */
export const handOffToAiInterview = async (attemptId) => {
    try {
        const claimed = await OaAttempt.findOneAndUpdate({ _id: attemptId, "aiHandoff.at": null }, { $set: { "aiHandoff.at": new Date(), "aiHandoff.status": "SENDING" } }, { new: true })
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
