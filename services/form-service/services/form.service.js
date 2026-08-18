import * as formDefRepo from "../repositories/formDefinition.repository.js"
import * as formVersionRepo from "../repositories/formVersion.repository.js"
import { ApiError } from "../utils/response.js"

const view = (definition, version) => ({
    id: String(definition._id),
    formDefinitionId: String(definition._id),
    type: definition.type,
    stage: definition.stage,
    name: definition.name,
    status: definition.status,
    versionId: version ? String(version._id) : null,
    version: version?.version || 0,
    sections: version?.sections || [],
})

export const listDefinitions = async () => {
    const definitions = await formDefRepo.findAll()
    const items = []
    for (const definition of definitions) {
        const version = definition.activeVersionId
            ? await formVersionRepo.findById(definition.activeVersionId)
            : await formVersionRepo.latestByDefinition(definition._id)
        items.push(view(definition, version))
    }
    return items
}

export const getByTypeAndStage = async (type, stage) => {
    const definition = await formDefRepo.findByTypeAndStage(type, stage)
    if (!definition) {
        return {
            id: null,
            formDefinitionId: null,
            type,
            stage,
            name: `${type.charAt(0)}${type.slice(1).toLowerCase()} ${stage.toLowerCase()}`,
            status: "DRAFT",
            versionId: null,
            version: 0,
            sections: [],
        }
    }
    const version = definition.activeVersionId
        ? await formVersionRepo.findById(definition.activeVersionId)
        : await formVersionRepo.latestByDefinition(definition._id)
    return view(definition, version)
}

export const getPublished = async (type, stage) => {
    const definition = await formDefRepo.findByTypeAndStage(type, stage)
    if (!definition || !definition.activeVersionId) {
        throw new ApiError(404, "FORM_NOT_PUBLISHED", `No published ${stage.toLowerCase()} form for ${type}.`)
    }
    const version = await formVersionRepo.findById(definition.activeVersionId)
    if (!version) throw new ApiError(404, "FORM_NOT_PUBLISHED", "Published version missing.")
    return view(definition, version)
}

export const saveDraft = async ({ type, stage, name, sections = [] }) => {
    const definition = await formDefRepo.upsert(type, stage, {
        name: name || `${type.charAt(0)}${type.slice(1).toLowerCase()} ${stage.toLowerCase()}`,
        status: "DRAFT",
    })

    const latestVersion = await formVersionRepo.latestByDefinition(definition._id)
    const nextVersion = (latestVersion?.version || 0) + 1
    const version = await formVersionRepo.create({
        formDefinitionId: definition._id,
        version: nextVersion,
        status: "DRAFT",
        sections: sections.map((section, index) => ({
            key: section.key || `section_${index + 1}`,
            title: section.title || `Section ${index + 1}`,
            order: section.order || index + 1,
            fields: (section.fields || []).map((field, fieldIndex) => ({
                ...field,
                key: field.key || `field_${index + 1}_${fieldIndex + 1}`,
                label: field.label || `Field ${fieldIndex + 1}`,
                type: field.type || "TEXT",
                options: field.options || [],
            })),
        })),
    })

    await formDefRepo.update(definition._id, { name: definition.name || name, status: "DRAFT" })
    return view({ ...definition, name: definition.name || name, status: "DRAFT" }, version)
}

export const publishLatest = async ({ type, stage, name }) => {
    const definition = await formDefRepo.findByTypeAndStage(type, stage)
    if (!definition) {
        throw new ApiError(404, "FORM_NOT_FOUND", `No form found for ${type} ${stage}.`)
    }

    const latestVersion = await formVersionRepo.latestByDefinition(definition._id)
    if (!latestVersion) {
        throw new ApiError(404, "FORM_VERSION_NOT_FOUND", "No draft version to publish.")
    }

    const published = await formVersionRepo.publish(latestVersion._id)
    await formDefRepo.update(definition._id, {
        name: name || definition.name,
        status: "PUBLISHED",
        activeVersionId: published._id,
    })

    const refreshed = await formDefRepo.findById(definition._id)
    return view(refreshed, published)
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
