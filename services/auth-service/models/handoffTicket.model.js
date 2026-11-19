import mongoose from "mongoose"

// A one-time ticket that lets a candidate who has just proven who they are elsewhere (the online test room) continue
// into the AI interview without signing in again. Only the SHA-256 hash is stored; it lives for two minutes and
// works once.
const handoffTicketSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

handoffTicketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model("HandoffTicket", handoffTicketSchema)
