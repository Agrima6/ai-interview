// Money, dates and labels for the billing pages. Everything is Indian rupees and Indian time (IST), the way the business bills.

export const inr = (n) => {
    const value = Number(n) || 0
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value)
}
export const num = (n) => new Intl.NumberFormat('en-IN').format(Number(n) || 0)
export const formatWhen = (value) => (value ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—')
export const formatDay = (value) => (value ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }).format(new Date(value)) : '—')

const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
export const istToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

export const PERIOD_PRESETS = [
    { id: 'thisMonth', label: 'This month' },
    { id: 'lastMonth', label: 'Last month' },
    { id: 'last3', label: 'Last 3 months' },
    { id: 'fy', label: 'This financial year' },
]

/** { from, to } (YYYY-MM-DD, IST) for a preset. The financial year runs April to March. */
export const presetRange = (id) => {
    const today = istToday()
    const [y, m] = today.split('-').map(Number)
    if (id === 'lastMonth') { const py = m === 1 ? y - 1 : y; const pm = m === 1 ? 12 : m - 1; return { from: ymd(py, pm, 1), to: ymd(py, pm, new Date(Date.UTC(py, pm, 0)).getUTCDate()) } }
    if (id === 'last3') { const d = new Date(Date.UTC(y, m - 3, 1)); return { from: ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, 1), to: today } }
    if (id === 'fy') return { from: ymd(m >= 4 ? y : y - 1, 4, 1), to: today }
    return { from: ymd(y, m, 1), to: today }
}

export const monthLabel = (month) => new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))

export const OUTCOME = {
    GAVE: ['success', 'Gave the interview'],
    PENDING: ['neutral', 'Not yet'],
    MISSED: ['danger', 'Missed'],
    STARTED_NOT_FINISHED: ['warning', 'Started, not finished'],
    AWAITING_APPROVAL: ['info', 'Awaiting approval'],
}
export const KIND = { ORGANIZATION: 'Organization', COLLEGE: 'College', ONLINE_ASSESSMENT: 'Online tests only', UNKNOWN: 'Unknown' }
export const PRODUCT = { AI_INTERVIEW: 'AI Interview', ONLINE_ASSESSMENT: 'Online Assessment' }
export const UNIT_LABEL = { CANDIDATE: 'per candidate', INTERVIEW: 'per round' }
// What happened to the invitation email. View only.
export const MAIL = { OPENED: ['success', 'Opened'], READ: ['success', 'Opened'], DELIVERED: ['info', 'Delivered'], SENT: ['info', 'Sent'], MOCK_SENT: ['info', 'Sent'], QUEUED: ['neutral', 'Queued'], FAILED: ['danger', 'Failed'] }

/** What a client has created, in words: "Online test + AI interview", "Online test", "AI interview" (or several, joined). */
export const usesLabel = (uses) => {
    if (!uses) return ''
    const parts = [uses.combo && 'Online test + AI interview', uses.oa && 'Online test', uses.ai && 'AI interview'].filter(Boolean)
    return parts.join(' · ')
}
/** The kinds to show a price for. A client with nothing created yet (or no information) shows all of them. */
export const shownKinds = (uses) => (uses && (uses.oa || uses.ai || uses.combo) ? uses : { oa: true, ai: true, combo: true })
