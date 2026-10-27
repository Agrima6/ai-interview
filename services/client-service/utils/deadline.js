// Date-only fields (a drive's start and "apply by" date) are CALENDAR days, not instants. They are persisted at
// 00:00:00.000 UTC so the stored value never depends on the server's or browser's timezone, and they are
// interpreted in the ORGANIZATION's timezone: "apply by 10 Nov" means applications close at the end of 10 Nov
// there, not at 00:00 UTC (05:30 IST) when that day has barely begun.
//
// Values that carry a real time of day (older seeds, round deadlines set programmatically) are used as they are.

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

export const isDateOnly = (value) => {
    const t = new Date(value).getTime()
    return Number.isFinite(t) && t % DAY === 0
}

/** "YYYY-MM-DD" -> the date-only value we persist (00:00 UTC). Returns null when it is not a real calendar date. */
export const parseDateOnly = (text) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text ?? "").trim())
    if (!match) return null
    const [, y, m, d] = match.map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null
}

// Wall-clock fields of an instant in an IANA zone, expressed as if they were UTC (used to measure the zone's offset).
const wallAsUtc = (instant, timeZone) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(instant)
    const get = (type) => Number(parts.find((p) => p.type === type).value)
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
}

/** The instant a calendar day (y, m = 1-12, d) begins in `timeZone`. */
export const startOfZonedDay = (y, m, d, timeZone) => {
    const wall = Date.UTC(y, m - 1, d)
    let instant = wall - (wallAsUtc(new Date(wall), timeZone) - wall)
    instant = wall - (wallAsUtc(new Date(instant), timeZone) - instant)      // second pass settles DST edges
    return new Date(instant)
}

/** The instant a date-only value's day ENDS in the organization's timezone (its last millisecond). */
export const closingInstant = (value, timeZone = "Asia/Kolkata") => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    if (!isDateOnly(date)) return date
    const next = startOfZonedDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate() + 1, timeZone)
    return new Date(next.getTime() - 1)
}

/** The instant a date-only value's day BEGINS in the organization's timezone. */
export const openingInstant = (value, timeZone = "Asia/Kolkata") => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    if (!isDateOnly(date)) return date
    return startOfZonedDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), timeZone)
}

/** Today's calendar day in `timeZone`, as a date-only value (00:00 UTC). */
export const todayDateOnly = (timeZone = "Asia/Kolkata", now = Date.now()) => {
    const wall = new Date(wallAsUtc(new Date(now), timeZone))
    return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()))
}
