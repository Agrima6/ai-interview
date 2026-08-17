import mongoose from "mongoose"

const formDefinitionSchema = new mongoose.Schema({
    type: { type: String, enum: ["ORGANIZATION", "COLLEGE", "CANDIDATE"], required: true },
    // A short REGISTRATION form (contact + basics) hands off to a longer
    // ONBOARDING form (full profile) once the invitation link is opened.
    stage: { type: String, enum: ["REGISTRATION", "ONBOARDING"], required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT" },
    activeVersionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdBy: { type: String, default: "system" },
    updatedBy: { type: String, default: "system" },
}, { timestamps: true })

formDefinitionSchema.index({ type: 1, stage: 1 }, { unique: true })

export default mongoose.model("FormDefinition", formDefinitionSchema)
