// Scheduling rules for the candidate portal (docs: 10-candidate-portal-calendar-reschedule-and-ux-overhaul.md).
// The backend enforces the same numbers (services/client-service/services/interviewDrive.service.js) -
// this copy only drives what the UI shows, it is never the authority.
export const EARLY_ACCESS_MINUTES = 10       // the interview opens this long before the slot
export const LATE_GRACE_MINUTES = 90         // ...and stays open this long after it
export const RESCHEDULE_CUTOFF_MINUTES = 30  // rescheduling closes this long before the slot
export const SLOT_START_HOUR = 9             // first bookable slot 09:00 (local time)
export const SLOT_END_HOUR = 20              // last slot ends 20:00
export const SLOT_STEP_MINUTES = 30
export const MIN_LEAD_MINUTES = 60           // "today" slots must be at least this far in the future

// Local demos: VITE_DISABLE_START_GATE=true lets the button work outside the window (the backend has
// a matching INTERVIEW_GATE_DISABLED switch).
export const GATE_DISABLED = String(import.meta.env?.VITE_DISABLE_START_GATE || '').toLowerCase() === 'true'

const MINUTE = 60 * 1000

/**
 * Where "now" sits relative to an interview slot.
 *   NONE    - no slot chosen yet
 *   LOCKED  - too early: countdown shown, Start disabled
 *   LIVE    - inside [slot - 10 min, slot + 90 min]: Start enabled
 *   EXPIRED - the window passed without an attempt
 */
export function getSlotGate(slot, now = Date.now()) {
    if (!slot) return { state: 'NONE', canReschedule: false }
    const at = new Date(slot).getTime()
    if (Number.isNaN(at)) return { state: 'NONE', canReschedule: false }
    const opensAt = at - EARLY_ACCESS_MINUTES * MINUTE
    const closesAt = at + LATE_GRACE_MINUTES * MINUTE
    const rescheduleClosesAt = at - RESCHEDULE_CUTOFF_MINUTES * MINUTE
    let state = 'LIVE'
    if (now < opensAt) state = 'LOCKED'
    else if (now > closesAt) state = 'EXPIRED'
    if (GATE_DISABLED && state !== 'EXPIRED') state = 'LIVE'
    return {
        state,
        msToOpen: Math.max(opensAt - now, 0),
        msToSlot: at - now,
        // Open until 30 min before the slot; a missed slot (window fully closed) can be moved again.
        canReschedule: now < rescheduleClosesAt || now > closesAt,
        msToRescheduleClose: rescheduleClosesAt - now,
    }
}

/** "3d 4h", "2h 15m", "25 mins", "40s" - the two most significant units. */
export function formatCountdown(ms) {
    const totalSeconds = Math.max(Math.floor(ms / 1000), 0)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes} min${minutes === 1 ? '' : 's'}`
    return `${totalSeconds}s`
}

/** e.g. "Asia/Calcutta (UTC+5:30)" - shown next to the slot picker so times are unambiguous. */
export function timezoneLabel() {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'
    const offset = -new Date().getTimezoneOffset()
    const sign = offset >= 0 ? '+' : '-'
    const abs = Math.abs(offset)
    const minutes = abs % 60
    return `${zone.replace(/_/g, ' ')} (UTC${sign}${Math.floor(abs / 60)}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''})`
}

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
export const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Bookable slot start times for one local day, each flagged available/unavailable against [minTime, maxTime]. */
export function slotsForDay(day, minTime, maxTime) {
    const slots = []
    const base = startOfDay(day)
    for (let minute = SLOT_START_HOUR * 60; minute < SLOT_END_HOUR * 60; minute += SLOT_STEP_MINUTES) {
        const at = new Date(base.getTime() + minute * MINUTE)
        slots.push({ at, iso: at.toISOString(), available: at >= minTime && at <= maxTime })
    }
    return slots
}

export const formatSlotTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
