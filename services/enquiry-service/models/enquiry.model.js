import mongoose from "mongoose"

const enquirySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["ORGANIZATION", "COLLEGE", "CANDIDATE", "OTHER"], default: "OTHER" },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: null, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["NEW", "CONTACTED", "IN_PROGRESS", "PENDING", "COMPLETED"], default: "NEW" },
    assignedTo: { type: String, default: null },
    contactedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
}, { timestamps: true })

enquirySchema.index({ status: 1, createdAt: -1 })
enquirySchema.index({ assignedTo: 1, status: 1 })

export default mongoose.model("Enquiry", enquirySchema)
