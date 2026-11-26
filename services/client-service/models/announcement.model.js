import mongoose from "mongoose"

// A message the platform owner puts on every organization's dashboard for a stretch of time ("we launched a new service").
const announcementSchema = new mongoose.Schema({
    message: { type: String, required: true, trim: true, maxlength: 280 },
    linkUrl: { type: String, default: "", maxlength: 300 },
    linkLabel: { type: String, default: "", maxlength: 40 },
    tone: { type: String, enum: ["INFO", "SUCCESS", "WARNING"], default: "INFO" },
    // Who sees it: everyone, or only organizations, or only colleges.
    audience: { type: String, enum: ["ALL", "ORGANIZATION", "COLLEGE"], default: "ALL" },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    // Set when the owner ends it early. It stays in the list as history.
    stoppedAt: { type: Date, default: null },
    createdBy: { type: String, default: null },
}, { timestamps: true })

announcementSchema.index({ endsAt: 1, startsAt: 1 })

export default mongoose.model("Announcement", announcementSchema)
