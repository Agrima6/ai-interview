import mongoose from "mongoose"

const registrationSchema = new mongoose.Schema({
    type: { type: String, enum: ["ORGANIZATION", "COLLEGE", "CANDIDATE"], required: true },
    contact: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    formVersionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ["SUBMITTED", "PROCESSING", "LINK_SENT", "EXPIRED", "CANCELLED"], default: "SUBMITTED" },
    consent: {
        accepted: { type: Boolean, default: false },
        acceptedAt: { type: Date, default: null },
    },
    captchaVerifiedAt: { type: Date, default: null },
}, { timestamps: true })

registrationSchema.index({ type: 1, status: 1, createdAt: -1 })
registrationSchema.index({ "contact.email": 1 })

export default mongoose.model("Registration", registrationSchema)
