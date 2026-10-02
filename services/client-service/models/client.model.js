import mongoose from "mongoose"

const clientSchema = new mongoose.Schema({
    onboardingId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    registrationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    type: { type: String, enum: ["ORGANIZATION", "COLLEGE"], required: true },
    name: { type: String, required: true },
    primaryContact: {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
        },
        phone: { type: String, required: true, trim: true },
    },
    branding: {
        logoFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
        logoUrl: { type: String, default: null },
        primaryColor: { type: String, default: null },
        secondaryColor: { type: String, default: null },
        fontFamily: { type: String, default: null },
    },
    smtp: {
        host: { type: String, default: null },
        port: { type: Number, default: null },
        encryption: { type: String, enum: ["NONE", "SSL", "TLS"], default: "TLS" },
        username: { type: String, default: null },
        // AES-256-GCM ciphertext (utils/crypto.js) - the plaintext password
        // is never stored and never sent back to the client after saving.
        encryptedPassword: { type: String, default: null, select: false },
        fromName: { type: String, default: null },
        fromEmail: { type: String, default: null },
        configured: { type: Boolean, default: false },
        lastTestedAt: { type: Date, default: null },
        lastTestStatus: { type: String, enum: ["SUCCESS", "FAILED", null], default: null },
    },
    status: { type: String, enum: ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"], default: "PENDING" },
    subdomain: { type: String, default: null },
}, { timestamps: true })

clientSchema.index({ tenantId: 1, status: 1 })
clientSchema.index({ status: 1, createdAt: -1 })
// Backs the Clients table's type filter + date range + "newest first" sort.
clientSchema.index({ type: 1, createdAt: -1 })

export default mongoose.model("Client", clientSchema)
