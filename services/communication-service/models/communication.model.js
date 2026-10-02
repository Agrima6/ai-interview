import mongoose from "mongoose"

const communicationSchema = new mongoose.Schema({
    entityType: { type: String, enum: ["REGISTRATION", "ONBOARDING", "CLIENT", "ENQUIRY", "USER"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    channel: { type: String, enum: ["EMAIL", "WHATSAPP", "VOICE"], required: true },
    eventType: { type: String, required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, default: null },
    templateVersion: { type: Number, default: null },
    destinationMasked: { type: String, required: true },
    recipient: { type: String, default: null },
    subject: { type: String, default: null },
    body: { type: String, default: null },
    html: { type: String, default: null },
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
    // Caller-supplied context for precise joins back to the sending
    // service's own records (e.g. { driveId, candidateId } for a candidate
    // invite) - this service has no idea what a "drive" is, it just carries
    // the tag so the caller can ask "which of my candidates opened theirs".
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true })

communicationSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })
communicationSchema.index({ status: 1, createdAt: -1 })
communicationSchema.index({ "metadata.driveId": 1 })

export default mongoose.model("Communication", communicationSchema)
