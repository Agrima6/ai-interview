import "dotenv/config"
import connectDb from "../config/connectDb.js"
import * as templateRepo from "../repositories/template.repository.js"
import { wrapEmailBody, wrapOrgEmailBody, supportBox, button, ACCENT, INK } from "../utils/emailHtml.js"

const onboardingLinkHtml = wrapEmailBody(`
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${INK};line-height:1.3;">
        Complete your WorkmateIQ <span style="color:${ACCENT};">onboarding</span>
    </h1>
    <p style="margin:0 0 4px;font-size:14.5px;font-weight:700;color:${ACCENT};">Hi {{recipientGreeting}},</p>
    <p style="margin:0 0 4px;font-size:14px;color:${INK};line-height:1.6;">
        Thank you for registering <strong>{{clientName}}</strong> with WorkmateIQ.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:${INK};line-height:1.6;">
        You're almost there. Please complete the remaining onboarding details so our team can review your institution and get everything set up.
    </p>
    ${button("Complete Onboarding →", "{{onboardingUrl}}")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf1f1;border:1px solid #f7dcdc;border-radius:12px;margin:0 0 4px;">
        <tr><td style="padding:14px 18px;font-size:13.5px;color:${INK};">This link is valid for <strong>7 days</strong>.</td></tr>
    </table>
    ${supportBox()}
`)

const onboardingSubmittedHtml = wrapEmailBody(`
    <div style="text-align:center;margin-bottom:20px;">
        <div style="width:64px;height:64px;border-radius:50%;background:#fdeaea;display:inline-block;line-height:64px;font-size:28px;color:${ACCENT};">&#10003;</div>
    </div>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${INK};line-height:1.3;text-align:center;">
        We've received your <span style="color:${ACCENT};">onboarding application!</span>
    </h1>
    <p style="margin:0 0 4px;font-size:14.5px;font-weight:700;color:${ACCENT};">Hi {{recipientGreeting}},</p>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};line-height:1.6;">
        Thank you for completing the onboarding for <strong>{{clientName}}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eefaf1;border:1px solid #d3f0dc;border-radius:12px;margin:0 0 16px;">
        <tr><td style="padding:14px 18px;font-size:13.5px;font-weight:600;color:#1a7a3d;">&#10003; We've received your onboarding form successfully.</td></tr>
    </table>
    <p style="margin:0 0 4px;font-size:14px;color:${INK};line-height:1.6;">
        Our team will review the information and share the next update with you using your provided contact details.
    </p>
    ${supportBox()}
`)

const passwordResetHtml = wrapEmailBody(`
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${INK};line-height:1.3;">
        Reset your <span style="color:${ACCENT};">WorkmateIQ password</span>
    </h1>
    <p style="margin:0 0 4px;font-size:14.5px;font-weight:700;color:${ACCENT};">Hi {{recipientGreeting}},</p>
    <p style="margin:0 0 4px;font-size:14px;color:${INK};line-height:1.6;">
        We received a request to reset your WorkmateIQ password.
    </p>
    ${button("Reset Password →", "{{resetUrl}}")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf1f1;border:1px solid #f7dcdc;border-radius:12px;margin:0 0 4px;">
        <tr><td style="padding:14px 18px;font-size:13.5px;color:${INK};">This link is valid for <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email - your password won't be changed.</td></tr>
    </table>
    ${supportBox()}
`)

const clientApprovedHtml = wrapEmailBody(`
    <div style="text-align:center;margin-bottom:20px;">
        <div style="width:64px;height:64px;border-radius:50%;background:#fdeaea;display:inline-block;line-height:64px;font-size:28px;color:${ACCENT};">&#10003;</div>
    </div>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${INK};line-height:1.3;text-align:center;">
        {{clientName}} is <span style="color:${ACCENT};">approved!</span>
    </h1>
    <p style="margin:0 0 4px;font-size:14.5px;font-weight:700;color:${ACCENT};">Hi {{recipientGreeting}},</p>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};line-height:1.6;">
        Great news - <strong>{{clientName}}</strong> has been approved on WorkmateIQ. You can now sign in to your dashboard.
    </p>
    ${button("Sign In →", "{{loginUrl}}")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f5;border:1px solid #eee6e6;border-radius:12px;margin:0 0 20px;">
        <tr><td style="padding:14px 18px;font-size:13.5px;color:${INK};line-height:1.8;">
            <strong>Email:</strong> {{recipientEmail}}<br/>
            <strong>Temporary password:</strong> {{tempPassword}}
        </td></tr>
    </table>
    <p style="margin:0 0 4px;font-size:13px;color:${INK};line-height:1.6;">
        You'll be asked to set a new password the first time you sign in.
    </p>
    ${supportBox()}
`)

const changesRequestedHtml = wrapEmailBody(`
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${INK};line-height:1.3;">
        A few <span style="color:${ACCENT};">updates needed</span> on your onboarding
    </h1>
    <p style="margin:0 0 4px;font-size:14.5px;font-weight:700;color:${ACCENT};">Hi {{recipientGreeting}},</p>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};line-height:1.6;">
        Our team reviewed the onboarding application for <strong>{{clientName}}</strong> and needs a few things corrected before we can proceed:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf1f1;border:1px solid #f7dcdc;border-radius:12px;margin:0 0 16px;">
        <tr><td style="padding:16px 20px;">
            <ul style="margin:0;padding-left:18px;font-size:13.5px;color:${INK};line-height:1.5;">{{changesListHtml}}</ul>
        </td></tr>
    </table>
    <p style="margin:0 0 4px;font-size:14px;color:${INK};line-height:1.6;">
        Everything else you already entered is saved - just update the items above and resubmit.
    </p>
    ${button("Update Onboarding →", "{{resumeUrl}}")}
    ${supportBox()}
`)

const candidateInviteHtml = wrapOrgEmailBody(`
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${INK};line-height:1.3;">
        You're invited to interview for <span style="color:${ACCENT};">{{drive_title}}</span>
    </h1>
    <p style="margin:0 0 4px;font-size:14.5px;font-weight:700;color:${ACCENT};">Hi {{candidate_name}},</p>
    <p style="margin:0 0 4px;font-size:14px;color:${INK};line-height:1.6;">
        <strong>{{company_name}}</strong> has invited you to complete an AI-powered video interview for this role.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:${INK};line-height:1.6;">
        The interview is self-paced - you can start whenever you're ready, before the link expires.
    </p>
    ${button("Start Interview →", "{{interview_link}}")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf1f1;border:1px solid #f7dcdc;border-radius:12px;margin:0 0 4px;">
        <tr><td style="padding:14px 18px;font-size:13.5px;color:${INK};">This invitation expires on <strong>{{expiry_date}}</strong>.</td></tr>
    </table>
    ${supportBox()}
`, "company_name")

const teamInviteHtml = wrapOrgEmailBody(`
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${INK};line-height:1.3;">
        You've been added to <span style="color:${ACCENT};">{{organizationName}}</span>
    </h1>
    <p style="margin:0 0 4px;font-size:14.5px;font-weight:700;color:${ACCENT};">Hi {{recipientGreeting}},</p>
    <p style="margin:0 0 4px;font-size:14px;color:${INK};line-height:1.6;">
        You've been invited to join <strong>{{organizationName}}</strong>'s WorkmateIQ workspace as <strong>{{roleLabel}}</strong>.
    </p>
    ${button("Sign In →", "{{loginUrl}}")}
    ${supportBox()}
`, "organizationName")

const templates = [
    {
        channel: "EMAIL", eventType: "CANDIDATE_INVITE", name: "Candidate interview invitation (email)",
        subject: "You've been invited to interview for {{drive_title}} at {{company_name}}",
        body: "Hi {{candidate_name}},\n\n{{company_name}} has invited you to complete an AI-powered video interview for {{drive_title}}.\n\nStart your interview: {{interview_link}}\n\nThis invitation expires on {{expiry_date}}.\n\nIf you have any questions, please contact our support team at {{supportEmail}}.\n\nRegards,\nThe {{company_name}} Team",
        htmlBody: candidateInviteHtml,
        variables: ["candidate_name", "drive_title", "company_name", "interview_link", "expiry_date", "supportEmail"],
    },
    {
        channel: "EMAIL", eventType: "TEAM_INVITE", name: "Organization team invite (email)",
        subject: "You've been added to {{organizationName}} on WorkmateIQ",
        body: "Hi {{recipientGreeting}},\n\nYou've been invited to join {{organizationName}}'s WorkmateIQ workspace as {{roleLabel}}.\n\nSign in here: {{loginUrl}}\n\nIf you have any questions, please contact our support team at {{supportEmail}}.\n\nRegards,\nThe {{organizationName}} Team",
        htmlBody: teamInviteHtml,
        variables: ["recipientGreeting", "organizationName", "roleLabel", "loginUrl", "supportEmail"],
    },
    {
        channel: "EMAIL", eventType: "ONBOARDING_LINK", name: "Onboarding link (email)",
        subject: "Complete your WorkmateIQ onboarding",
        body: "Hi {{recipientGreeting}},\n\nThank you for registering {{clientName}} with WorkmateIQ.\n\nYou're almost there. Please complete the remaining onboarding details so our team can review your institution and get everything set up.\n\nComplete Onboarding: {{onboardingUrl}}\n\nThis link is valid for 7 days.\n\nIf you have any questions or run into an issue while completing the form, please contact our support team at {{supportEmail}}.\n\nRegards,\nThe WorkmateIQ Team",
        htmlBody: onboardingLinkHtml,
        variables: ["recipientGreeting", "clientName", "onboardingUrl", "supportEmail"],
    },
    {
        channel: "WHATSAPP", eventType: "ONBOARDING_LINK", name: "Onboarding link (WhatsApp)",
        body: "Hi {{recipientGreeting}}! Continue your WorkmateIQ onboarding for {{clientName}}: {{onboardingUrl}}",
        providerTemplateName: "onboarding_link_v1",
        variables: ["recipientGreeting", "clientName", "onboardingUrl"],
    },
    {
        channel: "EMAIL", eventType: "PASSWORD_RESET", name: "Password reset (email)",
        subject: "Reset your WorkmateIQ password",
        body: "Hi {{recipientGreeting}},\n\nWe received a request to reset your WorkmateIQ password. Reset it here:\n{{resetUrl}}\n\nThis link is valid for 1 hour. If you didn't request this, you can safely ignore this email - your password won't be changed.\n\nIf you have any questions, please contact our support team at {{supportEmail}}.\n\nRegards,\nThe WorkmateIQ Team",
        htmlBody: passwordResetHtml,
        variables: ["recipientGreeting", "resetUrl", "supportEmail"],
    },
    {
        channel: "EMAIL", eventType: "CLIENT_APPROVED", name: "Client approved (email)",
        subject: "{{clientName}} is approved on WorkmateIQ - here's your login",
        body: "Hi {{recipientGreeting}},\n\nGreat news - {{clientName}} has been approved on WorkmateIQ. You can now sign in to your dashboard:\n{{loginUrl}}\n\nEmail: {{recipientEmail}}\nTemporary password: {{tempPassword}}\n\nYou'll be asked to set a new password the first time you sign in.\n\nIf you have any questions, please contact our support team at {{supportEmail}}.\n\nRegards,\nThe WorkmateIQ Team",
        htmlBody: clientApprovedHtml,
        variables: ["recipientGreeting", "recipientEmail", "clientName", "loginUrl", "tempPassword", "supportEmail"],
    },
    {
        channel: "EMAIL", eventType: "ONBOARDING_SUBMITTED", name: "Onboarding submitted (email)",
        subject: "We've received your onboarding application",
        body: "Hi {{recipientGreeting}},\n\nThank you for completing the onboarding for {{clientName}}.\n\nWe've received your onboarding form successfully.\n\nOur team will review the information and share the next update with you using your provided contact details.\n\nIf you have any questions or experience an issue, please contact our support team at {{supportEmail}}.\n\nRegards,\nThe WorkmateIQ Team",
        htmlBody: onboardingSubmittedHtml,
        variables: ["recipientGreeting", "clientName", "supportEmail"],
    },
    {
        channel: "EMAIL", eventType: "ONBOARDING_CHANGES_REQUESTED", name: "Onboarding changes requested (email)",
        subject: "A few updates needed on your WorkmateIQ onboarding",
        body: "Hi {{recipientGreeting}},\n\nOur team reviewed the onboarding application for {{clientName}} and needs a few things corrected before we can proceed:\n\n{{changesListText}}\n\nUpdate your onboarding here: {{resumeUrl}}\n\nEverything else you already entered is saved - just update the items above and resubmit.\n\nIf you have any questions, please contact our support team at {{supportEmail}}.\n\nRegards,\nThe WorkmateIQ Team",
        htmlBody: changesRequestedHtml,
        variables: ["recipientGreeting", "clientName", "changesListHtml", "changesListText", "resumeUrl", "supportEmail"],
    },
]

const run = async () => {
    await connectDb()
    for (const t of templates) {
        await templateRepo.upsertPublished(t.channel, t.eventType, t)
        console.log(`Published ${t.channel} template for ${t.eventType}`)
    }
    process.exit(0)
}

run().catch((err) => { console.error(err); process.exit(1) })
