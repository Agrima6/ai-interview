import FormVersion from "../models/formVersion.model.js"

export const findById = (id) => FormVersion.findById(id)
export const findByDefinitionAndVersion = (formDefinitionId, version) => FormVersion.findOne({ formDefinitionId, version })
export const latestByDefinition = (formDefinitionId) => FormVersion.findOne({ formDefinitionId }).sort({ version: -1 })
export const latestVersionNumber = async (formDefinitionId) => {
    const latest = await latestByDefinition(formDefinitionId)
    return latest ? latest.version : 0
}
export const create = (data) => FormVersion.create(data)
export const publish = (id) => FormVersion.findByIdAndUpdate(id, { status: "PUBLISHED", publishedAt: new Date() }, { new: true })
