import * as formDefRepo from "../repositories/formDefinition.repository.js"
import * as formVersionRepo from "../repositories/formVersion.repository.js"
import { ApiError } from "../utils/response.js"

const view = (definition, version) => ({
    formDefinitionId: String(definition._id),
    type: definition.type,
    stage: definition.stage,
    versionId: String(version._id),
    version: version.version,
    sections: version.sections,
})

export const getPublished = async (type, stage) => {
    const definition = await formDefRepo.findByTypeAndStage(type, stage)
    if (!definition || !definition.activeVersionId) {
        throw new ApiError(404, "FORM_NOT_PUBLISHED", `No published ${stage.toLowerCase()} form for ${type}.`)
    }
    const version = await formVersionRepo.findById(definition.activeVersionId)
    if (!version) throw new ApiError(404, "FORM_NOT_PUBLISHED", "Published version missing.")
    return view(definition, version)
}

export const getVersionById = async (versionId) => {
    const version = await formVersionRepo.findById(versionId)
    if (!version) throw new ApiError(404, "FORM_VERSION_NOT_FOUND", "Form version not found.")
    return version
}

// Seeds (or republishes) a form: creates the definition if missing, creates
// a new version with the given sections, and marks it as the active/published one.
export const seedPublished = async ({ type, stage, name, sections }) => {
    const definition = await formDefRepo.upsert(type, stage, { name })
    const nextVersion = (await formVersionRepo.latestVersionNumber(definition._id)) + 1
    const version = await formVersionRepo.create({
        formDefinitionId: definition._id,
        version: nextVersion,
        status: "PUBLISHED",
        sections,
        publishedAt: new Date(),
    })
    await formDefRepo.setActiveVersion(definition._id, version._id)
    return view(definition, version)
}
