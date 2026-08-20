import FormDefinition from "../models/formDefinition.model.js"

export const findAll = () => FormDefinition.find().sort({ type: 1, stage: 1, updatedAt: -1 })
export const findByTypeAndStage = (type, stage) => FormDefinition.findOne({ type, stage })
export const findById = (id) => FormDefinition.findById(id)
export const update = (id, data) => FormDefinition.findByIdAndUpdate(id, data, { new: true })
export const upsert = (type, stage, data) =>
    FormDefinition.findOneAndUpdate({ type, stage }, { type, stage, ...data }, { upsert: true, new: true })
export const setActiveVersion = (id, versionId) =>
    FormDefinition.findByIdAndUpdate(id, { activeVersionId: versionId, status: "PUBLISHED" }, { new: true })
export const setDraftStatus = (id, data = {}) =>
    FormDefinition.findByIdAndUpdate(id, { ...data, status: "DRAFT" }, { new: true })
