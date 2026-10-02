// Interview scheduling policy: which moments may be booked. Pure functions (no DB, no clock reads unless
// passed) so every rule is unit-tested. The backend is the authority; the candidate UI only mirrors it.
//
// Times are stored as UTC instants. "Working hours" are evaluated in the ORGANIZATION's IANA timezone, so
// 09:00 means 09:00 for the hiring team wherever the candidate is; the candidate sees it in their own zone.
//
// Every number is configurable per drive (`drive.availability`) or by environment - none is hard-coded:
//   SLOT_DAY_START / SLOT_DAY_END   "HH:MM" bookable window inside a day       (default 09:00 - 20:00)
//   SLOT_INTERVAL_MINUTES           granularity of a bookable start time         (default 5; 30 = classic grid)
//   SLOT_DURATION_MINUTES           length reserved for an interview             (default 30)
//   SLOT_BUFFER_MINUTES             gap kept between one candidate's bookings    (default 10)
//   SLOT_MIN_NOTICE_MINUTES         earliest a slot may be from now              (default 60)
//   SLOT_MAX_CONCURRENT             interviews allowed to start at the same time (default 0 = unlimited)
//   DEFAULT_TIMEZONE                organization timezone if none is set         (default Asia/Kolkata)

const MINUTE = 60 * 1000

const num = (value, fallback, { min = 0, max = Infinity } = {}) => {
    const n = Number(value)
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback
}

const hhmm = (value, fallback) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? "").trim())
    if (!match) return fallback
    const minutes = Number(match[1]) * 60 + Number(match[2])
    return Number(match[1]) <= 24 && Number(match[2]) < 60 && minutes <= 24 * 60 ? minutes : fallback
}

export const isValidTimezone = (zone) => {
    if (typeof zone !== "string" || !zone.trim()) return false
    try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); return true } catch { return false }
}

/** Effective availability: drive settings over environment over defaults. Always returns sane numbers. */
export function resolveAvailability(drive = {}, env = process.env) {
    const own = drive.availability || {}
    const timezone = [own.timezone, env.DEFAULT_TIMEZONE, "Asia/Kolkata"].find(isValidTimezone)
    const dayStart = hhmm(own.dayStart ?? env.SLOT_DAY_START, 9 * 60)
    let dayEnd = hhmm(own.dayEnd ?? env.SLOT_DAY_END, 20 * 60)
    if (dayEnd <= dayStart) dayEnd = 20 * 60
    return {
        timezone,
        dayStart,
        dayEnd,
        intervalMinutes: num(own.intervalMinutes ?? env.SLOT_INTERVAL_MINUTES, 5, { min: 1, max: 240 }),
        durationMinutes: num(own.durationMinutes ?? env.SLOT_DURATION_MINUTES, 30, { min: 5, max: 480 }),
        bufferMinutes: num(own.bufferMinutes ?? env.SLOT_BUFFER_MINUTES, 10, { min: 0, max: 240 }),
        minNoticeMinutes: num(own.minNoticeMinutes ?? env.SLOT_MIN_NOTICE_MINUTES, 60, { min: 0, max: 60 * 24 * 30 }),
        maxConcurrent: num(own.maxConcurrent ?? env.SLOT_MAX_CONCURRENT, 0, { min: 0, max: 100000 }),
        blockedPeriods: (Array.isArray(own.blockedPeriods) ? own.blockedPeriods : [])
            .map((p) => ({ start: new Date(p?.start), end: new Date(p?.end), reason: String(p?.reason || "").slice(0, 120) }))
            .filter((p) => !Number.isNaN(p.start.getTime()) && !Number.isNaN(p.end.getTime()) && p.end > p.start),
    }
}

/** Minutes since local midnight, and the local calendar day key, of an instant in an IANA timezone. */
export function localParts(instant, timezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(instant)
    const get = (type) => Number(parts.find((p) => p.type === type)?.value)
    return { minutes: get("hour") * 60 + get("minute"), day: `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}` }
}

/**
 * Is this instant a bookable interview start? Returns { ok: true } or { ok: false, code, message }.
 *   window:  { start, end }  the drive/round period (either may be missing)
 */
export function validateSlot(input, { now = Date.now(), window = {}, availability } = {}) {
    const a = availability || resolveAvailability()
    const at = input instanceof Date ? input : new Date(input)
    const bad = (code, message) => ({ ok: false, code, message })
    if (Number.isNaN(at.getTime())) return bad("INVALID_SLOT", "Please choose a valid date and time.")

    if (at.getTime() < now + a.minNoticeMinutes * MINUTE) {
        return bad("SLOT_TOO_SOON", a.minNoticeMinutes >= 60
            ? `Interviews must be booked at least ${Math.round(a.minNoticeMinutes / 60 * 10) / 10} hour(s) ahead.`
            : `Interviews must be booked at least ${a.minNoticeMinutes} minutes ahead.`)
    }
    const start = window.start ? new Date(window.start) : null
    const end = window.end ? new Date(window.end) : null
    if ((start && !Number.isNaN(start.getTime()) && at < start) || (end && !Number.isNaN(end.getTime()) && at > end)) {
        return bad("SLOT_OUTSIDE_WINDOW", "Please choose a time within this drive's interview period.")
    }

    const { minutes } = localParts(at, a.timezone)
    if (minutes < a.dayStart || minutes + a.durationMinutes > a.dayEnd) {
        const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
        return bad("SLOT_OUTSIDE_HOURS", `Interviews run between ${fmt(a.dayStart)} and ${fmt(a.dayEnd)} (${a.timezone}).`)
    }
    if (a.intervalMinutes > 1 && (minutes - a.dayStart) % a.intervalMinutes !== 0) {
        return bad("SLOT_OFF_INTERVAL", `Please choose a start time on a ${a.intervalMinutes}-minute mark.`)
    }
    if (at.getUTCSeconds() !== 0 || at.getUTCMilliseconds() !== 0) return bad("INVALID_SLOT", "Times must be whole minutes.")

    const slotEnd = new Date(at.getTime() + a.durationMinutes * MINUTE)
    const blocked = a.blockedPeriods.find((p) => at < p.end && slotEnd > p.start)
    if (blocked) return bad("SLOT_BLOCKED", blocked.reason ? `That time is unavailable (${blocked.reason}).` : "That time is unavailable.")
    return { ok: true }
}

/** The exact key a booking counts against: the slot's start minute. */
export const slotKey = (instant) => new Date(Math.floor(new Date(instant).getTime() / MINUTE) * MINUTE).toISOString()

/**
 * Does `at` collide with any of the candidate's OTHER bookings (durations plus buffer)?
 * `others` are instants. A candidate cannot be in two interviews at once.
 */
export function overlapsExisting(at, others, availability) {
    const a = availability || resolveAvailability()
    const span = (a.durationMinutes + a.bufferMinutes) * MINUTE
    const t = new Date(at).getTime()
    return (others || []).some((o) => {
        const other = new Date(o).getTime()
        return Number.isFinite(other) && Math.abs(other - t) < span
    })
}

/** Bookable start times for one local day in the organization's timezone (drives the UI's slot list). */
export function slotsForOrgDay(dayStartInstant, { now = Date.now(), window = {}, availability } = {}) {
    const a = availability || resolveAvailability()
    const out = []
    const first = new Date(dayStartInstant).getTime()
    for (let m = 0; m < 24 * 60; m += a.intervalMinutes) {
        const at = new Date(first + m * MINUTE)
        if (validateSlot(at, { now, window, availability: a }).ok) out.push(at.toISOString())
    }
    return out
}

/** What the candidate UI needs to render its picker. Never includes other candidates' data. */
export const publicAvailability = (availability) => ({
    timezone: availability.timezone,
    dayStart: availability.dayStart,
    dayEnd: availability.dayEnd,
    intervalMinutes: availability.intervalMinutes,
    durationMinutes: availability.durationMinutes,
    minNoticeMinutes: availability.minNoticeMinutes,
    blockedPeriods: availability.blockedPeriods.map((p) => ({ start: p.start.toISOString(), end: p.end.toISOString() })),
})
