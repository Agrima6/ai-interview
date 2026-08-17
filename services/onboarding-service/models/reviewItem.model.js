import mongoose from "mongoose"

const reviewItemSchema = new mongoose.Schema({
    onboardingId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    submissionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sectionKey: { type: String, default: null },
    fieldKey: { type: String, default: null },
    type: { type: String, enum: ["FIELD", "SECTION", "GENERAL"], default: "FIELD" },
    status: { type: String, enum: ["OPEN", "RESOLVED"], default: "OPEN" },
    message: { type: String, required: true },
    createdBy: { type: String, required: true },
    resolvedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.model("ReviewItem", reviewItemSchema)
