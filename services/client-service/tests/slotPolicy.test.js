import test from "node:test"
import assert from "node:assert/strict"
import { resolveAvailability, validateSlot, overlapsExisting, isValidTimezone, localParts, slotKey } from "../utils/slotPolicy.js"

const env = {}
const IST = { availability: { timezone: "Asia/Kolkata" } }
const avail = (own = {}) => resolveAvailability({ availability: { timezone: "Asia/Kolkata", ...own } }, env)
const NOW = Date.parse("2026-09-20T04:30:00Z")           // 10:00 IST
const at = (iso) => new Date(iso)

test("defaults allow any time of day and any minute; everything is configurable", () => {
    const a = resolveAvailability({}, env)
    assert.deepEqual([a.timezone, a.dayStart, a.dayEnd, a.intervalMinutes, a.durationMinutes], ["Asia/Kolkata", 0, 1440, 1, 30])
    const custom = resolveAvailability({ availability: { dayStart: "08:30", dayEnd: "18:00", intervalMinutes: 15 } }, env)
    assert.deepEqual([custom.dayStart, custom.dayEnd, custom.intervalMinutes], [510, 1080, 15])
    assert.equal(resolveAvailability({ availability: { dayStart: "nonsense", intervalMinutes: -3, timezone: "Mars/Base" } }, env).intervalMinutes, 1)
    assert.equal(resolveAvailability({ availability: { timezone: "Mars/Base" } }, env).timezone, "Asia/Kolkata")
    assert.equal(resolveAvailability({ availability: { dayStart: "18:00", dayEnd: "09:00" } }, env).dayEnd, 1440)  // inverted window is repaired
    assert.equal(isValidTimezone("Asia/Kolkata"), true)
    assert.equal(isValidTimezone("nope"), false)
})

test("times that are not on a five-minute mark are valid (7:13, 11:42 pm, 2:07 am)", () => {
    // IST = UTC+5:30. 07:13 IST = 01:43 UTC, 23:42 IST = 18:12 UTC, 02:07 IST = 20:37 UTC the day before
    for (const iso of ["2026-09-22T01:43:00Z", "2026-09-22T18:12:00Z", "2026-09-21T20:37:00Z"]) {
        assert.equal(validateSlot(at(iso), { now: NOW, availability: avail() }).ok, true, iso)
    }
})

test("every hour of the 24-hour day is bookable by default", () => {
    for (let h = 0; h < 24; h += 1) {
        const instant = new Date(Date.parse("2026-09-22T00:00:00Z") + h * 3600000 + 13 * 60000)
        assert.equal(validateSlot(instant, { now: NOW, availability: avail() }).ok, true, `hour ${h}`)
    }
})

test("an organization that configures a grid still gets it enforced", () => {
    assert.equal(validateSlot(at("2026-09-22T10:07:00Z"), { now: NOW, availability: avail({ intervalMinutes: 30 }) }).code, "SLOT_OFF_INTERVAL")
    assert.equal(validateSlot(at("2026-09-22T10:00:00Z"), { now: NOW, availability: avail({ intervalMinutes: 30 }) }).ok, true)
})

test("configured working hours are checked in the organization's timezone, not the server's or the candidate's", () => {
    const hours = { dayStart: "09:00", dayEnd: "20:00" }
    // 08:30 IST = 03:00 UTC -> too early;  20:00 IST start would overrun the day
    assert.equal(validateSlot(at("2026-09-22T03:00:00Z"), { now: NOW, availability: avail(hours) }).code, "SLOT_OUTSIDE_HOURS")
    assert.equal(validateSlot(at("2026-09-22T14:30:00Z"), { now: NOW, availability: avail(hours) }).code, "SLOT_OUTSIDE_HOURS")   // 20:00 IST + 30m > 20:00
    assert.equal(validateSlot(at("2026-09-22T14:00:00Z"), { now: NOW, availability: avail(hours) }).ok, true)                   // 19:30 IST fits exactly
    const utc = resolveAvailability({ availability: { timezone: "UTC", ...hours } }, env)
    assert.equal(validateSlot(at("2026-09-22T03:00:00Z"), { now: NOW, availability: utc }).code, "SLOT_OUTSIDE_HOURS")     // 03:00 UTC is before 09:00 UTC
    assert.equal(validateSlot(at("2026-09-22T10:00:00Z"), { now: NOW, availability: utc }).ok, true)
})

test("minimum notice, drive window and blocked periods", () => {
    // no minimum notice by default: a slot 30 minutes away is fine, a slot in the past is not
    assert.equal(validateSlot(at("2026-09-20T05:00:00Z"), { now: NOW, availability: avail() }).ok, true)
    assert.equal(validateSlot(at("2026-09-20T04:00:00Z"), { now: NOW, availability: avail() }).code, "SLOT_TOO_SOON")
    // an organization can still configure a minimum notice
    assert.equal(validateSlot(at("2026-09-20T05:00:00Z"), { now: NOW, availability: avail({ minNoticeMinutes: 60 }) }).code, "SLOT_TOO_SOON")
    const win = { start: "2026-09-21T00:00:00Z", end: "2026-09-25T00:00:00Z" }
    assert.equal(validateSlot(at("2026-09-27T10:00:00Z"), { now: NOW, window: win, availability: avail() }).code, "SLOT_OUTSIDE_WINDOW")
    const blocked = avail({ blockedPeriods: [{ start: "2026-09-22T09:30:00Z", end: "2026-09-22T11:00:00Z", reason: "Public holiday" }] })
    const r = validateSlot(at("2026-09-22T10:00:00Z"), { now: NOW, availability: blocked })
    assert.equal(r.code, "SLOT_BLOCKED"); assert.match(r.message, /Public holiday/)
    assert.equal(validateSlot(at("2026-09-22T11:00:00Z"), { now: NOW, availability: blocked }).ok, true)                    // ends exactly at block end
    assert.equal(validateSlot("garbage", { now: NOW }).code, "INVALID_SLOT")
})

test("a candidate cannot hold two overlapping interviews (duration plus buffer)", () => {
    const a = avail({ durationMinutes: 30, bufferMinutes: 10 })
    assert.equal(overlapsExisting(at("2026-09-22T10:00:00Z"), [at("2026-09-22T10:39:00Z")], a), true)
    assert.equal(overlapsExisting(at("2026-09-22T10:00:00Z"), [at("2026-09-22T10:40:00Z")], a), false)
    assert.equal(overlapsExisting(at("2026-09-22T10:00:00Z"), [], a), false)
})

test("localParts and slotKey are timezone-safe", () => {
    assert.deepEqual(localParts(at("2026-09-22T18:45:00Z"), "Asia/Kolkata"), { minutes: 0 * 60 + 15, day: "2026-09-23" })   // crosses midnight
    assert.equal(slotKey("2026-09-22T10:00:41.900Z"), "2026-09-22T10:00:00.000Z")
})
