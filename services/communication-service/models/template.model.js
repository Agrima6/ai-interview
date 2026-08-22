import mongoose from "mongoose"

const templateSchema = new mongoose.Schema({
    channel: { type: String, enum: ["EMAIL", "WHATSAPP"], required: true },
    eventType: { type: String, required: true },
    name: { type: String, required: true },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "PUBLISHED" },
    subject: { type: String, default: null },
    body: { type: String, required: true },
    htmlBody: { type: String, default: null },
    providerTemplateName: { type: String, default: null },
    variables: [{ type: String }],
}, { timestamps: true })

templateSchema.index({ channel: 1, eventType: 1, status: 1 })

export default mongoose.model("Template", templateSchema)
