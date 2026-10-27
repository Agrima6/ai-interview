import { NotificationTemplate } from "../models/notificationTemplate.model.js"
import { ApiError } from "../utils/response.js"
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLE_KEYS } from "../utils/defaultTemplates.js"

const renderText = (text, values) => (text || "").replace(/\{\{?\s*(\w+)\s*\}?\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
)

import crypto from "crypto"

// Placeholders a template uses that the sender has no value for. Refused on save as well as on send, so a typo such
// as {{candidatename}} is caught while the admin is still editing, not when a candidate receives it.
export const findUnknownPlaceholders = (...texts) => {
    const unknown = new Set()
    for (const text of texts) {
        for (const match of String(text || "").matchAll(/\{\{?\s*(\w+)\s*\}?\}/g)) {
            if (!TEMPLATE_VARIABLE_KEYS.includes(match[1])) unknown.add(match[1])
        }
    }
    return [...unknown]
}

const assertPlaceholdersKnown = (...texts) => {
    const unknown = findUnknownPlaceholders(...texts)
    if (unknown.length) {
        throw new ApiError(422, "TEMPLATE_PLACEHOLDERS", `Unknown placeholder${unknown.length === 1 ? "" : "s"}: ${unknown.map((k) => `{${k}}`).join(", ")}. Use only: ${TEMPLATE_VARIABLE_KEYS.map((k) => `{${k}}`).join(", ")}.`)
    }
}

// Makes sure the organization has every default template, touching nothing it already has:
//  - a default it already owns (matched by defaultKey) is left exactly as the admin edited it;
//  - a template seeded by the older initializer (same name, no defaultKey) is adopted by stamping the key on it;
//  - only genuinely missing defaults are inserted. The unique (tenantId, defaultKey) index makes two concurrent
//    initializations safe: the loser's duplicate-key error just means the other one already inserted it.
export const ensureDefaultTemplates = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    const existing = await NotificationTemplate.find({ tenantId }, { defaultKey: 1, name: 1, type: 1 }).lean()
    const haveKeys = new Set(existing.map((t) => t.defaultKey).filter(Boolean))

    for (const def of DEFAULT_TEMPLATES) {
        if (haveKeys.has(def.defaultKey)) continue
        const { legacyName, ...fields } = def

        const legacy = legacyName && existing.find((t) => !t.defaultKey && t.name === legacyName && t.type === def.type)
        if (legacy) {
            await NotificationTemplate.updateOne({ _id: legacy._id, defaultKey: { $exists: false } }, { $set: { defaultKey: def.defaultKey, ...(def.roundNumber ? { roundNumber: def.roundNumber } : {}) } })
            continue
        }

        try {
            await NotificationTemplate.create({ ...fields, tenantId, templateId: `tmpl-${crypto.randomBytes(4).toString("hex")}` })
        } catch (err) {
            if (err?.code !== 11000) throw err
        }
    }
}

export const listTemplates = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    await ensureDefaultTemplates(tenantId)
    return await NotificationTemplate.find({ tenantId }).sort({ createdAt: 1 })
}

export const loadDefaultTemplates = async (tenantId) => listTemplates(tenantId)

export const updateTemplate = async (tenantId, templateId, { subject, body, name, type, purpose, status }) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    assertPlaceholdersKnown(subject, body)

    const fields = { lastUpdated: new Date() }
    if (subject !== undefined) fields.subject = subject
    if (body !== undefined) fields.body = body
    if (name !== undefined) fields.name = name
    if (type !== undefined) fields.type = type
    if (purpose !== undefined) fields.purpose = purpose
    if (status !== undefined) fields.status = status

    const updated = await NotificationTemplate.findOneAndUpdate(
        { tenantId, templateId },
        { $set: fields },
        { new: true }
    )
    if (!updated) throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Template not found.")

    return updated
}

export const createTemplate = async (tenantId, { name, type, purpose, subject, body }) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    if (!name?.trim()) throw new ApiError(400, "MISSING_NAME", "Template name is required.")
    if (!body?.trim()) throw new ApiError(400, "MISSING_BODY", "Template body is required.")
    if (type === "EMAIL" && !subject?.trim()) throw new ApiError(400, "MISSING_SUBJECT", "Email templates require a subject line.")
    assertPlaceholdersKnown(subject, body)

    const created = await NotificationTemplate.create({
        tenantId,
        templateId: `tmpl-custom-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
        name: name.trim(),
        type: type || "EMAIL",
        purpose: purpose || "OTHER",
        subject: subject?.trim(),
        body: body.trim(),
    })

    return created
}

// Used by the drive-detail screen to preview an invite/reminder email
// rendered with sample values before it's actually sent - matches on either
// the seeded/custom templateId slug or the Mongo _id, since callers refer
// to templates both ways depending on where the reference came from.
export const previewTemplate = async (tenantId, templateId, changes = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    // "_id: templateId" would throw a CastError if templateId isn't a valid
    // ObjectId hex string (e.g. the seeded "tmpl-1" slug), so only add that
    // clause when it actually looks like one.
    const idClauses = [{ templateId }]
    if (/^[0-9a-fA-F]{24}$/.test(templateId)) idClauses.push({ _id: templateId })
    const template = await NotificationTemplate.findOne({ tenantId, $or: idClauses }).lean()
    if (!template) throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Notification template was not found.")

    const values = {
        candidate_name: "Aarav Sharma",
        drive_title: "Senior Backend Engineer",
        company_name: "Your Organization",
        interview_link: "https://workmateiq.com/interview/invite/preview",
        expiry_date: new Date(Date.now() + 14 * 86400000).toLocaleDateString(),
        round_number: "2",
        round_title: "Technical Interview",
        interview_date: new Date(Date.now() + 3 * 86400000).toLocaleString(),
        ...(changes.values || {}),
    }

    return {
        subject: renderText(changes.subject ?? template.subject, values),
        body: renderText(changes.body ?? template.body, values),
        values,
    }
}

export const deleteTemplate = async (tenantId, templateId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const target = await NotificationTemplate.findOne({ tenantId, templateId }, { defaultKey: 1 }).lean()
    if (!target) throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Template not found.")
    if (target.defaultKey) {
        throw new ApiError(409, "DEFAULT_TEMPLATE_PROTECTED", "Default templates can be edited or set to Inactive, but not deleted.")
    }
    await NotificationTemplate.deleteOne({ tenantId, templateId })

    return { deleted: true }
}
