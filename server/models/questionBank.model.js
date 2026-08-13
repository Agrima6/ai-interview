import mongoose from "mongoose";

const QUESTION_TYPES = ["HR", "Technical", "Behavioral", "System Design", "Case Study", "Group Discussion", "Managerial Round"]
const DIFFICULTIES = ["Easy", "Medium", "Hard"]
const SOURCES = ["manual", "uploaded", "ai-generated"]

const bankQuestionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: QUESTION_TYPES,
        required: true
    },
    difficulty: {
        type: String,
        enum: DIFFICULTIES,
        default: "Medium"
    },
    skillTags: [{
        type: String
    }],
    expectedDurationSec: {
        type: Number,
        default: 90
    },
    source: {
        type: String,
        enum: SOURCES,
        default: "manual"
    }
}, { _id: true })

const questionBankSchema = new mongoose.Schema({
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
    questions: [bankQuestionSchema]
}, { timestamps: true })

const QuestionBank = mongoose.model("QuestionBank", questionBankSchema)

export default QuestionBank
export { QUESTION_TYPES, DIFFICULTIES, SOURCES }
