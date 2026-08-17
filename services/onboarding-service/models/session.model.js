import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema({
    invitationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    registrationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["ORGANIZATION", "COLLEGE", "CANDIDATE"], required: true },
    contact: {
        name: { type: String, default: null },
        email: { type: String, default: null },
        phone: { type: String, default: null },
    },
    status: {
        type: String,
        enum: ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "RESUBMITTED", "APPROVED", "REJECTED"],
        default: "NOT_STARTED",
    },
    currentStep: { type: Number, default: 1 },
    formVersionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    files: [{
        fieldKey: String,
        fileId: { type: mongoose.Schema.Types.ObjectId },
        originalName: String,
        mimeType: String,
        size: Number,
        status: { type: String, enum: ["UPLOADING", "UPLOADED", "AVAILABLE", "REJECTED"], default: "UPLOADING" },
    }],
    startedAt: { type: Date, default: null },
    lastSavedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
}, { timestamps: true })

sessionSchema.index({ status: 1, updatedAt: -1 })
sessionSchema.index({ invitationId: 1 })

export default mongoose.model("OnboardingSession", sessionSchema)
