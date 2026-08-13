import mongoose from "mongoose";

const questionsSchema = new mongoose.Schema({
     question: String,
  difficulty: String,
  timeLimit: Number,
  answer: String,
  feedback: String,
  score: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
communication: { type: Number, default: 0 },
correctness: { type: Number, default: 0 },
  // Filename (not a full URL) of this answer's audio/video recording under
  // server/uploads/recordings - fetched via GET /api/interview/recording/:interviewId/:questionIndex,
  // which checks ownership before streaming rather than serving the folder statically.
  recordingFile: { type: String, default: null },
})


const rubricScoresSchema = new mongoose.Schema({
    keywordCoverage: { type: Number, default: 0 },
    structureScore: { type: Number, default: 0 },
    timeManagementScore: { type: Number, default: 0 },
    fillerWordRate: { type: Number, default: 0 },
    lengthAppropriateness: { type: Number, default: 0 },
}, { _id: false })

const aiScoreSchema = new mongoose.Schema({
    correctness: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
}, { _id: false })

const perQuestionReportSchema = new mongoose.Schema({
    questionIndex: { type: Number, required: true },
    rubricScores: { type: rubricScoresSchema, default: () => ({}) },
    aiScore: { type: aiScoreSchema, default: () => ({}) },
    weightedFinalScore: { type: Number, default: 0 },
    strengths: [{ type: String }],
    flaws: [{ type: String }],
}, { _id: false })

const reportSchema = new mongoose.Schema({
    resumeAnalysis: {
        matchedSkills: [{ type: String }],
        missingSkills: [{ type: String }],
        gapSummary: { type: String, default: "" },
    },
    perQuestion: [perQuestionReportSchema],
    overallStrengths: [{ type: String }],
    overallFlaws: [{ type: String }],
    recommendation: { type: String, default: "" },
    finalWeightedScore: { type: Number, default: 0 },
}, { _id: false })

const interviewSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    templateId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"InterviewTemplate",
        default:null
    },
    roundIndex:{
        type:Number,
        default:0
    },
    inviteId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"InterviewInvite",
        default:null
    },
    // NOTE: the spec's requested field name `mode` was already taken by the
    // existing interview-type field below (HR/Technical/...), so the
    // practice-vs-real session mode lives here as `sessionMode` instead to
    // avoid breaking every existing caller of `interview.mode`.
    sessionMode:{
        type:String,
        enum:["practice","real"],
        default:"real"
    },
    report:{
        type:reportSchema,
        default:undefined
    },
    role:{
        type:String,
        required:true
    },
    experience:{
        type:String,
        required:true
    },
    mode:{
        type:String,
        enum:["HR", "Technical", "Behavioral", "System Design", "Case Study", "Group Discussion", "Managerial Round"],
        required:true
    },
    language:{
        type:String,
        enum:["English","Hinglish"],
        default:"English"
    },
    resumeText:{
     type:String
    },
    department:{
        type:String,
        default:null
    },
    context:{
        type:String,
        default:null
    },
    questions:[questionsSchema],

    finalScore: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Incompleted", "completed"],
      default: "Incompleted",
    }
},{timestamps:true})

const Interview = mongoose.model("Interview" , interviewSchema)


export default Interview