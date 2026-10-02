import mongoose from "mongoose"

// One counter per (organization, slot start). Capacity is enforced by an atomic conditional increment,
// so two candidates racing for the last place cannot both get it.
const SlotBookingSchema = new mongoose.Schema({
    tenantId: { type: String, required: true },
    slotKey: { type: String, required: true },      // ISO start minute, see utils/slotPolicy.slotKey
    count: { type: Number, default: 0, min: 0 },
})
SlotBookingSchema.index({ tenantId: 1, slotKey: 1 }, { unique: true })

export const SlotBooking = mongoose.model("SlotBooking", SlotBookingSchema)
