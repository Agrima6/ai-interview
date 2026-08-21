import RefreshToken from "../models/refreshToken.model.js"

export const create = (data) => RefreshToken.create(data)
export const findByHash = (tokenHash) => RefreshToken.findOne({ tokenHash })
export const revoke = (id) => RefreshToken.findByIdAndUpdate(id, { revokedAt: new Date() })
export const revokeFamily = (familyId) => RefreshToken.updateMany({ familyId, revokedAt: null }, { revokedAt: new Date() })
// A password reset should end every existing session, not just close the
// loop on the device that requested it.
export const revokeAllForUser = (userId) => RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() })
export const markUsed = (id, replacedByTokenId) =>
    RefreshToken.findByIdAndUpdate(id, { lastUsedAt: new Date(), replacedByTokenId })
