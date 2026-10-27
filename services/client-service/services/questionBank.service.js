import { QuestionBank } from "../models/questionBank.model.js"
import { ApiError } from "../utils/response.js"
import crypto from "crypto"
import { requireValidObjectId } from "../utils/validateId.js"

const DEFAULT_QUESTION_BANKS = [
    {
        title: "SDE Core Engineering Assessment",
        category: "SOFTWARE_ENGINEERING",
        questionCount: 8,
        durationMinutes: 20,
        isSystemDefault: true,
        questions: [
            { id: "q1", text: "Explain how React reconciles virtual DOM nodes during state updates.", topic: "React & Architecture", timeLimit: 180 },
            { id: "q2", text: "How do you optimize slow database queries in PostgreSQL/MongoDB?", topic: "Database & Backend", timeLimit: 180 },
        ],
    },
    {
        title: "Data Structures & System Architecture",
        category: "SOFTWARE_ENGINEERING",
        questionCount: 6,
        durationMinutes: 18,
        isSystemDefault: true,
        questions: [
            { id: "q3", text: "Design a high-availability URL shortener system for 50M daily active users.", topic: "System Design", timeLimit: 240 },
        ],
    },
    {
        title: "Behavioral & Leadership Competencies",
        category: "HR_OPERATIONS",
        questionCount: 5,
        durationMinutes: 15,
        isSystemDefault: true,
        questions: [
            { id: "q4", text: "Describe a situation where you had to push back on unrealistic product deadlines.", topic: "Leadership & HR", timeLimit: 150 },
        ],
    },
]

// The three built-in sets exist once, platform-wide. Seeding is an upsert keyed on the title, so two requests
// arriving together (or a restart) can never create duplicates.
const ensureSystemDefaults = async () => {
    await QuestionBank.bulkWrite(DEFAULT_QUESTION_BANKS.map((bank) => ({
        updateOne: {
            filter: { isSystemDefault: true, title: bank.title },
            update: { $setOnInsert: bank },
            upsert: true,
        },
    })), { ordered: false })
}

export const listQuestionBanks = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    await ensureSystemDefaults()

    // `tenantId` must be a real, truthy value here: a Mongoose query object with an `undefined` value for a key
    // has that key silently dropped, which would match EVERY tenant's custom banks.
    return QuestionBank.find({
        $or: [{ isSystemDefault: true }, { tenantId }],
    }).sort({ isSystemDefault: -1, createdAt: -1 })
}

const MAX_QUESTIONS = 100
const MAX_TEXT = 2000

// Only known fields are ever taken from the request, and every question is checked: nothing from the client
// (tenantId, isSystemDefault, counts) is trusted.
export const cleanBankInput = (input) => {
    const title = typeof input?.title === "string" ? input.title.trim() : ""
    if (!title) throw new ApiError(400, "MISSING_TITLE", "Question bank title is required.")
    if (title.length > 160) throw new ApiError(400, "TITLE_TOO_LONG", "Title must be 160 characters or fewer.")
    const category = typeof input?.category === "string" ? input.category.trim() : ""
    if (!category) throw new ApiError(400, "MISSING_CATEGORY", "Choose a category.")

    const rawQuestions = Array.isArray(input?.questions) ? input.questions : []
    if (rawQuestions.length > MAX_QUESTIONS) throw new ApiError(400, "TOO_MANY_QUESTIONS", `A set can hold at most ${MAX_QUESTIONS} questions.`)
    const seen = new Set()
    const questions = []
    for (const [index, q] of rawQuestions.entries()) {
        const text = typeof q?.text === "string" ? q.text.trim() : ""
        if (!text) continue                         // blank rows from the form are dropped, not stored
        if (text.length > MAX_TEXT) throw new ApiError(400, "QUESTION_TOO_LONG", `Question ${index + 1} is too long.`)
        const key = text.toLowerCase()
        if (seen.has(key)) throw new ApiError(400, "DUPLICATE_QUESTION", `Question ${index + 1} repeats an earlier question.`)
        seen.add(key)
        const limit = Math.round(Number(q?.timeLimit))
        questions.push({
            id: typeof q?.id === "string" && q.id ? q.id.slice(0, 60) : `q-${crypto.randomBytes(6).toString("hex")}`,
            text,
            topic: (typeof q?.topic === "string" && q.topic.trim() ? q.topic.trim() : "General").slice(0, 120),
            timeLimit: Number.isFinite(limit) ? Math.min(Math.max(limit, 15), 1800) : 120,
        })
    }
    const seconds = questions.reduce((total, q) => total + q.timeLimit, 0)
    return { title, category, questions, questionCount: questions.length, durationMinutes: Math.max(Math.round(seconds / 60), 1) }
}

export const createQuestionBank = async (tenantId, bankData) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    const clean = cleanBankInput(bankData)
    // A double-click (or a retry) must not create the same set twice.
    const existing = await QuestionBank.findOne({ tenantId, isSystemDefault: false, title: clean.title })
    if (existing) throw new ApiError(409, "DUPLICATE_BANK", "You already have a question set with this title.")
    return QuestionBank.create({ ...clean, tenantId, isSystemDefault: false })
}

const findOwnedBank = async (tenantId, id) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(id, "BANK_NOT_FOUND", "Question set not found.")
    const bank = await QuestionBank.findOne({ _id: id, $or: [{ tenantId }, { isSystemDefault: true }] })
    if (!bank) throw new ApiError(404, "BANK_NOT_FOUND", "Question set not found.")
    return bank
}

export const getQuestionBank = (tenantId, id) => findOwnedBank(tenantId, id)

export const updateQuestionBank = async (tenantId, id, input) => {
    const bank = await findOwnedBank(tenantId, id)
    if (bank.isSystemDefault) throw new ApiError(403, "SYSTEM_BANK_READONLY", "Built-in question sets can't be edited. Copy it into a new set instead.")
    const clean = cleanBankInput({ ...bank.toObject(), ...input })
    const clash = await QuestionBank.findOne({ tenantId, isSystemDefault: false, title: clean.title, _id: { $ne: bank._id } })
    if (clash) throw new ApiError(409, "DUPLICATE_BANK", "You already have a question set with this title.")
    Object.assign(bank, clean)
    return bank.save()
}

export const deleteQuestionBank = async (tenantId, id) => {
    const bank = await findOwnedBank(tenantId, id)
    if (bank.isSystemDefault) throw new ApiError(403, "SYSTEM_BANK_READONLY", "Built-in question sets can't be deleted.")
    await bank.deleteOne()
    return { deleted: true }
}
