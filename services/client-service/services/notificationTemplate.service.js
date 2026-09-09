import { NotificationTemplate } from "../models/notificationTemplate.model.js"
import { ApiError } from "../utils/response.js"

const DEFAULT_TEMPLATES = [
    {
        templateId: "tmpl-1",
        name: "Candidate AI Interview Invitation",
        type: "EMAIL",
        purpose: "INVITATION",
        subject: "You have been invited to attempt the AI Interview for {drive_title} at {company_name}",
        body: `Hello {candidate_name},\n\nWe are pleased to invite you to take the AI-powered video interview for the position of {drive_title} at {company_name}.\n\nPlease click the link below to start your interview attempt before {expiry_date}:\n\n{interview_link}\n\nBest regards,\nRecruitment Team`,
    },
    {
        templateId: "tmpl-2",
        name: "Interview Reminder Notification",
        type: "EMAIL",
        purpose: "REMINDER",
        subject: "Reminder: Your AI Interview for {drive_title} expires soon",
        body: `Hi {candidate_name},\n\nThis is a friendly reminder that your AI video interview for {drive_title} is scheduled to expire on {expiry_date}.\n\nAccess your interview room here: {interview_link}\n\nGood luck!`,
    },
    {
        templateId: "tmpl-3",
        name: "Shortlisted Candidate Next Round Email",
        type: "EMAIL",
        purpose: "CONGRATULATIONS",
        subject: "Congratulations! You have been shortlisted for {drive_title}",
        body: `Dear {candidate_name},\n\nGreat news! Based on your outstanding AI interview evaluation score, our hiring team has shortlisted your application for {drive_title}.\n\nOur recruiters will reach out shortly to schedule the final round.\n\nBest regards,\n{company_name} Talent Team`,
    },
    {
        templateId: "tmpl-4",
        name: "Application Not Progressing",
        type: "EMAIL",
        purpose: "REJECTION",
        subject: "Update on your application for {drive_title}",
        body: `Dear {candidate_name},\n\nThank you for taking the time to interview for {drive_title} at {company_name}. After careful review, we've decided to move forward with other candidates for this role.\n\nWe appreciate your interest and encourage you to apply again in the future.\n\nBest regards,\n{company_name} Talent Team`,
    },
    {
        templateId: "tmpl-5",
        name: "WhatsApp Interview Invitation",
        type: "WHATSAPP",
        purpose: "INVITATION",
        body: `Hi {candidate_name}! You've been invited to the AI interview for *{drive_title}* at {company_name}. Complete it before {expiry_date}: {interview_link}`,
    },
    {
        templateId: "tmpl-6",
        name: "WhatsApp Interview Reminder",
        type: "WHATSAPP",
        purpose: "REMINDER",
        body: `Hi {candidate_name}, just a reminder - your AI interview for *{drive_title}* expires on {expiry_date}. Attempt it here: {interview_link}`,
    },
    {
        templateId: "tmpl-7",
        name: "Recruiter Follow-up Call Script",
        type: "CALL",
        purpose: "FOLLOW_UP",
        body: `Greet {candidate_name} and confirm they're speaking with {company_name} regarding the {drive_title} role.\n\n1. Confirm they completed the AI interview.\n2. Ask if they have questions about the role or next steps.\n3. Share expected timeline for {drive_title} feedback.\n4. Thank them for their time and confirm best contact number/email.`,
    },
]

export const listTemplates = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    let templates = await NotificationTemplate.find({ tenantId }).sort({ createdAt: 1 })
    if (templates.length === 0) {
        const seeded = await NotificationTemplate.insertMany(
            DEFAULT_TEMPLATES.map((t) => ({ ...t, tenantId }))
        )
        return seeded
    }
    return templates
}

export const updateTemplate = async (tenantId, templateId, { subject, body, name, type, purpose, status }) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

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
        { new: true, upsert: true }
    )

    return updated
}

export const createTemplate = async (tenantId, { name, type, purpose, subject, body }) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    if (!name?.trim()) throw new ApiError(400, "MISSING_NAME", "Template name is required.")
    if (!body?.trim()) throw new ApiError(400, "MISSING_BODY", "Template body is required.")
    if (type === "EMAIL" && !subject?.trim()) throw new ApiError(400, "MISSING_SUBJECT", "Email templates require a subject line.")

    const created = await NotificationTemplate.create({
        tenantId,
        templateId: `tmpl-custom-${Date.now()}`,
        name: name.trim(),
        type: type || "EMAIL",
        purpose: purpose || "OTHER",
        subject: subject?.trim(),
        body: body.trim(),
    })

    return created
}

export const deleteTemplate = async (tenantId, templateId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const deleted = await NotificationTemplate.findOneAndDelete({ tenantId, templateId })
    if (!deleted) throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Template not found.")

    return { deleted: true }
}
