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
// Marks the invitation as consumed (status USED) - this is a tracking/audit
// signal only, not an access gate. maxUses defaults to 1, but a real,
// working flow (request-changes -> candidate reopens the same link ->
// resubmits) legitimately calls submit() more than once against the same
// invitation, so useCount reaching maxUses must not block further access -
// the session's own status (SUBMITTED/APPROVED) already gates that
// correctly in onboarding.service.js.
export const incrementUse = (id) => OnboardingInvitation.findByIdAndUpdate(id, { $inc: { useCount: 1 }, consumedAt: new Date(), status: "USED" }, { new: true })
export const revokeActiveForRegistration = (registrationId) =>
    OnboardingInvitation.updateMany({ registrationId, status: "ACTIVE" }, { status: "REVOKED" })
