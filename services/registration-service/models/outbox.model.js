import mongoose from "mongoose"

const OutboxSchema = new mongoose.Schema({
    routingKey: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    headers: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["PENDING", "PROCESSED", "FAILED"], default: "PENDING" },
    attempts: { type: Number, default: 0 },
    error: { type: String },
    createdAt: { type: Date, default: Date.now },
    processedAt: { type: Date }
})

const Outbox = mongoose.model("Outbox", OutboxSchema)
export default Outbox
