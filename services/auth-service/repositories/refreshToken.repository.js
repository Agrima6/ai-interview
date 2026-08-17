import RefreshToken from "../models/refreshToken.model.js"

export const create = (data) => RefreshToken.create(data)
export const findByHash = (tokenHash) => RefreshToken.findOne({ tokenHash })
export const revoke = (id) => RefreshToken.findByIdAndUpdate(id, { revokedAt: new Date() })
export const revokeFamily = (familyId) => RefreshToken.updateMany({ familyId, revokedAt: null }, { revokedAt: new Date() })
export const markUsed = (id, replacedByTokenId) =>
    RefreshToken.findByIdAndUpdate(id, { lastUsedAt: new Date(), replacedByTokenId })
