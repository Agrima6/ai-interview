import mongoose from "mongoose"

const fieldSchema = new mongoose.Schema({
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: {
        type: String, required: true,
        enum: ["TEXT", "EMAIL", "PHONE", "NUMBER", "DATE", "SELECT", "MULTI_SELECT", "RADIO", "CHECKBOX", "TEXTAREA", "FILE", "IMAGE", "MULTI_FILE", "URL", "ADDRESS", "COLOR"],
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: null },
    helpText: { type: String, default: null },
    validation: { type: mongoose.Schema.Types.Mixed, default: {} },
    options: [{ label: String, value: String }],
    visibility: { type: mongoose.Schema.Types.Mixed, default: null },
    accept: { type: String, default: null },
    maxFileSizeMb: { type: Number, default: null },
}, { _id: false })

const sectionSchema = new mongoose.Schema({
    key: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, required: true },
    fields: [fieldSchema],
}, { _id: false })

const formVersionSchema = new mongoose.Schema({
    formDefinitionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    version: { type: Number, required: true },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT" },
    sections: [sectionSchema],
    createdBy: { type: String, default: "system" },
    publishedAt: { type: Date, default: null },
}, { timestamps: true })

formVersionSchema.index({ formDefinitionId: 1, version: 1 }, { unique: true })

export default mongoose.model("FormVersion", formVersionSchema)
