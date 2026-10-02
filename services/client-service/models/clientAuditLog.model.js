import mongoose from "mongoose"

// Records that a client was edited and by whom/what changed - not the old
// vs new values themselves, so this collection is safe to display directly
// in the Client History tab without redacting PII on every read.
const clientAuditLogSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    changedByEmail: { type: String, default: null },
    changedFields: [{ type: String }],
}, { timestamps: { createdAt: true, updatedAt: false } })

clientAuditLogSchema.index({ clientId: 1, createdAt: -1 })

export default mongoose.model("ClientAuditLog", clientAuditLogSchema)
