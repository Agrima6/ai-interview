import mongoose from "mongoose"

const invitationSchema = new mongoose.Schema({
    registrationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    onboardingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["ORGANIZATION", "COLLEGE", "CANDIDATE"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    status: { type: String, enum: ["ACTIVE", "USED", "EXPIRED", "REVOKED"], default: "ACTIVE" },
    expiresAt: { type: Date, required: true, index: true },
    maxUses: { type: Number, default: 1 },
    useCount: { type: Number, default: 0 },
    firstAccessedAt: { type: Date, default: null },
    lastAccessedAt: { type: Date, default: null },
    consumedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.model("OnboardingInvitation", invitationSchema)
