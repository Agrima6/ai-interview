import InterviewTemplate from "../models/interviewTemplate.model.js"
import QuestionBank from "../models/questionBank.model.js"
import { resolveConductOrgId } from "../utils/orgProvision.js"

const VALID_ROUND_TYPES = ["HR", "Technical", "Behavioral", "System Design", "Case Study", "Group Discussion", "Managerial Round"]
const VALID_SOURCES = ["bank", "ai-generated", "manual"]
const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"]
// Mirrors the 5-question cap generateQuestion applies to the AI-generated
// path, so a manual round can't push an unbounded number of questions into
// every Interview document created from this template.
const MAX_MANUAL_QUESTIONS = 20

const normalizeRound = async (raw, organizationId) => {
    const name = raw.name?.trim()
    if (!name) throw { status: 400, message: "each round requires a name" }

    const type = VALID_ROUND_TYPES.find((t) => t.toLowerCase() === raw.type?.trim().toLowerCase())
    if (!type) throw { status: 400, message: `invalid round type "${raw.type}" - must be one of ${VALID_ROUND_TYPES.join(", ")}` }

    const questionSource = VALID_SOURCES.find((s) => s === raw.questionSource)
    if (!questionSource) throw { status: 400, message: `invalid questionSource "${raw.questionSource}" - must be one of ${VALID_SOURCES.join(", ")}` }

    let questionBankId = null
    if (questionSource === "bank") {
        if (!raw.questionBankId) throw { status: 400, message: `round "${name}" uses questionSource "bank" but no questionBankId was given` }
        const bank = await QuestionBank.findOne({ _id: raw.questionBankId, organizationId })
        if (!bank) throw { status: 400, message: `question bank ${raw.questionBankId} not found in this organization` }
        questionBankId = bank._id
    }

    let manualQuestions = []
    if (questionSource === "manual") {
        const rawQuestions = Array.isArray(raw.manualQuestions) ? raw.manualQuestions : []
        if (rawQuestions.length > MAX_MANUAL_QUESTIONS) {
            throw { status: 400, message: `round "${name}" has ${rawQuestions.length} manual questions, max is ${MAX_MANUAL_QUESTIONS}` }
        }
        manualQuestions = rawQuestions.map((q) => {
            const text = q.text?.trim()
            if (!text) throw { status: 400, message: `round "${name}" has a manual question with no text` }
            let difficulty = "Medium"
            if (q.difficulty) {
                const matched = VALID_DIFFICULTIES.find((d) => d.toLowerCase() === q.difficulty.trim().toLowerCase())
                if (!matched) throw { status: 400, message: `invalid difficulty "${q.difficulty}"` }
                difficulty = matched
            }
            return {
                text,
                difficulty,
                timeLimitSec: Number(q.timeLimitSec) > 0 ? Number(q.timeLimitSec) : 90,
            }
        })
        if (manualQuestions.length === 0) throw { status: 400, message: `round "${name}" uses questionSource "manual" but has no manualQuestions` }
    }

    let aiGenerationConfig = { role: null, experience: null, skills: [] }
    if (questionSource === "ai-generated") {
        const cfg = raw.aiGenerationConfig || {}
        aiGenerationConfig = {
            role: cfg.role?.trim() || null,
            experience: cfg.experience?.trim() || null,
            skills: Array.isArray(cfg.skills) ? cfg.skills.map((s) => String(s).trim()).filter(Boolean) : [],
        }
    }

    return {
        name,
        type,
        questionSource,
        questionBankId,
        manualQuestions,
        numQuestions: Number(raw.numQuestions) > 0 ? Number(raw.numQuestions) : 5,
        timeLimitPerQuestionSec: Number(raw.timeLimitPerQuestionSec) > 0 ? Number(raw.timeLimitPerQuestionSec) : 90,
        aiGenerationConfig,
    }
}

export const createInterviewTemplate = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" })

        const title = req.body.title?.trim()
        if (!title) return res.status(400).json({ message: "title is required" })

        const rawRounds = Array.isArray(req.body.rounds) ? req.body.rounds : []
        if (rawRounds.length === 0) return res.status(400).json({ message: "at least one round is required" })

        const rounds = []
        for (const raw of rawRounds) {
            rounds.push(await normalizeRound(raw, organizationId))
        }

        const defaultMode = ["practice", "real"].includes(req.body.defaultMode) ? req.body.defaultMode : "real"

        const template = await InterviewTemplate.create({
            organizationId,
            createdBy: req.userId,
            title,
            description: req.body.description?.trim() || null,
            rounds,
            defaultMode,
            isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
        })

        return res.status(201).json(template)
    } catch (error) {
        if (error?.status) return res.status(error.status).json({ message: error.message })
        return res.status(500).json({ message: `failed to create interview template ${error}` })
    }
}

export const listInterviewTemplates = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" })

        const templates = await InterviewTemplate.find({ organizationId })
            .select("title description defaultMode isActive createdBy createdAt rounds")
            .sort({ createdAt: -1 })

        return res.json(templates)
    } catch (error) {
        return res.status(500).json({ message: `failed to list interview templates ${error}` })
    }
}

export const getInterviewTemplate = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        const template = await InterviewTemplate.findOne({ _id: req.params.id, organizationId })
        if (!template) return res.status(404).json({ message: "Interview template not found" })

        return res.json(template)
    } catch (error) {
        return res.status(500).json({ message: `failed to get interview template ${error}` })
    }
}

export const updateInterviewTemplate = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        const template = await InterviewTemplate.findOne({ _id: req.params.id, organizationId })
        if (!template) return res.status(404).json({ message: "Interview template not found" })

        if (req.body.title !== undefined) {
            const title = req.body.title?.trim()
            if (!title) return res.status(400).json({ message: "title cannot be empty" })
            template.title = title
        }
        if (req.body.description !== undefined) template.description = req.body.description?.trim() || null
        if (req.body.defaultMode !== undefined) {
            if (!["practice", "real"].includes(req.body.defaultMode)) return res.status(400).json({ message: "invalid defaultMode" })
            template.defaultMode = req.body.defaultMode
        }
        if (req.body.isActive !== undefined) template.isActive = !!req.body.isActive
        if (Array.isArray(req.body.rounds)) {
            const rounds = []
            for (const raw of req.body.rounds) {
                rounds.push(await normalizeRound(raw, organizationId))
            }
            template.rounds = rounds
        }

        await template.save()
        return res.json(template)
    } catch (error) {
        if (error?.status) return res.status(error.status).json({ message: error.message })
        return res.status(500).json({ message: `failed to update interview template ${error}` })
    }
}

export const deleteInterviewTemplate = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        const template = await InterviewTemplate.findOneAndDelete({ _id: req.params.id, organizationId })
        if (!template) return res.status(404).json({ message: "Interview template not found" })

        return res.json({ message: "Interview template deleted" })
    } catch (error) {
        return res.status(500).json({ message: `failed to delete interview template ${error}` })
    }
}
