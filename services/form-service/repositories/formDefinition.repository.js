import FormDefinition from "../models/formDefinition.model.js"

export const findByTypeAndStage = (type, stage) => FormDefinition.findOne({ type, stage })
export const upsert = (type, stage, data) =>
    FormDefinition.findOneAndUpdate({ type, stage }, { type, stage, ...data }, { upsert: true, new: true })
export const setActiveVersion = (id, versionId) =>
    FormDefinition.findByIdAndUpdate(id, { activeVersionId: versionId, status: "PUBLISHED" })
