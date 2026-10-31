import test from "node:test"
import assert from "node:assert/strict"
import { holdsTime } from "../services/slotBooking.service.js"

const slot = new Date("2026-10-31T13:47:00Z")
const drive = { status: "ACTIVE" }
const round = { status: "ACTIVE" }

test("a pending interview holds its time", () => {
    assert.equal(holdsTime(drive, round, { interviewSlot: slot, status: "SCHEDULED" }), true)
    assert.equal(holdsTime(drive, round, { interviewSlot: slot, status: "INVITED" }), true)
})

test("a finished interview does not block a new booking", () => {
    for (const status of ["COMPLETED", "SHORTLISTED", "REJECTED", "CLOSED"]) {
        assert.equal(holdsTime(drive, round, { interviewSlot: slot, status }), false, status)
    }
    assert.equal(holdsTime(drive, round, { interviewSlot: slot, status: "SCHEDULED", attemptedDate: new Date() }), false)
})

test("a finished round or an archived drive holds nothing", () => {
    assert.equal(holdsTime(drive, { status: "COMPLETED" }, { interviewSlot: slot, status: "SCHEDULED" }), false)
    assert.equal(holdsTime(drive, { status: "CLOSED" }, { interviewSlot: slot, status: "SCHEDULED" }), false)
    assert.equal(holdsTime({ status: "ARCHIVED" }, round, { interviewSlot: slot, status: "SCHEDULED" }), false)
})

test("no slot, nothing to hold", () => {
    assert.equal(holdsTime(drive, round, { interviewSlot: null, status: "SCHEDULED" }), false)
})
