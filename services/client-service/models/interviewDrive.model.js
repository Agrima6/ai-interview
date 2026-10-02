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
    status: { type: String, enum: ["INVITED", "SCHEDULED", "SHORTLISTED", "COMPLETED", "REJECTED"], default: "INVITED" },
    attemptedDate: { type: Date },
    // Demo/showcase candidates only (set by scripts/seed-demo-interview.js): the Start-interview time
    // window (10 min before / 90 min after the slot) never applies, so the same demo can be presented
    // at any time without re-seeding. Never set by any candidate- or recruiter-facing flow.
    demoAlwaysLive: { type: Boolean, default: false },
    // Self-service application data - filled in by the candidate on the
    // public apply page, not by the recruiter.
    resumeFilename: { type: String, default: null },
    resumeOriginalName: { type: String, default: null },
    interviewSlot: { type: Date, default: null },
    // Candidate's chosen interview language - matters most for blue-collar
    // roles where corporate English/formal Hindi isn't a safe default (see
    // workmate-iq-agent's PLAIN_LANGUAGE_ROLE_TYPES). Passed to the agent
    // once when the interview is created.
    preferredLanguage: { type: String, enum: ["en", "hi", "hinglish"], default: "en" },
    // Proctoring evidence captured client-side during the interview (tab
    // switch, fullscreen exit, etc). `malpracticeFlags` stays the quick
    // count HR already sees in the table; this is the detail behind it -
    // reason + timestamp + a webcam snapshot, and for tab/window-switch
    // violations a screen-share snapshot too (shows what they switched to,
    // which a webcam frame of their face can't).
    violations: [{
        reason: { type: String, required: true },
        occurredAt: { type: Date, default: Date.now },
        snapshot: { type: String, default: null },
        screenSnapshot: { type: String, default: null },
    }],
    // Identifiers in the standalone AI-interview agent (workmate-iq-agent,
    // a separate Python/LiveKit service with its own DB) - cached here so
    // a candidate resuming their room doesn't create a duplicate
    // agent-side candidate/interview on every visit.
    agentCandidateId: { type: String, default: null },
    agentInterviewId: { type: String, default: null },
    agentReport: { type: mongoose.Schema.Types.Mixed, default: null },
    // Candidate's own camera/mic feed for the session, captured client-side
    // by MediaRecorder and uploaded on completion - what HR reviews on the
    // org dashboard, distinct from the point-in-time proctoring snapshots above.
    recordingFilename: { type: String, default: null },
    // Audit trail + duplicate-send visibility (integration.md section 32/52)
    // for congratulations/rejection communications sent from the drive
    // detail page - not every invite/reminder, just the round-outcome ones.
    communications: [{
        purpose: { type: String, enum: ["CONGRATULATIONS", "REJECTION"], required: true },
        channel: { type: String, enum: ["EMAIL", "WHATSAPP"], required: true },
        templateId: { type: String },
        // QUEUED -> SENT -> DELIVERED, or FAILED (see utils/communicationPlan.js). Legacy rows are SENT/FAILED.
        status: { type: String, enum: ["QUEUED", "SENT", "DELIVERED", "FAILED"], required: true },
        sentAt: { type: Date, default: Date.now },      // when the request was made
        communicationId: { type: String },              // the communication-service record, for status refresh
        idempotencyKey: { type: String },               // one UI action = one key: a repeat is ignored
        error: { type: String },
        updatedAt: { type: Date },
    }],
})

const RoundSchema = new mongoose.Schema({
    roundNumber: { type: Number, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, enum: ["ACTIVE", "COMPLETED", "PENDING", "DRAFT"], default: "ACTIVE" },
    startDate: { type: Date },
    expiryDate: { type: Date },
    passingThreshold: { type: Number, default: 70 },
    skillRubrics: [SkillRubricSchema],
    // What the candidate must share (see utils/interviewMode.js). Unset = inherit the drive's mode.
    interviewMode: { type: String, enum: ["VOICE", "VIDEO", "SCREEN"] },
    questionMode: { type: String, enum: ["PREBUILT", "CUSTOM"], default: "PREBUILT" },
    questionBankTitle: { type: String },
    questionBankId: { type: String, default: null },
    questions: [CustomQuestionSchema],
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
        startDate: { type: Date },
        expiryDate: { type: Date, required: true },
        status: { type: String, enum: ["ACTIVE", "COMPLETED", "DRAFT", "ARCHIVED"], default: "ACTIVE" },
        questionMode: { type: String, enum: ["PREBUILT", "CUSTOM"], default: "PREBUILT" },
        questionBankTitle: { type: String },
        questionBankId: { type: String, default: null },
        questions: [CustomQuestionSchema],
        customQuestionsList: [CustomQuestionSchema],
        skillRubrics: [SkillRubricSchema],
        passingThreshold: { type: Number, default: 70 },
        // VOICE = mic only, VIDEO = mic + camera, SCREEN = mic + camera + screen (default; matches current proctoring).
        interviewMode: { type: String, enum: ["VOICE", "VIDEO", "SCREEN"], default: "SCREEN" },
        enablePublicLink: { type: Boolean, default: true },
        communicationSettings: { type: mongoose.Schema.Types.Mixed, default: null },
        publicLink: { type: String },
        candidatesCount: { type: Number, default: 0 },
        // Cached agent-service "role" id (see CandidateRosterSchema above) -
        // one per drive, shared by every candidate/round on it so they all
        // face the same standardized question set for the same job.
        agentRoleId: { type: String, default: null },
        // Interview scheduling policy for this drive (see utils/slotPolicy.js). Every field optional: unset = env/defaults.
        availability: {
            timezone: { type: String }, dayStart: { type: String }, dayEnd: { type: String },
            intervalMinutes: { type: Number }, durationMinutes: { type: Number }, bufferMinutes: { type: Number },
            minNoticeMinutes: { type: Number }, maxConcurrent: { type: Number },
            blockedPeriods: [{ start: Date, end: Date, reason: String }],
        },
        rounds: [RoundSchema],
    },
    { timestamps: true }
)

InterviewDriveSchema.index({ tenantId: 1, createdAt: -1 })
InterviewDriveSchema.index({ publicLink: 1 }, { unique: true, sparse: true })
InterviewDriveSchema.index({ tenantId: 1, status: 1 })
InterviewDriveSchema.index({ tenantId: 1, department: 1 })       // hiring-analytics filters
InterviewDriveSchema.index({ "rounds.candidates.email": 1 })

export const InterviewDrive = mongoose.model("InterviewDrive", InterviewDriveSchema)
