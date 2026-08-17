import mongoose from "mongoose"

const submissionSchema = new mongoose.Schema({
    onboardingId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    submissionVersion: { type: Number, required: true },
    formVersionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    files: [{ type: mongoose.Schema.Types.Mixed }],
    submittedAt: { type: Date, default: Date.now },
}, { timestamps: false })

submissionSchema.index({ onboardingId: 1, submissionVersion: 1 }, { unique: true })

export default mongoose.model("OnboardingSubmission", submissionSchema)
