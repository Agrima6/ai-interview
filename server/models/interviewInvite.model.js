import mongoose from "mongoose";
import crypto from "crypto";

const INVITE_STATUSES = ["pending", "sent", "opened", "started", "completed", "expired"]

const interviewInviteSchema = new mongoose.Schema({
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InterviewTemplate",
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    candidateEmail: {
        type: String,
        required: true
    },
    candidateName: {
        type: String,
        default: null
    },
    token: {
        type: String,
        unique: true,
        required: true,
        default: () => crypto.randomBytes(32).toString("hex")
    },
    status: {
        type: String,
        enum: INVITE_STATUSES,
        default: "pending"
    },
    expiresAt: {
        type: Date,
        required: true
    },
    interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interview",
        default: null
    },
    // Interview docs from earlier, already-completed rounds of this invite's
    // template - one Interview per round, since each round has its own
    // question set/answers. `interviewId` above always points at the most
    // recent (current) round's Interview.
    roundHistory: [{
        roundIndex: { type: Number, required: true },
        interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
        _id: false
    }],
    sentAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

const InterviewInvite = mongoose.model("InterviewInvite", interviewInviteSchema)

export default InterviewInvite
export { INVITE_STATUSES }
