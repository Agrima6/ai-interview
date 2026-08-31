import { QuestionBank } from "../models/questionBank.model.js"
import { ApiError } from "../utils/response.js"

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

export const listQuestionBanks = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    // Return both system default question banks and organization custom
    // question banks - `tenantId` must be a real, truthy value here: a
    // Mongoose query object with an `undefined` value for a key has that
    // key silently dropped, so `{ $or: [{isSystemDefault:true}, {tenantId:
    // undefined}] }` would have matched EVERY tenant's custom banks, not
    // "none", if this guard weren't here.
    const banks = await QuestionBank.find({
        $or: [{ isSystemDefault: true }, { tenantId }],
    }).sort({ isSystemDefault: -1, createdAt: -1 })

    if (banks.length === 0) {
        const seeded = await QuestionBank.insertMany(DEFAULT_QUESTION_BANKS)
        return seeded
    }

    return banks
}

export const createQuestionBank = async (tenantId, bankData) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    if (!bankData.title) throw new ApiError(400, "MISSING_TITLE", "Question bank title is required.")

    const newBank = new QuestionBank({
        ...bankData,
        tenantId,
        isSystemDefault: false,
    })

    return await newBank.save()
}
