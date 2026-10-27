import test from "node:test"
import assert from "node:assert/strict"
import { closePendingInterviews } from "../services/interviewDrive.service.js"

const roundWith = (...statuses) => ({
    status: "COMPLETED",
    candidates: statuses.map((status, i) => ({ id: `c${i}`, status, interviewSlot: status === "SCHEDULED" ? new Date("2099-01-01T10:00:00Z") : null })),
})

test("completing a round closes every interview not yet conducted, including future-dated and unscheduled ones", () => {
    const round = roundWith("SCHEDULED", "INVITED", "SCHEDULED")
    const released = closePendingInterviews(round, "ROUND_ENDED", new Date("2026-10-28T00:00:00Z"))
    assert.deepEqual(round.candidates.map((c) => c.status), ["CLOSED", "CLOSED", "CLOSED"])
    assert.equal(released.length, 2)                                   // only reserved slots are handed back
    assert.ok(round.candidates.every((c) => c.closedReason === "ROUND_ENDED" && c.closedAt))
})

test("interviews already finished keep their status", () => {
    const round = roundWith("COMPLETED", "SHORTLISTED", "REJECTED", "SCHEDULED")
    closePendingInterviews(round)
    assert.deepEqual(round.candidates.map((c) => c.status), ["COMPLETED", "SHORTLISTED", "REJECTED", "CLOSED"])
})

test("closure is written to the candidate's scheduling history with the slot that was lost", () => {
    const round = roundWith("SCHEDULED")
    closePendingInterviews(round)
    const [event] = round.candidates[0].slotHistory
    assert.equal(event.action, "CLOSED")
    assert.equal(event.reason, "ROUND_ENDED")
    assert.equal(event.slot.toISOString(), "2099-01-01T10:00:00.000Z")
})

test("running it twice changes nothing more (idempotent)", () => {
    const round = roundWith("SCHEDULED", "COMPLETED")
    closePendingInterviews(round)
    const again = closePendingInterviews(round)
    assert.equal(again.length, 0)
    assert.equal(round.candidates[0].slotHistory.length, 1)
})

test("the standing demo candidate is never closed", () => {
    const round = { candidates: [{ id: "d", status: "SCHEDULED", demoAlwaysLive: true }] }
    closePendingInterviews(round)
    assert.equal(round.candidates[0].status, "SCHEDULED")
})
