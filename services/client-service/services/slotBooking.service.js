import { closingInstant, openingInstant } from "../utils/deadline.js"
import { SlotBooking } from "../models/slotBooking.model.js"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { ApiError } from "../utils/response.js"
import { resolveAvailability, validateSlot, overlapsExisting, slotKey } from "../utils/slotPolicy.js"

/** Try to take one place at `slot`. Atomic; returns true when a place was taken. */
export const reserveSlot = async (tenantId, slot, capacity) => {
    if (!capacity) return true                                   // 0 = unlimited: nothing to count
    const key = slotKey(slot)
    try {
        const doc = await SlotBooking.findOneAndUpdate(
            { tenantId, slotKey: key, count: { $lt: capacity } },
            { $inc: { count: 1 } },
            { upsert: true, new: true },
        )
        return Boolean(doc)
    } catch (err) {
        if (err?.code === 11000) return false                    // the row exists and is full (upsert collided)
        throw err
    }
}

export const releaseSlot = async (tenantId, slot) => {
    if (!slot) return
    await SlotBooking.updateOne({ tenantId, slotKey: slotKey(slot), count: { $gt: 0 } }, { $inc: { count: -1 } }).catch(() => {})
}

/** Every other interview time this candidate already holds in this organization. */
// A booking only blocks the candidate's time while that interview can still happen. One that was already conducted
// (completed, shortlisted, rejected, attempted), closed when its round ended, or belongs to a finished round or an archived
// drive is history, and must not stop the same person booking something else.
const BOOKING_ENDED_STATUSES = ["COMPLETED", "SHORTLISTED", "REJECTED", "CLOSED"]
export const holdsTime = (drive, round, candidate) =>
    Boolean(candidate?.interviewSlot)
    && !BOOKING_ENDED_STATUSES.includes(candidate.status)
    && !candidate.attemptedDate
    && !["COMPLETED", "CLOSED"].includes(round?.status)
    && !["ARCHIVED", "COMPLETED", "CLOSED"].includes(drive?.status)

const otherSlotsFor = async (tenantId, email, { driveId, roundNumber }) => {
    const drives = await InterviewDrive.find({ tenantId, "rounds.candidates.email": email }, { rounds: 1, status: 1 }).lean()
    const slots = []
    for (const drive of drives) {
        for (const round of drive.rounds || []) {
            if (String(drive._id) === String(driveId) && round.roundNumber === Number(roundNumber)) continue
            for (const c of round.candidates || []) {
                if (c.email === email && holdsTime(drive, round, c)) slots.push(c.interviewSlot)
            }
        }
    }
    return slots
}

/**
 * Validate a requested slot against the drive's availability policy and take a place for it.
 * Returns { slot, release } - call release() if anything later in the booking fails.
 * `previousSlot` (a reschedule) is freed only after the new place is secured.
 */
export const bookSlot = async ({ drive, round, email, requested, previousSlot = null, now = Date.now() }) => {
    const availability = resolveAvailability(drive)
    const check = validateSlot(requested, {
        now,
        window: { start: openingInstant(round?.startDate || drive.startDate, availability.timezone), end: closingInstant(round?.expiryDate || drive.expiryDate, availability.timezone) },
        availability,
    })
    if (!check.ok) throw new ApiError(400, check.code, check.message)
    const slot = new Date(requested)

    const others = await otherSlotsFor(drive.tenantId, String(email).toLowerCase(), { driveId: drive._id, roundNumber: round?.roundNumber })
    if (overlapsExisting(slot, others, availability)) {
        throw new ApiError(409, "CANDIDATE_DOUBLE_BOOKED", "You already have another interview scheduled at that time.")
    }

    const unchanged = previousSlot && slotKey(previousSlot) === slotKey(slot)
    if (!unchanged && !(await reserveSlot(drive.tenantId, slot, availability.maxConcurrent))) {
        throw new ApiError(409, "SLOT_FULL", "That time has just been taken. Please choose another slot.")
    }
    if (!unchanged && previousSlot) await releaseSlot(drive.tenantId, previousSlot)
    return { slot, release: () => (unchanged ? Promise.resolve() : releaseSlot(drive.tenantId, slot)) }
}
