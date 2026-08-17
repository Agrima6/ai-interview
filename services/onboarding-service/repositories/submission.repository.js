import OnboardingSubmission from "../models/submission.model.js"

export const latestVersionNumber = async (onboardingId) => {
    const latest = await OnboardingSubmission.findOne({ onboardingId }).sort({ submissionVersion: -1 })
    return latest ? latest.submissionVersion : 0
}
export const create = (data) => OnboardingSubmission.create(data)
