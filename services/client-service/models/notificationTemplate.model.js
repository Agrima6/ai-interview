import mongoose from "mongoose"

const NotificationTemplateSchema = new mongoose.Schema(
    {
        tenantId: { type: String, required: true, index: true },
        templateId: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ["EMAIL", "WHATSAPP", "CALL"], default: "EMAIL" },
        purpose: {
            type: String,
            enum: ["INVITATION", "REMINDER", "COMPLETION", "REJECTION", "CONGRATULATIONS", "FOLLOW_UP", "OTHER"],
            default: "OTHER",
        },
        status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
        // Required for EMAIL, meaningless for WHATSAPP/CALL - not marked
        // schema-required so non-email templates don't need a placeholder.
        subject: { type: String },
        body: { type: String, required: true },
        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
)

NotificationTemplateSchema.index({ tenantId: 1, templateId: 1 }, { unique: true })

export const NotificationTemplate = mongoose.model("NotificationTemplate", NotificationTemplateSchema)
