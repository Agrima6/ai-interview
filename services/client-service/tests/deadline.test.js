import test from "node:test"
import assert from "node:assert/strict"
import { closingInstant, openingInstant, parseDateOnly, todayDateOnly, isDateOnly } from "../utils/deadline.js"

test("a date-only deadline closes at the end of that day in the organization's timezone", () => {
    const stored = parseDateOnly("2026-11-10")
    assert.equal(closingInstant(stored, "Asia/Kolkata").toISOString(), "2026-11-10T18:29:59.999Z")   // 23:59:59.999 IST
    assert.equal(closingInstant(stored, "UTC").toISOString(), "2026-11-10T23:59:59.999Z")
    assert.equal(closingInstant(stored, "America/New_York").toISOString(), "2026-11-11T04:59:59.999Z")
})

test("a slot on the apply-by day is inside the window, the next day is not", () => {
    const end = closingInstant(parseDateOnly("2026-11-10"), "Asia/Kolkata")
    assert.ok(new Date("2026-11-10T15:00:00+05:30") <= end)       // 3 pm on the closing day
    assert.ok(new Date("2026-11-11T00:00:00+05:30") > end)
})

test("the opening instant is the start of the day in that zone", () => {
    assert.equal(openingInstant(parseDateOnly("2026-11-10"), "Asia/Kolkata").toISOString(), "2026-11-09T18:30:00.000Z")
})

test("values with a real time of day are used as they are", () => {
    const t = new Date("2099-12-31T23:59:59.000Z")
    assert.equal(isDateOnly(t), false)
    assert.equal(closingInstant(t, "Asia/Kolkata").getTime(), t.getTime())
})

test("date strings are strict calendar dates and round-trip unchanged", () => {
    assert.equal(parseDateOnly("2026-02-30"), null)
    assert.equal(parseDateOnly("10/11/2026"), null)
    assert.equal(parseDateOnly("2026-11-10").toISOString().slice(0, 10), "2026-11-10")
})

test("today follows the organization's calendar, not UTC (00:20 IST on the 28th is still the 27th in UTC)", () => {
    const now = Date.parse("2026-10-27T18:50:00Z")
    assert.equal(todayDateOnly("Asia/Kolkata", now).toISOString().slice(0, 10), "2026-10-28")
    assert.equal(todayDateOnly("UTC", now).toISOString().slice(0, 10), "2026-10-27")
})
