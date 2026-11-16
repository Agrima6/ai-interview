import { communicationServiceClient } from "../config/internalClients.js"
import { renderEmailHtml } from "../utils/oaEmailHtml.js"

const baseUrl = () => (process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "")

export const oaUrl = (path) => `${baseUrl()}${path}`

/**
 * Sends one OA email through communication-service. Never throws: a mail outage must not fail registration, an
 * approval or a draft - the caller gets { ok, error } and decides what to show.
 */
export const sendOaEmail = async ({ accountId, to, subject, body, html, eventType, metadata }) => {
    try {
        await communicationServiceClient.send({
            entityType: "CLIENT", entityId: String(accountId), channel: "EMAIL",
            eventType, recipient: to, subject, body, ...(html ? { html } : {}), variables: {}, metadata: metadata || {},
        })
        return { ok: true }
    } catch (error) {
        console.error(`[client-service] OA email (${eventType}) to ${to} failed:`, error.message)
        return { ok: false, error: error.code || error.message }
    }
}

const dateFormat = (date, timeZone) => {
    try {
        return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: timeZone || "Asia/Kolkata" }).format(new Date(date))
    } catch {
        return new Date(date).toISOString()
    }
}

export const inviteEmail = ({ assessment, student, code, orgName, brand }) => {
    const { schedule } = assessment
    const link = oaUrl(`/oa/exam?a=${assessment._id}&e=${encodeURIComponent(student.email)}`)
    const tz = schedule.timezone || "Asia/Kolkata"
    const slotted = schedule.mode === "SLOTS"
    const flexible = schedule.mode === "FLEXIBLE"
    // The schedule, as label/value pairs (shown as a table in the designed email and as lines in the plain text).
    const details = slotted
        ? [
            ["Pick your own time", "These start times are available. You choose one after you sign in, and can change it until 30 minutes before it starts."],
            ...[...schedule.slots].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)).map((slot, i) => [i === 0 ? "Available times" : "", `${dateFormat(slot.startAt, tz)} (${tz})`]),
            ["Duration", `${schedule.durationMinutes} minutes`],
        ]
        : flexible
            ? [
                ["Open from", `${dateFormat(schedule.startAt, tz)} (${tz})`],
                ["Open until", `${dateFormat(schedule.endAt, tz)} (${tz})`],
                ["Duration", `${schedule.durationMinutes} minutes, once you start`],
                ["Timing", "No fixed time. Take it whenever suits you inside this window, day or night."],
            ]
            : [
                ["Starts", `${dateFormat(schedule.startAt, tz)} (${tz})`],
                ["Duration", `${schedule.durationMinutes} minutes`],
                ["Closes", `${dateFormat(schedule.endAt, tz)} (${tz})`],
            ]
    const round = assessment.roundNumber ? `Round ${assessment.roundNumber}${assessment.roundLabel ? ` (${assessment.roundLabel})` : ""}` : ""
    const needsLocation = Boolean(assessment.proctoring?.requireLocation)
    const intro = `${orgName} has invited you to take ${round ? `${round} of ` : "an online assessment: "}${assessment.title}.`
    const steps = [`Open the link below.`, `Sign in with this email address and your access code.`, ...(slotted ? ["Choose your time slot."] : []), "Complete the system check, then start."]
    const notes = [
        "Use a laptop or desktop with a working webcam, in the latest Chrome or Edge.",
        "Sit in a quiet, well-lit room. You will be asked to share your entire screen and stay in full screen.",
        "Close every other app, tab and monitor. Leaving the test window, switching tabs or exiting full screen is recorded and can end your attempt.",
        ...(needsLocation ? ["Allow your browser to share your location when asked. Your organizer needs it to start."] : []),
        flexible ? "Run the system check before you begin, and start only when you can finish without a break." : "Join a few minutes early. You can run the system check from 15 minutes before the start.",
    ]

    // Plain text: the fallback for mail apps that show no HTML.
    const body = [
        `Hello ${student.name},`, "", intro, "",
        ...details.map(([label, value]) => (label && label !== "Available times" ? `${label}: ${value}` : `  - ${value}`)), "",
        "To sit the test:",
        `1. Open ${link}`,
        `2. Sign in with this email address and your access code: ${code}`,
        ...(slotted ? ["3. Choose your time slot."] : []),
        "", "Before the test, please:", ...notes.map((n) => `- ${n}`), "",
        "Your access code is personal. Please do not share it.", "", "Good luck!",
    ].join("\n")

    const html = renderEmailHtml({
        brand: brand || { name: orgName },
        preheader: `${intro} Your access code is inside.`,
        heading: "You are invited to take a test",
        greeting: `Hello ${student.name},`,
        paragraphs: [intro],
        details,
        code, steps, cta: { label: "Open my test", url: link }, notes,
        footer: "Good luck!",
    })
    return { subject: `You're invited: ${assessment.title}`, body, html }
}

export const decisionEmail = ({ orgName, contactName, decision, note }) => {
    if (decision === "ACTIVE") {
        return {
            subject: "Your Online Assessment account is approved",
            body: [`Hello ${contactName},`, "", `${orgName} has been approved for Online Assessment.`, "", `Sign in: ${oaUrl("/oa/login")}`, "", "Use the email and password you registered with."].join("\n"),
        }
    }
    if (decision === "CHANGES_REQUESTED") {
        return {
            subject: "Online Assessment registration: changes needed",
            body: [`Hello ${contactName},`, "", `We reviewed the registration for ${orgName} and need a change before approving it:`, "", note || "(no details given)", "", `Update and resubmit: ${oaUrl("/oa/register")}`].join("\n"),
        }
    }
    return {
        subject: "Online Assessment registration: not approved",
        body: [`Hello ${contactName},`, "", `We could not approve the registration for ${orgName}.`, note ? `\nReason: ${note}` : "", "", "If you think this is a mistake, reply to this email."].join("\n"),
    }
}
