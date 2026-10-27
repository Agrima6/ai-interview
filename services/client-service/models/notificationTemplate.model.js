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
        // Set on templates the platform provisioned (see utils/defaultTemplates.js). The key is the stable identity
        // that keeps initialization idempotent; defaults can be edited or deactivated but not deleted.
        defaultKey: { type: String },
        // Round an INVITATION template is written for (1 = first round); unset means any round.
        roundNumber: { type: Number, min: 1 },
        // Required for EMAIL, meaningless for WHATSAPP/CALL - not marked
        // schema-required so non-email templates don't need a placeholder.
        subject: { type: String },
        body: { type: String, required: true },
        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
)

NotificationTemplateSchema.index({ tenantId: 1, templateId: 1 }, { unique: true })
NotificationTemplateSchema.index(
    { tenantId: 1, defaultKey: 1 },
    { unique: true, partialFilterExpression: { defaultKey: { $type: "string" } } }
)

export const NotificationTemplate = mongoose.model("NotificationTemplate", NotificationTemplateSchema)
