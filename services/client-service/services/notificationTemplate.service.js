import { NotificationTemplate } from "../models/notificationTemplate.model.js"
import { ApiError } from "../utils/response.js"

const DEFAULT_TEMPLATES = [
    {
        templateId: "tmpl-1",
        name: "Candidate AI Interview Invitation",
        type: "EMAIL",
        subject: "You have been invited to attempt the AI Interview for {drive_title} at {company_name}",
        body: `Hello {candidate_name},\n\nWe are pleased to invite you to take the AI-powered video interview for the position of {drive_title} at {company_name}.\n\nPlease click the link below to start your interview attempt before {expiry_date}:\n\n{interview_link}\n\nBest regards,\nRecruitment Team`,
    },
    {
        templateId: "tmpl-2",
        name: "Interview Reminder Notification",
        type: "EMAIL",
        subject: "Reminder: Your AI Interview for {drive_title} expires soon",
        body: `Hi {candidate_name},\n\nThis is a friendly reminder that your AI video interview for {drive_title} is scheduled to expire on {expiry_date}.\n\nAccess your interview room here: {interview_link}\n\nGood luck!`,
    },
    {
        templateId: "tmpl-3",
        name: "Shortlisted Candidate Next Round Email",
        type: "EMAIL",
        subject: "Congratulations! You have been shortlisted for {drive_title}",
        body: `Dear {candidate_name},\n\nGreat news! Based on your outstanding AI interview evaluation score, our hiring team has shortlisted your application for {drive_title}.\n\nOur recruiters will reach out shortly to schedule the final round.\n\nBest regards,\n{company_name} Talent Team`,
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

export const updateTemplate = async (tenantId, templateId, { subject, body }) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const updated = await NotificationTemplate.findOneAndUpdate(
        { tenantId, templateId },
        { $set: { subject, body, lastUpdated: new Date() } },
        { new: true, upsert: true }
    )

    return updated
}
