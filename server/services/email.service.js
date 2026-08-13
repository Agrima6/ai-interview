import nodemailer from "nodemailer"

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
    const description = template?.description || ""

    const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #111827;">You're invited to interview: ${escapeHtml(title)}</h2>
      <p>Hi ${escapeHtml(candidateName)},</p>
      <p>You've been invited to complete an interview${description ? ` for <strong>${escapeHtml(title)}</strong>` : ""}.</p>
      ${description ? `<p style="color:#4b5563;">${escapeHtml(description)}</p>` : ""}
      <p style="margin: 24px 0;">
        <a href="${inviteLink}" style="background:#4f46e5;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
          Start Interview
        </a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">Or copy this link into your browser:<br/>${inviteLink}</p>
      ${invite.expiresAt ? `<p style="font-size: 13px; color: #6b7280;">This invite expires on ${new Date(invite.expiresAt).toLocaleString()}.</p>` : ""}
      <p style="margin-top: 32px; font-size: 13px; color: #9ca3af;">Sent via InterviewIQ.</p>
    </div>
    `

    const mailer = getTransporter()

    return mailer.sendMail({
        from: `InterviewIQ <${process.env.SMTP_USER}>`,
        to: invite.candidateEmail,
        subject: `You're invited to interview: ${title}`,
        html,
    })
}
