import mongoose from "mongoose"

// Mirrors the refresh-token pattern: only the SHA-256 hash of the raw token
// is ever stored, never the raw value itself.
const resetTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model("PasswordResetToken", resetTokenSchema)
