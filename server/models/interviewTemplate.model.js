import mongoose from "mongoose";

const ROUND_TYPES = ["HR", "Technical", "Behavioral", "System Design", "Case Study", "Group Discussion", "Managerial Round"]
const QUESTION_SOURCES = ["bank", "ai-generated", "manual"]

const manualQuestionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard"],
        default: "Medium"
    },
    timeLimitSec: {
        type: Number,
        default: 90
    }
}, { _id: false })

const roundSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ROUND_TYPES,
        required: true
    },
    questionSource: {
        type: String,
        enum: QUESTION_SOURCES,
        required: true
    },
    questionBankId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionBank",
        default: null
    },
    manualQuestions: [manualQuestionSchema],
    numQuestions: {
        type: Number,
        default: 5
    },
    timeLimitPerQuestionSec: {
        type: Number,
        default: 90
    },
    aiGenerationConfig: {
        role: { type: String, default: null },
        experience: { type: String, default: null },
        skills: [{ type: String }]
    }
}, { _id: true })

const interviewTemplateSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: null
    },
    rounds: [roundSchema],
    defaultMode: {
        type: String,
        enum: ["practice", "real"],
        default: "real"
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

const InterviewTemplate = mongoose.model("InterviewTemplate", interviewTemplateSchema)

export default InterviewTemplate
export { ROUND_TYPES, QUESTION_SOURCES }
