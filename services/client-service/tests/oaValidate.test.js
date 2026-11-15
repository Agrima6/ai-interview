import test from "node:test"
import assert from "node:assert/strict"
import { effectiveSchedule, parseSchedule, schedulePhase, slotChangeDeadline } from "../utils/oaExam.js"
import { intInRange, nameProblem, normalizePhone, phoneProblem } from "../utils/oaValidate.js"

test("normalizePhone: exactly ten digits, however typed", () => {
    for (const ok of ["9876543210", "+91 98765 43210", "+919876543210", "919876543210", "09876543210", "(987) 654-3210"]) assert.equal(normalizePhone(ok), "9876543210", ok)
    for (const bad of ["", "12345", "98765432101", "98765abcde", "+1 415 555 0100 99", "0000", "abc"]) assert.equal(normalizePhone(bad), null, bad)
})

test("phoneProblem: optional unless asked, and never accepts a wrong length", () => {
    assert.equal(phoneProblem(""), null)
    assert.equal(phoneProblem("   "), null)
    assert.match(phoneProblem(""  , { required: true }), /10-digit/)
    assert.match(phoneProblem("12345"), /10 digits/)
    assert.equal(phoneProblem("9876543210"), null)
})

test("nameProblem: letters in any script, no digits or symbols", () => {
    for (const ok of ["Asha Verma", "Jean-Luc O'Neil", "Nikhil K.", "अनन्या शर्मा", "José Álvarez", "D’Souza"]) assert.equal(nameProblem(ok), null, ok)
    for (const bad of ["A", "R2D2", "Name <script>", "12345", "  ", "x".repeat(101)]) assert.ok(nameProblem(bad), bad)
})

test("intInRange rejects instead of clamping", () => {
    const rule = { min: 1, max: 10, field: "maxViolations", label: "Violations" }
    assert.equal(intInRange("7", rule), 7)
    assert.equal(intInRange(10, rule), 10)
    for (const bad of [0, 11, "", "abc", 2.5, null, undefined, "1e3", NaN]) assert.throws(() => intInRange(bad, rule), (e) => e.code === "VALIDATION_ERROR" && Boolean(e.fields.maxViolations), String(bad))
})

test("slots: sorted, whole span derived, per-student schedule follows the booking", () => {
    const now = Date.now(); const MIN = 60e3
    const parsed = parseSchedule({ mode: "SLOTS", durationMinutes: 45, lateEntryMinutes: 15, slots: [{ startAt: new Date(now + 300 * MIN), capacity: "20" }, { startAt: new Date(now + 100 * MIN) }] }, { now })
    assert.equal(parsed.error, undefined)
    assert.deepEqual(parsed.slots.map((s) => s.capacity), [null, 20])
    assert.equal(parsed.startAt.getTime(), now + 100 * MIN)
    assert.equal(parsed.endAt.getTime(), now + 300 * MIN + 60 * MIN)
    const mine = effectiveSchedule(parsed, parsed.slots[1].id)
    assert.equal(mine.startAt.getTime(), now + 300 * MIN)
    assert.equal(mine.endAt.getTime(), now + 360 * MIN)
    assert.equal(effectiveSchedule(parsed, null), null)
    assert.equal(effectiveSchedule(parsed, "unknown"), null)
    assert.equal(schedulePhase(mine, now), "UPCOMING")
    assert.equal(schedulePhase(mine, now + 301 * MIN), "OPEN")
    assert.equal(schedulePhase(mine, now + 320 * MIN), "CLOSED_TO_ENTRY")
    assert.equal(slotChangeDeadline(parsed.slots[1]).getTime(), now + 270 * MIN)
})

test("a fixed schedule passes through effectiveSchedule unchanged", () => {
    const fixed = { mode: "FIXED", startAt: new Date(), endAt: new Date(Date.now() + 3600e3), durationMinutes: 30 }
    assert.equal(effectiveSchedule(fixed, null), fixed)
    assert.equal(effectiveSchedule({ startAt: fixed.startAt }, null).startAt, fixed.startAt)     // old rows without a mode
})
