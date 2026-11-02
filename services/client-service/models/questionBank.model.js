import mongoose from "mongoose"

const QuestionItemSchema = new mongoose.Schema({
    id: { type: String },
    text: { type: String, required: true },
    topic: { type: String, required: true },
    timeLimit: { type: Number, default: 120 },
})

const QuestionBankSchema = new mongoose.Schema(
    {
        tenantId: { type: String, index: true }, // null for default platform-wide question banks
        title: { type: String, required: true },
        category: { type: String, required: true },
        // Drive roles this set is the natural choice for (built-in blue-collar sets); empty for every other set.
        roleCategories: { type: [String], default: [] },
        questionCount: { type: Number, default: 5 },
        durationMinutes: { type: Number, default: 20 },
        isSystemDefault: { type: Boolean, default: false },
        questions: [QuestionItemSchema],
    },
    { timestamps: true }
)

QuestionBankSchema.index({ tenantId: 1, category: 1 })

export const QuestionBank = mongoose.model("QuestionBank", QuestionBankSchema)
