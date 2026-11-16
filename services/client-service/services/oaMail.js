import { communicationServiceClient } from "../config/internalClients.js"

const baseUrl = () => (process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "")

export const oaUrl = (path) => `${baseUrl()}${path}`

/**
 * Sends one OA email through communication-service. Never throws: a mail outage must not fail registration, an
 * approval or a draft - the caller gets { ok, error } and decides what to show.
 */
export const sendOaEmail = async ({ accountId, to, subject, body, eventType, metadata }) => {
    try {
        await communicationServiceClient.send({
            entityType: "CLIENT", entityId: String(accountId), channel: "EMAIL",
            eventType, recipient: to, subject, body, variables: {}, metadata: metadata || {},
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

export const inviteEmail = ({ assessment, student, code, orgName }) => {
    const { schedule } = assessment
    const link = oaUrl(`/oa/exam?a=${assessment._id}&e=${encodeURIComponent(student.email)}`)
    const tz = schedule.timezone || "Asia/Kolkata"
    const slotted = schedule.mode === "SLOTS"
    const when = slotted
        ? [
            "Pick your own time. These start times are available:",
            ...[...schedule.slots].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)).map((slot) => `  - ${dateFormat(slot.startAt, tz)} (${tz})`),
            `Duration: ${schedule.durationMinutes} minutes`,
            "You choose one after you sign in, and can change it until 30 minutes before it starts.",
        ]
        : schedule.mode === "FLEXIBLE"
            ? [
                `Open from: ${dateFormat(schedule.startAt, tz)} (${tz})`,
                `Open until: ${dateFormat(schedule.endAt, tz)} (${tz})`,
                `Duration: ${schedule.durationMinutes} minutes, once you start`,
                "There is no fixed time. Take it whenever suits you inside this window, day or night.",
            ]
            : [
                `Starts: ${dateFormat(schedule.startAt, tz)} (${tz})`,
                `Duration: ${schedule.durationMinutes} minutes`,
                `Closes: ${dateFormat(schedule.endAt, tz)} (${tz})`,
            ]
    const round = assessment.roundNumber ? `Round ${assessment.roundNumber}${assessment.roundLabel ? ` (${assessment.roundLabel})` : ""}` : ""
    const needsLocation = Boolean(assessment.proctoring?.requireLocation)
    return {
        subject: `You're invited: ${assessment.title}`,
        body: [
            `Hello ${student.name},`,
            "",
            `${orgName} has invited you to take ${round ? `${round} of ` : "an online assessment: "}${assessment.title}.`,
            "",
            ...when,
            "",
            "To sit the test:",
            `1. Open ${link}`,
            `2. Sign in with this email address and your access code: ${code}`,
            ...(slotted ? ["3. Choose your time slot."] : []),
            "",
            "Before the test, please:",
            "- Use a laptop or desktop with a working webcam, in the latest Chrome or Edge.",
            "- Sit in a quiet, well-lit room. You will be asked to share your entire screen and stay in full screen.",
            "- Close every other app, tab and monitor. Leaving the test window, switching tabs or exiting full screen is recorded and can end your attempt.",
            ...(needsLocation ? ["- Allow your browser to share your location when asked. Your organizer needs it to start."] : []),
            ...(schedule.mode === "FLEXIBLE" ? ["- Run the system check before you begin, and start only when you can finish without a break."] : ["- Join a few minutes early. You can run the system check from 15 minutes before the start."]),
            "",
            "Your access code is personal. Please do not share it.",
            "",
            "Good luck!",
        ].join("\n"),
    }
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
