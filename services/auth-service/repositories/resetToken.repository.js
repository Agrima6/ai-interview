import PasswordResetToken from "../models/resetToken.model.js"

export const create = (data) => PasswordResetToken.create(data)
export const findByHash = (tokenHash) => PasswordResetToken.findOne({ tokenHash })
export const markUsed = (id) => PasswordResetToken.findByIdAndUpdate(id, { usedAt: new Date() })
// Invalidate any earlier still-live reset link for this user once a new one
// is requested, so only the most recently emailed link ever works.
export const invalidateActiveForUser = (userId) =>
    PasswordResetToken.updateMany({ userId, usedAt: null, expiresAt: { $gt: new Date() } }, { usedAt: new Date() })
