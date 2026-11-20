import mongoose from "mongoose"

// What one organization is charged. key is "DEFAULT" (the platform-wide rate card) or an organization key (its tenant id,
// or "oa:<account id>" for an Online Assessment account that has no platform organization). A field left null means
// "use the default": an organization only stores what is different for it.
const orgBillingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    aiRate: { type: Number, default: null, min: 0, max: 100000 },        // rupees per candidate, AI interview
    oaRate: { type: Number, default: null, min: 0, max: 100000 },        // rupees per candidate, Online Assessment
    // rupees per candidate who gives an Online Assessment AND its linked AI interview: billed once at this rate instead of the two separately
    comboRate: { type: Number, default: null, min: 0, max: 100000 },
    gstPercent: { type: Number, default: null, min: 0, max: 40 },
    // CANDIDATE: each person is billed once per period however many rounds they sat. INTERVIEW: every interview round counts.
    unit: { type: String, enum: ["CANDIDATE", "INTERVIEW", null], default: null },
    notes: { type: String, default: "", maxlength: 500 },
    updatedBy: { type: String, default: null },
}, { timestamps: true })

export default mongoose.model("OrgBilling", orgBillingSchema)
