import mongoose from "mongoose"

const { Schema } = mongoose

// ---- Account: someone who runs online assessments. Approved by a platform super admin (maker-checker). ----
const accountSchema = new Schema({
    orgName: { type: String, required: true, trim: true, maxlength: 120 },
    contactName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true },
    emailNormalized: { type: String, required: true, unique: true, index: true },
    phone: { type: String, trim: true, maxlength: 20, default: null },
    purpose: { type: String, trim: true, maxlength: 500, default: "" },
    passwordHash: { type: String, required: true, select: false },
    // PENDING: submitted by the applicant (maker), waiting for a super admin (checker).
    status: { type: String, enum: ["PENDING", "CHANGES_REQUESTED", "ACTIVE", "REJECTED", "SUSPENDED"], default: "PENDING", index: true },
    review: {
        reviewedBy: { type: String, default: null },
        reviewedAt: { type: Date, default: null },
        note: { type: String, default: "" },
    },
    lastLoginAt: { type: Date, default: null },
    // Set when the account belongs to a platform organization: its admins reach Online Assessment from their own
    // sign-in, with no second password.
    tenantId: { type: String, default: null, index: true },
}, { timestamps: true })

// ---- Drive: one hiring drive. Its rounds are assessments (Round 1, Round 2, ...). ----
const driveSchema = new Schema({
    accountId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: "", maxlength: 2000 },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE", index: true },
}, { timestamps: true })

driveSchema.index({ accountId: 1, createdAt: -1 })

// ---- Assessment: one test, with sections of mixed question types. A multi-round hiring test is several assessments. ----
const questionSchema = new Schema({
    id: { type: String, required: true },
    sectionId: { type: String, required: true },
    type: { type: String, enum: ["MCQ", "MSQ", "SHORT", "LONG", "CODING", "VIDEO"], required: true },
    text: { type: String, required: true },
    options: [{ id: String, text: String, _id: false }],
    correct: [String],
    marks: { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },
    modelAnswer: { type: String, default: "" },
    keywords: [String],
    codeLanguages: [String],
    starterCode: { type: String, default: "" },
    // The organizer's own snippet per language ({ python: "..." }); languages without one get the default snippet.
    starterCodes: { type: Schema.Types.Mixed, default: {} },
    // VIDEO: the longest recording a candidate may upload.
    maxDurationSec: { type: Number, default: 120 },
    testCases: [{ input: String, expected: String, hidden: Boolean, _id: false }],
    difficulty: { type: String, enum: ["EASY", "MEDIUM", "HARD"], default: "MEDIUM" },
    explanation: { type: String, default: "" },
    source: { type: String, enum: ["MANUAL", "UPLOAD", "AI"], default: "MANUAL" },
}, { _id: false })

const assessmentSchema = new Schema({
    accountId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: "", maxlength: 2000 },
    instructions: { type: String, default: "", maxlength: 4000 },
    // DRAFT: being built. PUBLISHED: students can be invited and may sit it. ARCHIVED: hidden.
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true },
    roundLabel: { type: String, default: "", maxlength: 60 },
    previousAssessmentId: { type: Schema.Types.ObjectId, default: null },
    // A round of a drive. TEST: an online test. AI_INTERVIEW: a round handed over to an AI interview drive.
    driveId: { type: Schema.Types.ObjectId, default: null, index: true },
    roundNumber: { type: Number, default: 1 },
    kind: { type: String, enum: ["TEST", "AI_INTERVIEW"], default: "TEST" },
    aiInterviewDriveId: { type: String, default: null },
    // An AI interview taken as part of THIS test round: whoever submits the test is invited to it automatically.
    aiPart: {
        enabled: { type: Boolean, default: false },
        aiInterviewDriveId: { type: String, default: null },
        roundNumber: { type: Number, default: 1 },
    },
    // An open link candidates use to register themselves. Every registration waits for the organizer's approval.
    registration: {
        enabled: { type: Boolean, default: false },
        token: { type: String, unique: true, sparse: true },
        closesAt: { type: Date, default: null },
        maxRegistrations: { type: Number, default: null },
    },
    schedule: {
        // FIXED: everyone starts together. FLEXIBLE: any time inside the window, each candidate gets the full duration.
        // SLOTS (older rounds only): the organizer offered several start times and each student booked one.
        mode: { type: String, enum: ["FIXED", "FLEXIBLE", "SLOTS"], default: "FIXED" },
        slots: [{ id: String, startAt: Date, capacity: { type: Number, default: null }, _id: false }],
        startAt: { type: Date, default: null },
        endAt: { type: Date, default: null },
        durationMinutes: { type: Number, default: 60 },
        lateEntryMinutes: { type: Number, default: 10 },
        timezone: { type: String, default: "Asia/Kolkata" },
    },
    settings: {
        shuffleQuestions: { type: Boolean, default: true },
        shuffleOptions: { type: Boolean, default: true },
        shuffleSections: { type: Boolean, default: false },
        allowBackNavigation: { type: Boolean, default: true },
        passPercent: { type: Number, default: 40, min: 0, max: 100 },
        showResultToStudent: { type: Boolean, default: false },
        // Multiple-correct questions: part marks for some right options and no wrong one.
        partialMarking: { type: Boolean, default: false },
        // AI reads written and coding answers after submission and suggests marks, which the organizer can change.
        aiMarking: { type: Boolean, default: false },
    },
    proctoring: {
        level: { type: String, enum: ["HARD", "STANDARD"], default: "HARD" },
        requireCamera: { type: Boolean, default: true },
        requireScreenShare: { type: Boolean, default: true },
        requireFullscreen: { type: Boolean, default: true },
        faceChecks: { type: Boolean, default: true },
        blockCopyPaste: { type: Boolean, default: true },
        // The candidate must allow location access before starting; it is shown in their report.
        requireLocation: { type: Boolean, default: false },
        maxViolations: { type: Number, default: 5, min: 1, max: 10 },
        snapshotIntervalSec: { type: Number, default: 45, min: 15, max: 300 },
    },
    sections: [{ id: String, title: String, _id: false }],
    questions: [questionSchema],
    publishedAt: { type: Date, default: null },
}, { timestamps: true })

assessmentSchema.index({ accountId: 1, createdAt: -1 })

// ---- Student: a person invited to one assessment. ----
const studentSchema = new Schema({
    accountId: { type: Schema.Types.ObjectId, required: true, index: true },
    assessmentId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true },
    emailNormalized: { type: String, required: true },
    phone: { type: String, trim: true, maxlength: 20, default: null },
    rollNumber: { type: String, trim: true, maxlength: 40, default: "" },
    // The start time this student booked, when the test offers slots.
    slotId: { type: String, default: null },
    slotBookedAt: { type: Date, default: null },
    // Free-form details the admin uploaded with the list (branch, batch, college...).
    details: { type: Map, of: String, default: {} },
    codeHash: { type: String, required: true },
    codeEncrypted: { type: String, required: true },
    // HR adds are approved at once. Someone who registered through the open link waits (PENDING) until approved; until then
    // they cannot sign in and are not emailed their access code.
    approval: {
        status: { type: String, enum: ["APPROVED", "PENDING", "REJECTED"], default: "APPROVED", index: true },
        source: { type: String, enum: ["HR", "SELF"], default: "HR" },
        decidedAt: { type: Date, default: null },
    },
    invite: {
        status: { type: String, enum: ["NOT_SENT", "SENT", "FAILED"], default: "NOT_SENT" },
        sentAt: { type: Date, default: null },
        error: { type: String, default: null },
    },
}, { timestamps: true })

studentSchema.index({ assessmentId: 1, emailNormalized: 1 }, { unique: true })

// ---- Attempt: one student's sitting. ----
const attemptSchema = new Schema({
    accountId: { type: Schema.Types.ObjectId, required: true, index: true },
    assessmentId: { type: Schema.Types.ObjectId, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ["IN_PROGRESS", "SUBMITTED", "AUTO_SUBMITTED", "TERMINATED"], default: "IN_PROGRESS", index: true },
    startedAt: { type: Date, required: true },
    deadline: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    endReason: { type: String, default: null },
    order: { type: Schema.Types.Mixed, required: true },
    answers: { type: Schema.Types.Mixed, default: {} },
    grades: { type: Schema.Types.Mixed, default: {} },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    gradingStatus: { type: String, enum: ["NOT_GRADED", "PENDING_REVIEW", "COMPLETE"], default: "NOT_GRADED" },
    violationCount: { type: Number, default: 0 },
    adminDecision: { type: String, enum: [null, "CLEARED", "DISQUALIFIED"], default: null },
    lastHeartbeatAt: { type: Date, default: null },
    lastSnapshotAt: { type: Date, default: null },
    lastViolation: { kind: { type: String }, at: { type: Date } },
    environment: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    // What happened to this candidate's invitation to the AI interview part of the round (SENT, ALREADY, FAILED).
    aiHandoff: { status: { type: String, default: null }, at: { type: Date, default: null }, error: { type: String, default: null } },
}, { timestamps: true })

attemptSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true })

// ---- Event: a proctoring violation or a periodic webcam snapshot. Kept apart so an attempt stays small. ----
const eventSchema = new Schema({
    attemptId: { type: Schema.Types.ObjectId, required: true, index: true },
    assessmentId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ["VIOLATION", "SNAPSHOT", "INFO"], required: true },
    type: { type: String, required: true, maxlength: 60 },
    detail: { type: String, default: "", maxlength: 300 },
    counted: { type: Boolean, default: false },
    image: { type: String, default: null },
    at: { type: Date, default: Date.now },
})

eventSchema.index({ attemptId: 1, at: 1 })

export const OaAccount = mongoose.model("OaAccount", accountSchema)
export const OaDrive = mongoose.model("OaDrive", driveSchema)
export const OaAssessment = mongoose.model("OaAssessment", assessmentSchema)
export const OaStudent = mongoose.model("OaStudent", studentSchema)
export const OaAttempt = mongoose.model("OaAttempt", attemptSchema)
export const OaEvent = mongoose.model("OaEvent", eventSchema)
