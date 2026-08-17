import OnboardingInvitation from "../models/invitation.model.js"

export const create = (data) => OnboardingInvitation.create(data)
export const findByTokenHash = (tokenHash) => OnboardingInvitation.findOne({ tokenHash })
export const markAccessed = async (id) => {
    const now = new Date()
    const doc = await OnboardingInvitation.findById(id)
    doc.lastAccessedAt = now
    if (!doc.firstAccessedAt) doc.firstAccessedAt = now
    await doc.save()
    return doc
}
export const incrementUse = (id) => OnboardingInvitation.findByIdAndUpdate(id, { $inc: { useCount: 1 }, consumedAt: new Date() }, { new: true })
export const revokeActiveForRegistration = (registrationId) =>
    OnboardingInvitation.updateMany({ registrationId, status: "ACTIVE" }, { status: "REVOKED" })
