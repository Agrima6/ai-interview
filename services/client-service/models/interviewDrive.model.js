import mongoose from "mongoose"

const CustomQuestionSchema = new mongoose.Schema({
    id: { type: String },
    text: { type: String, required: true },
    topic: { type: String, required: true },
    timeLimit: { type: Number, default: 120 },
})

const SkillRubricSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.Mixed },
    name: { type: String, required: true },
    weight: { type: Number, required: true },
})

const CandidateRosterSchema = new mongoose.Schema({
    id: { type: String },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    exp: { type: String },
    aiScore: { type: Number, default: 0 },
    malpracticeFlags: { type: Number, default: 0 },
    status: { type: String, enum: ["INVITED", "SHORTLISTED", "COMPLETED", "REJECTED"], default: "INVITED" },
    attemptedDate: { type: Date },
})

const RoundSchema = new mongoose.Schema({
    roundNumber: { type: Number, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, enum: ["ACTIVE", "COMPLETED", "PENDING"], default: "ACTIVE" },
    expiryDate: { type: Date },
    passingThreshold: { type: Number, default: 70 },
    skillRubrics: [SkillRubricSchema],
    questionMode: { type: String, enum: ["PREBUILT", "CUSTOM"], default: "PREBUILT" },
    questionBankTitle: { type: String },
    customQuestions: [CustomQuestionSchema],
    candidates: [CandidateRosterSchema],
    createdAt: { type: Date, default: Date.now },
})

const InterviewDriveSchema = new mongoose.Schema(
    {
        tenantId: { type: String, required: true, index: true },
        title: { type: String, required: true },
        roleCategory: { type: String, required: true },
        department: { type: String, required: true },
        experienceLevel: { type: String, required: true },
        totalRounds: { type: Number, default: 2 },
        currentRound: { type: Number, default: 1 },
        roundType: { type: String, default: "Technical Round" },
        expiryDate: { type: Date, required: true },
        status: { type: String, enum: ["ACTIVE", "COMPLETED", "DRAFT", "ARCHIVED"], default: "ACTIVE" },
        questionMode: { type: String, enum: ["PREBUILT", "CUSTOM"], default: "PREBUILT" },
        questionBankTitle: { type: String },
        customQuestionsList: [CustomQuestionSchema],
        skillRubrics: [SkillRubricSchema],
        passingThreshold: { type: Number, default: 70 },
        enablePublicLink: { type: Boolean, default: true },
        publicLink: { type: String },
        candidatesCount: { type: Number, default: 0 },
        rounds: [RoundSchema],
    },
    { timestamps: true }
)

InterviewDriveSchema.index({ tenantId: 1, createdAt: -1 })

export const InterviewDrive = mongoose.model("InterviewDrive", InterviewDriveSchema)
