import mongoose from "mongoose"

const refreshTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true },
    familyId: { type: String, required: true, index: true },
    deviceId: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenId: { type: mongoose.Schema.Types.ObjectId, default: null },
    lastUsedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model("RefreshToken", refreshTokenSchema)
