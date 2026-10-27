// Date-only fields (a drive's start and "apply by" date) are calendar days, not instants.
//  - The browser's date inputs use "YYYY-MM-DD" in the user's own calendar, so "today" is built from LOCAL parts.
//    (new Date().toISOString() is the UTC date: between midnight and 05:30 in India it is still yesterday.)
//  - The API stores a date-only value at 00:00 UTC, so a stored value is read back with UTC parts.
// Keeping these two apart is what stops a date drifting by a day on its way to the server and back.
const pad = (n) => String(n).padStart(2, '0')

/** A Date (an instant) as the user's local calendar day, "YYYY-MM-DD". */
export const toDateInput = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** The user's local "today + n days". Whole calendar days, so a DST change cannot move it. */
export const dateInputFromToday = (days = 0) => {
  const now = new Date()
  return toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
}

/** A value stored by the API (00:00 UTC) as "YYYY-MM-DD". Empty / invalid -> ''. */
export const dateInputFromStored = (value) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` : ''
}

/** Adds whole calendar days to a "YYYY-MM-DD" string without touching timezones. */
export const addDaysToInput = (input, days) => {
  const [y, m, d] = String(input).split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Formats a date-only value for display in the given zone-independent way ("10 Nov 2026"). */
export const formatDateOnly = (value) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : ''
}
