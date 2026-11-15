import crypto from "crypto"
import { ApiError } from "./response.js"

export const QUESTION_TYPES = Object.freeze(["MCQ", "MSQ", "SHORT", "LONG", "CODING"])
export const QUESTION_SOURCES = Object.freeze(["MANUAL", "UPLOAD", "AI"])
export const DIFFICULTIES = Object.freeze(["EASY", "MEDIUM", "HARD"])
export const CODE_LANGUAGES = Object.freeze(["javascript", "python", "java", "cpp", "c", "typescript", "go", "sql"])

const MAX_TEXT = 4000
const MAX_OPTIONS = 8
const MAX_MARKS = 100
const LETTERS = "ABCDEFGH"

export const newId = () => crypto.randomUUID()

const clean = (value, max = MAX_TEXT) => String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max)

const toNumber = (value, fallback) => {
    if (value === "" || value === null || value === undefined) return fallback
    const n = Number(value)
    return Number.isFinite(n) ? n : NaN
}

const asList = (value) => {
    if (Array.isArray(value)) return value
    if (value === undefined || value === null || value === "") return []
    return String(value).split(/[;|]/)
}

// Accepts the shapes real uploads and the AI produce: option strings or {text}, and a correct answer given as an
// index, a letter ("B"), the option's own text, or an id. Anything that cannot be resolved is a validation error,
// never silently dropped - a test with a wrong answer key is worse than a rejected row.
const resolveCorrect = (rawCorrect, options) => {
    const ids = []
    for (const entry of asList(rawCorrect)) {
        const token = typeof entry === "string" ? entry.trim() : entry
        if (token === "" || token === null || token === undefined) continue
        let found = options.find((o) => o.id === token)
        if (!found && typeof token === "number") found = options[token]
        if (!found && typeof token === "string" && /^[A-Ha-h]$/.test(token)) found = options[LETTERS.indexOf(token.toUpperCase())]
        if (!found && typeof token === "string" && /^\d+$/.test(token)) found = options[Number(token)]
        if (!found && typeof token === "string") found = options.find((o) => o.text.toLowerCase() === token.toLowerCase())
        if (!found) return null
        if (!ids.includes(found.id)) ids.push(found.id)
    }
    return ids
}

/**
 * Validate and normalise one question. Throws ApiError(400) with `fields` on the first bad input, so the admin sees
 * what to fix. `sectionIds` is the set of sections that exist on the assessment.
 */
export const normalizeQuestion = (input, { sectionIds = [], defaultSectionId = null, source = "MANUAL" } = {}) => {
    const fields = {}
    const type = clean(input?.type, 10).toUpperCase()
    if (!QUESTION_TYPES.includes(type)) fields.type = `Type must be one of ${QUESTION_TYPES.join(", ")}.`

    const text = clean(input?.text ?? input?.question)
    if (!text) fields.text = "The question text is required."

    let sectionId = clean(input?.sectionId, 80) || defaultSectionId
    if (!sectionId || (sectionIds.length && !sectionIds.includes(sectionId))) sectionId = defaultSectionId
    if (!sectionId) fields.sectionId = "Choose a section."

    const marks = toNumber(input?.marks, 1)
    if (Number.isNaN(marks) || marks <= 0 || marks > MAX_MARKS) fields.marks = `Marks must be between 0 and ${MAX_MARKS}.`
    const negativeMarks = toNumber(input?.negativeMarks ?? input?.negative, 0)
    if (Number.isNaN(negativeMarks) || negativeMarks < 0 || negativeMarks > marks) fields.negativeMarks = "Negative marks must be 0 or more and no larger than the marks."

    const question = {
        id: clean(input?.id, 80) || newId(),
        sectionId, type, text,
        options: [], correct: [],
        marks, negativeMarks: type === "MCQ" || type === "MSQ" ? negativeMarks : 0,
        modelAnswer: "", keywords: [], codeLanguages: [], starterCode: "", testCases: [],
        difficulty: DIFFICULTIES.includes(clean(input?.difficulty, 10).toUpperCase()) ? clean(input?.difficulty, 10).toUpperCase() : "MEDIUM",
        explanation: clean(input?.explanation, 2000),
        source: QUESTION_SOURCES.includes(source) ? source : "MANUAL",
    }

    if (type === "MCQ" || type === "MSQ") {
        const parsed = asList(input?.options)
            .map((o) => ({ text: clean(typeof o === "object" && o !== null ? o.text : o, 500), id: clean(typeof o === "object" && o !== null ? o.id : "", 80) }))
            .filter((o) => o.text)
        if (parsed.length < 2 || parsed.length > MAX_OPTIONS) fields.options = `Give between 2 and ${MAX_OPTIONS} options.`
        else if (new Set(parsed.map((o) => o.text.toLowerCase())).size !== parsed.length) fields.options = "Options must be different from each other."
        else {
            question.options = parsed.map((o) => ({ id: o.id || newId(), text: o.text }))
            const resolved = resolveCorrect(input?.correct ?? input?.answer, question.options)
            if (resolved === null) fields.correct = "The correct answer does not match any option."
            else if (resolved.length === 0) fields.correct = "Mark the correct answer."
            else if (type === "MCQ" && resolved.length !== 1) fields.correct = "A single-answer question has exactly one correct option."
            else question.correct = resolved
        }
    } else if (type === "SHORT" || type === "LONG") {
        question.modelAnswer = clean(input?.modelAnswer ?? input?.answer, 6000)
        question.keywords = asList(input?.keywords).map((k) => clean(k, 60)).filter(Boolean).slice(0, 30)
    } else if (type === "CODING") {
        const languages = asList(input?.codeLanguages ?? input?.languages).map((l) => clean(l, 20).toLowerCase()).filter((l) => CODE_LANGUAGES.includes(l))
        question.codeLanguages = languages.length ? [...new Set(languages)] : ["javascript", "python"]
        question.starterCode = clean(input?.starterCode, 4000)
        question.modelAnswer = clean(input?.modelAnswer ?? input?.answer, 6000)
        question.testCases = (Array.isArray(input?.testCases) ? input.testCases : []).slice(0, 20).map((t) => ({
            input: clean(t?.input, 1000), expected: clean(t?.expected, 1000), hidden: Boolean(t?.hidden),
        })).filter((t) => t.input || t.expected)
    }

    if (Object.keys(fields).length) throw new ApiError(400, "VALIDATION_ERROR", Object.values(fields)[0], fields)
    return question
}

/** Normalise many; reports every bad row (1-based) instead of stopping at the first. */
export const normalizeQuestions = (list, options) => {
    const accepted = []
    const rejected = []
    ;(Array.isArray(list) ? list : []).forEach((item, index) => {
        try { accepted.push(normalizeQuestion(item, options)) } catch (error) {
            rejected.push({ row: index + 1, error: error.message, fields: error.fields || {} })
        }
    })
    return { accepted, rejected }
}

/** What a student is allowed to see: never the answer key, model answer, keywords, explanation or hidden test cases. */
export const studentQuestionView = (question, optionOrder) => {
    const options = optionOrder?.length
        ? optionOrder.map((id) => question.options.find((o) => o.id === id)).filter(Boolean)
        : question.options
    return {
        id: question.id, sectionId: question.sectionId, type: question.type, text: question.text,
        options: options.map((o) => ({ id: o.id, text: o.text })),
        marks: question.marks, negativeMarks: question.negativeMarks,
        multiple: question.type === "MSQ",
        codeLanguages: question.type === "CODING" ? question.codeLanguages : undefined,
        starterCode: question.type === "CODING" ? question.starterCode : undefined,
        sampleCases: question.type === "CODING" ? question.testCases.filter((t) => !t.hidden).map(({ input, expected }) => ({ input, expected })) : undefined,
    }
}
