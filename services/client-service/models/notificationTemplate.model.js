import mongoose from "mongoose"

const NotificationTemplateSchema = new mongoose.Schema(
    {
        tenantId: { type: String, required: true, index: true },
        templateId: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ["EMAIL", "SMS", "WHATSAPP"], default: "EMAIL" },
        subject: { type: String, required: true },
        body: { type: String, required: true },
        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
)

NotificationTemplateSchema.index({ tenantId: 1, templateId: 1 }, { unique: true })

export const NotificationTemplate = mongoose.model("NotificationTemplate", NotificationTemplateSchema)
