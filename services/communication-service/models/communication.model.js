import mongoose from "mongoose"

const communicationSchema = new mongoose.Schema({
    entityType: { type: String, enum: ["REGISTRATION", "ONBOARDING", "CLIENT", "ENQUIRY", "USER"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    channel: { type: String, enum: ["EMAIL", "WHATSAPP", "VOICE"], required: true },
    eventType: { type: String, required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, default: null },
    templateVersion: { type: Number, default: null },
    destinationMasked: { type: String, required: true },
    provider: { type: String, enum: ["META", "EMAIL_PROVIDER", "MOCK"], required: true },
    providerMessageId: { type: String, default: null },
    status: { type: String, enum: ["QUEUED", "SENT", "DELIVERED", "OPENED", "READ", "FAILED", "MOCK_SENT"], default: "QUEUED" },
    attempts: { type: Number, default: 0 },
    lastErrorCode: { type: String, default: null },
    queuedAt: { type: Date, default: Date.now },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    openedAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
}, { timestamps: true })

communicationSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })
communicationSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model("Communication", communicationSchema)
