import mongoose from "mongoose"

const clientSchema = new mongoose.Schema({
    onboardingId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    registrationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    type: { type: String, enum: ["ORGANIZATION", "COLLEGE"], required: true },
    name: { type: String, required: true },
    primaryContact: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
    },
    branding: { logoFileId: { type: mongoose.Schema.Types.ObjectId, default: null } },
    status: { type: String, enum: ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"], default: "PENDING" },
    subdomain: { type: String, default: null },
}, { timestamps: true })

clientSchema.index({ tenantId: 1, status: 1 })
clientSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model("Client", clientSchema)
