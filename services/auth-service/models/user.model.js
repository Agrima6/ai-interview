import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    emailNormalized: { type: String, required: true, unique: true, index: true },
    phone: { type: String, default: null },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
    tenantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    roles: [{ type: String }],
    permissionVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
}, { timestamps: true })

userSchema.index({ tenantId: 1, status: 1 })

export default mongoose.model("User", userSchema)
