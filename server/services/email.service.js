import nodemailer from "nodemailer"
import NotificationTemplate from "../models/notificationTemplate.model.js"
import Organization from "../models/organization.model.js"

let transporter = null

// Lazily built so a missing SMTP config doesn't crash the app at import time
// (mirrors how ai.service's providers are individually optional).
const getTransporter = () => {
    if (transporter) return transporter

    if (!process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD) {
        throw new Error("SMTP_USER / SMTP_APP_PASSWORD are not configured.")
    }

    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_APP_PASSWORD,
        },
    })

    return transporter
}

const escapeHtml = (str = "") =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const DEFAULT_INVITATION_TEMPLATE = {
    subject: "You have been invited to attempt the AI Interview for {drive_title} at {company_name}",
    body: "Hello {candidate_name},\n\nWe are pleased to invite you to take the AI-powered video interview for the position of {drive_title} at {company_name}.\n\nPlease click the link below to start your interview attempt before {expiry_date}:\n\n{interview_link}\n\nBest regards,\nRecruitment Team",
}

const renderTemplate = (text, values) => (text || "").replace(/\{\{?\s*(\w+)\s*\}?\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
)

const getInvitationTemplate = async (organizationId) => {
    const tenantId = String(organizationId)
    const stored = await NotificationTemplate.findOne({ tenantId, templateId: "tmpl-1", type: "EMAIL" }).lean()
    return stored || DEFAULT_INVITATION_TEMPLATE
}

/**
 * sendInterviewInvite
 * Emails a candidate a unique link to start their interview from an invite.
 * `invite` is an InterviewInvite doc (needs candidateEmail/candidateName/token),
 * `template` is the InterviewTemplate doc it's tied to (needs title/description).
 */
export const sendInterviewInvite = async (invite, template) => {
    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim()
    const inviteLink = `${clientUrl}/interview/invite/${invite.token}`

    const candidateName = invite.candidateName?.trim() || "there"
    const title = template?.title || "Interview"
        const organization = invite.organizationId
                ? await Organization.findById(invite.organizationId).select("name").lean()
                : null
        const companyName = organization?.name || "Your Organization"
        const values = {
                candidate_name: candidateName,
                drive_title: title,
                company_name: companyName,
                interview_link: inviteLink,
                expiry_date: invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "the expiry date",
        }
        const notificationTemplate = await getInvitationTemplate(invite.organizationId)
        const subject = renderTemplate(notificationTemplate.subject, values)
        const body = renderTemplate(notificationTemplate.body, values)
        const escapedInviteLink = escapeHtml(inviteLink)
        const htmlBody = escapeHtml(body)
            .replace(escapedInviteLink, `<a href="${escapedInviteLink}">${escapedInviteLink}</a>`)
            .replace(/\n/g, "<br/>" )

    const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
            <div style="white-space: pre-wrap;">${htmlBody}</div>
    </div>
    `

    const mailer = getTransporter()

    return mailer.sendMail({
        from: `InterviewIQ <${process.env.SMTP_USER}>`,
        to: invite.candidateEmail,
        subject,
        html,
    })
}
