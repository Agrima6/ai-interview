import fs from "fs"
import QuestionBank from "../models/questionBank.model.js"
import { resolveConductOrgId } from "../utils/orgProvision.js"

const VALID_TYPES = ["HR", "Technical", "Behavioral", "System Design", "Case Study", "Group Discussion", "Managerial Round"]
const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"]

const normalizeQuestion = (raw, defaultSource = "manual") => {
    const text = raw.text?.trim()
    if (!text) return null

    const type = VALID_TYPES.find((t) => t.toLowerCase() === raw.type?.trim().toLowerCase())
    if (!type) throw { status: 400, message: `invalid question type "${raw.type}" - must be one of ${VALID_TYPES.join(", ")}` }

    let difficulty = "Medium"
    if (raw.difficulty) {
        const matched = VALID_DIFFICULTIES.find((d) => d.toLowerCase() === raw.difficulty.trim().toLowerCase())
        if (!matched) throw { status: 400, message: `invalid difficulty "${raw.difficulty}" - must be one of ${VALID_DIFFICULTIES.join(", ")}` }
        difficulty = matched
    }

    const skillTags = Array.isArray(raw.skillTags)
        ? raw.skillTags.map((s) => String(s).trim()).filter(Boolean)
        : (typeof raw.skillTags === "string" ? raw.skillTags.split(",").map((s) => s.trim()).filter(Boolean) : [])

    return {
        text,
        type,
        difficulty,
        skillTags,
        expectedDurationSec: Number(raw.expectedDurationSec) > 0 ? Number(raw.expectedDurationSec) : 90,
        source: ["manual", "uploaded", "ai-generated"].includes(raw.source) ? raw.source : defaultSource,
    }
}

export const createQuestionBank = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" })

        const title = req.body.title?.trim()
        if (!title) return res.status(400).json({ message: "title is required" })

        const rawQuestions = Array.isArray(req.body.questions) ? req.body.questions : []
        const questions = []
        for (const raw of rawQuestions) {
            const q = normalizeQuestion(raw, "manual")
            if (q) questions.push(q)
        }

        const bank = await QuestionBank.create({
            organizationId,
            createdBy: req.userId,
            title,
            questions,
        })

        return res.status(201).json(bank)
    } catch (error) {
        if (error?.status) return res.status(error.status).json({ message: error.message })
        return res.status(500).json({ message: `failed to create question bank ${error}` })
    }
}

// Parses an uploaded .txt/.csv file of questions into a new QuestionBank.
// Expected format: one question per line, optionally CSV-style
// `text,type,difficulty,skillTag1|skillTag2,expectedDurationSec`.
export const uploadQuestionBank = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "File required" })
        const filepath = req.file.path

        const organizationId = await resolveConductOrgId(req)
        if (!organizationId) {
            fs.unlinkSync(filepath)
            return res.status(400).json({ message: "organizationId is required" })
        }

        const title = req.body.title?.trim()
        if (!title) {
            fs.unlinkSync(filepath)
            return res.status(400).json({ message: "title is required" })
        }

        const defaultType = VALID_TYPES.find((t) => t.toLowerCase() === req.body.defaultType?.trim().toLowerCase()) || "Technical"

        const raw = await fs.promises.readFile(filepath, "utf-8")
        fs.unlinkSync(filepath)

        const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

        const questions = []
        for (const line of lines) {
            const parts = line.split(",").map((p) => p.trim())
            const [text, type, difficulty, skillTagsRaw, expectedDurationSec] = parts

            let q
            try {
                q = normalizeQuestion({
                    text: text || line,
                    type: type || defaultType,
                    difficulty,
                    skillTags: skillTagsRaw ? skillTagsRaw.split("|").map((s) => s.trim()) : [],
                    expectedDurationSec,
                }, "uploaded")
            } catch {
                // Line 1 - just a plain question with no CSV structure; fall back
                // to the whole line as text with the default type.
                q = normalizeQuestion({ text: line, type: defaultType }, "uploaded")
            }
            if (q) questions.push(q)
        }

        if (questions.length === 0) {
            return res.status(422).json({ message: "No valid questions found in the uploaded file." })
        }

        const bank = await QuestionBank.create({
            organizationId,
            createdBy: req.userId,
            title,
            questions,
        })

        return res.status(201).json(bank)
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path)
        }
        return res.status(500).json({ message: `failed to upload question bank ${error}` })
    }
}

export const listQuestionBanks = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" })

        const banks = await QuestionBank.find({ organizationId })
            .select("title createdBy createdAt")
            .sort({ createdAt: -1 })

        return res.json(banks)
    } catch (error) {
        return res.status(500).json({ message: `failed to list question banks ${error}` })
    }
}

export const getQuestionBank = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        const bank = await QuestionBank.findOne({ _id: req.params.id, organizationId })
        if (!bank) return res.status(404).json({ message: "Question bank not found" })

        return res.json(bank)
    } catch (error) {
        return res.status(500).json({ message: `failed to get question bank ${error}` })
    }
}

export const updateQuestionBank = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        const bank = await QuestionBank.findOne({ _id: req.params.id, organizationId })
        if (!bank) return res.status(404).json({ message: "Question bank not found" })

        if (req.body.title !== undefined) {
            const title = req.body.title?.trim()
            if (!title) return res.status(400).json({ message: "title cannot be empty" })
            bank.title = title
        }

        if (Array.isArray(req.body.questions)) {
            const questions = []
            for (const raw of req.body.questions) {
                const q = normalizeQuestion(raw, raw.source || "manual")
                if (q) questions.push(q)
            }
            bank.questions = questions
        }

        await bank.save()
        return res.json(bank)
    } catch (error) {
        if (error?.status) return res.status(error.status).json({ message: error.message })
        return res.status(500).json({ message: `failed to update question bank ${error}` })
    }
}

export const deleteQuestionBank = async (req, res) => {
    try {
        const organizationId = await resolveConductOrgId(req)
        const bank = await QuestionBank.findOneAndDelete({ _id: req.params.id, organizationId })
        if (!bank) return res.status(404).json({ message: "Question bank not found" })

        return res.json({ message: "Question bank deleted" })
    } catch (error) {
        return res.status(500).json({ message: `failed to delete question bank ${error}` })
    }
}
