import crypto from "crypto"
import InterviewInvite from "../models/interviewInvite.model.js"
import InterviewTemplate from "../models/interviewTemplate.model.js"
import QuestionBank from "../models/questionBank.model.js"
import Interview from "../models/interview.model.js"
import { sendInterviewInvite } from "../services/email.service.js"
import { askAi } from "../services/ai.service.js"
import { resolveConductOrgId } from "../utils/orgProvision.js"

// Picks up to `count` random questions from the bank (Fisher-Yates partial shuffle).
const pickRandom = (arr, count) => {
    const pool = [...arr]
    const picked = []
    while (pool.length && picked.length < count) {
        const i = Math.floor(Math.random() * pool.length)
        picked.push(pool.splice(i, 1)[0])
    }
    return picked
}

const buildQuestionsForRound = async (round) => {
    if (round.questionSource === "manual") {
        return round.manualQuestions.map((q) => ({
            question: q.text,
            difficulty: q.difficulty,
            timeLimit: q.timeLimitSec,
        }))
    }

    if (round.questionSource === "bank") {
        if (!round.questionBankId) {
            throw Object.assign(new Error("This round has no question bank configured."), { status: 400 })
        }
        const bank = await QuestionBank.findById(round.questionBankId)
        if (!bank || bank.questions.length === 0) {
            throw Object.assign(new Error("The question bank for this round is empty or missing."), { status: 400 })
        }
        const pool = bank.questions.filter((q) => q.type === round.type)
        const selected = pickRandom(pool.length ? pool : bank.questions, round.numQuestions || 5)
        if (selected.length === 0) {
            throw Object.assign(new Error("Could not select questions from the bank for this round."), { status: 400 })
        }
        return selected.map((q) => ({
            question: q.text,
            difficulty: q.difficulty,
            timeLimit: q.expectedDurationSec || round.timeLimitPerQuestionSec,
        }))
    }

    if (round.questionSource === "ai-generated") {
        const { role, experience, skills } = round.aiGenerationConfig || {}
        if (!role) {
            throw Object.assign(new Error("This round's AI question config is missing a role."), { status: 400 })
        }
        const count = round.numQuestions || 5
        const messages = [
            {
                role: "system",
                content: `You are a professional interviewer. Generate exactly ${count} interview questions for a ${round.type} round.
Strict Rules:
- Each question must be a single complete sentence, 15-25 words.
- Do NOT number them, do NOT add explanations or extra text.
- One question per line only.`
            },
            {
                role: "user",
                content: `Role: ${role}\nExperience: ${experience || "Not specified"}\nSkills: ${(skills || []).join(", ") || "None"}`
            }
        ]
        const aiResponse = await askAi(messages)
        const lines = (aiResponse || "").split("\n").map((q) => q.trim()).filter(Boolean).slice(0, count)
        if (lines.length === 0) {
            throw Object.assign(new Error("AI failed to generate questions for this round."), { status: 502 })
        }
        return lines.map((q) => ({
            question: q,
            difficulty: "Medium",
            timeLimit: round.timeLimitPerQuestionSec,
        }))
    }

    throw Object.assign(new Error(`Unknown question source "${round.questionSource}".`), { status: 400 })
}

const DEFAULT_EXPIRY_DAYS = 7

export const createInvite = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" })

        const { templateId } = req.body
        const candidateEmail = req.body.candidateEmail?.trim().toLowerCase()
        const candidateName = req.body.candidateName?.trim() || null

        if (!templateId || !candidateEmail) {
            return res.status(400).json({ message: "templateId and candidateEmail are required" })
        }

        const template = await InterviewTemplate.findOne({ _id: templateId, organizationId })
        if (!template) return res.status(404).json({ message: "Interview template not found" })

        let expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        if (req.body.expiresAt) {
            const parsed = new Date(req.body.expiresAt)
            // An invalid or past date must not silently become an invite that
            // never expires (Invalid Date < anything is always false).
            if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
                return res.status(400).json({ message: "expiresAt must be a valid future date" })
            }
            expiresAt = parsed
        }

        const invite = await InterviewInvite.create({
            templateId: template._id,
            organizationId,
            invitedBy: req.userId,
            candidateEmail,
            candidateName,
            token: crypto.randomBytes(32).toString("hex"),
            expiresAt,
            status: "pending",
        })

        try {
            await sendInterviewInvite(invite, template)
            invite.status = "sent"
            invite.sentAt = new Date()
            invite.lastEmailError = null
            await invite.save()
        } catch (emailError) {
            // Invite record still exists (status stays "pending") even if the
            // email failed to send - caller can retry/resend rather than losing it.
            const detail = emailError.response || emailError.message || String(emailError)
            console.error("Failed to send invite email:", detail)
            invite.lastEmailError = String(detail).slice(0, 500)
            await invite.save()
            return res.status(201).json({ invite, warning: `Invite created but the email failed to send: ${invite.lastEmailError}` })
        }

        return res.status(201).json({ invite })
    } catch (error) {
        return res.status(500).json({ message: `failed to create invite ${error}` })
    }
}

// Retries sending the email for an existing invite (e.g. after fixing SMTP
// config) without creating a new token/invite record.
export const resendInvite = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        const invite = await InterviewInvite.findOne({ _id: req.params.id, organizationId }).populate("templateId")
        if (!invite) return res.status(404).json({ message: "Invite not found" })
        if (invite.status === "completed") {
            return res.status(409).json({ message: "This invite has already been completed." })
        }

        try {
            await sendInterviewInvite(invite, invite.templateId)
            invite.status = "sent"
            invite.sentAt = new Date()
            invite.lastEmailError = null
            await invite.save()
            return res.json({ invite })
        } catch (emailError) {
            const detail = emailError.response || emailError.message || String(emailError)
            console.error("Failed to resend invite email:", detail)
            invite.lastEmailError = String(detail).slice(0, 500)
            await invite.save()
            return res.status(502).json({ message: `Failed to send: ${invite.lastEmailError}` })
        }
    } catch (error) {
        return res.status(500).json({ message: `failed to resend invite ${error}` })
    }
}

export const listInvites = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" })

        const invites = await InterviewInvite.find({ organizationId })
            .populate("templateId", "title")
            .sort({ createdAt: -1 })

        return res.json(invites)
    } catch (error) {
        return res.status(500).json({ message: `failed to list invites ${error}` })
    }
}

// Public - no auth. Used by the candidate landing page to show what
// interview they're about to take before they start it.
export const getInviteByToken = async (req, res) => {
    try {
        const invite = await InterviewInvite.findOne({ token: req.params.token })
            .populate("templateId", "title description defaultMode rounds")
        if (!invite) return res.status(404).json({ message: "Invite not found" })

        if (invite.status !== "completed" && invite.status !== "expired" && invite.expiresAt < new Date()) {
            invite.status = "expired"
            await invite.save()
        }

        if (invite.status === "pending" || invite.status === "sent") {
            invite.status = "opened"
            await invite.save()
        }

        return res.json({
            status: invite.status,
            candidateEmail: invite.candidateEmail,
            candidateName: invite.candidateName,
            expiresAt: invite.expiresAt,
            template: invite.templateId,
            interviewId: invite.interviewId,
        })
    } catch (error) {
        return res.status(500).json({ message: `failed to get invite ${error}` })
    }
}

// The app currently requires Firebase auth (isAuth) for every interview, with
// no guest/unauthenticated candidate flow anywhere else in the codebase - so
// this keeps that same requirement rather than inventing a parallel identity
// path. The candidate must be signed in; the invite just links to whichever
// account is signed in when they start it.
export const startInterviewFromInvite = async (req, res) => {
    try {
        const invite = await InterviewInvite.findOne({ token: req.params.token }).populate("templateId")
        if (!invite) return res.status(404).json({ message: "Invite not found" })

        if (invite.status === "completed") {
            return res.status(409).json({ message: "This interview invite has already been completed." })
        }
        if (invite.status === "expired" || invite.expiresAt < new Date()) {
            invite.status = "expired"
            await invite.save()
            return res.status(410).json({ message: "This interview invite has expired." })
        }
        if (invite.interviewId) {
            return res.status(200).json({ interviewId: invite.interviewId })
        }

        const template = invite.templateId
        if (!template || !template.isActive) {
            return res.status(400).json({ message: "This invite's interview template is no longer available." })
        }

        const round = template.rounds[0]
        if (!round) return res.status(400).json({ message: "Interview template has no rounds configured." })

        let questions
        try {
            questions = await buildQuestionsForRound(round)
        } catch (roundError) {
            return res.status(roundError.status || 400).json({ message: roundError.message })
        }

        const interview = await Interview.create({
            userId: req.userId,
            templateId: template._id,
            inviteId: invite._id,
            roundIndex: 0,
            sessionMode: template.defaultMode || "real",
            role: round.aiGenerationConfig?.role || round.name,
            experience: round.aiGenerationConfig?.experience || "Not specified",
            mode: round.type,
            questions,
        })

        invite.status = "started"
        invite.interviewId = interview._id
        await invite.save()

        return res.status(201).json({ interviewId: interview._id })
    } catch (error) {
        return res.status(500).json({ message: `failed to start interview from invite ${error}` })
    }
}

// Called once the candidate finishes the current round's Interview. Moves the
// invite on to the next round in the template (creating a fresh Interview for
// it), or marks the whole invite completed if that was the last round.
export const advanceToNextRound = async (req, res) => {
    try {
        const invite = await InterviewInvite.findOne({ token: req.params.token }).populate("templateId")
        if (!invite) return res.status(404).json({ message: "Invite not found" })

        if (!invite.interviewId) {
            return res.status(400).json({ message: "This invite hasn't started an interview yet." })
        }

        const currentInterview = await Interview.findById(invite.interviewId)
        if (!currentInterview) {
            return res.status(404).json({ message: "Current round's interview not found." })
        }
        if (currentInterview.status !== "completed") {
            return res.status(400).json({ message: "Finish the current round before advancing." })
        }

        const template = invite.templateId
        if (!template || !template.isActive) {
            return res.status(400).json({ message: "This invite's interview template is no longer available." })
        }

        const nextRoundIndex = currentInterview.roundIndex + 1

        invite.roundHistory.push({ roundIndex: currentInterview.roundIndex, interviewId: currentInterview._id })

        if (nextRoundIndex >= template.rounds.length) {
            invite.status = "completed"
            await invite.save()
            return res.status(200).json({ done: true, message: "All rounds completed." })
        }

        const round = template.rounds[nextRoundIndex]

        let questions
        try {
            questions = await buildQuestionsForRound(round)
        } catch (roundError) {
            return res.status(roundError.status || 400).json({ message: roundError.message })
        }

        const nextInterview = await Interview.create({
            userId: currentInterview.userId,
            templateId: template._id,
            inviteId: invite._id,
            roundIndex: nextRoundIndex,
            sessionMode: currentInterview.sessionMode,
            role: round.aiGenerationConfig?.role || round.name,
            experience: round.aiGenerationConfig?.experience || "Not specified",
            mode: round.type,
            questions,
        })

        invite.interviewId = nextInterview._id
        await invite.save()

        return res.status(201).json({ done: false, interviewId: nextInterview._id, roundIndex: nextRoundIndex, totalRounds: template.rounds.length })
    } catch (error) {
        return res.status(500).json({ message: `failed to advance to next round ${error}` })
    }
}
