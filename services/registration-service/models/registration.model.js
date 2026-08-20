import mongoose from "mongoose"

const registrationSchema = new mongoose.Schema({
    type: { type: String, enum: ["ORGANIZATION", "COLLEGE", "CANDIDATE"], required: true },
    contact: {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, required: true, trim: true },
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
// Partial unique index (only over still-active statuses) closes the
// check-then-create race in registration.service.js#submit: two concurrent
// submissions for the same email can both pass the findActiveByEmail read,
// but only one create() will win here - the loser gets a duplicate-key
// error instead of silently creating a second active registration.
registrationSchema.index(
    { "contact.email": 1 },
    {
        // Explicit name - the auto-generated name would collide with the
        // pre-existing plain (non-unique) index on the same field, and
        // MongoDB silently refuses to change an existing index's options
        // under an unchanged name rather than erroring loudly.
        name: "contact_email_active_unique",
        unique: true,
        partialFilterExpression: { status: { $in: ["SUBMITTED", "PROCESSING", "LINK_SENT"] } },
    }
)

export default mongoose.model("Registration", registrationSchema)
