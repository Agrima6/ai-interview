// Formatting helpers, shared constants and class strings for the Online Assessment screens.

export const DEFAULT_TZ = 'Asia/Kolkata'

export const formatDateTime = (value, timeZone = DEFAULT_TZ) => {
    if (!value) return '—'
    try { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value)) } catch { return String(value) }
}

export const formatDate = (value, timeZone = DEFAULT_TZ) => {
    if (!value) return '—'
    try { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone }).format(new Date(value)) } catch { return String(value) }
}

export const formatDay = (value, timeZone = DEFAULT_TZ) => {
    try { return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(new Date(value)) } catch { return String(value) }
}

export const formatTime = (value, timeZone = DEFAULT_TZ) => {
    try { return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone }).format(new Date(value)).toUpperCase() } catch { return String(value) }
}

export const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return '—'
    const m = Math.floor(seconds / 60); const s = seconds % 60
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${String(s).padStart(2, '0')}s`
}

// datetime-local inputs speak local wall-clock time without a zone; the API speaks ISO instants.
export const toLocalInput = (value) => {
    if (!value) return ''
    const d = new Date(value)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : '')


export const TYPE_LABELS = { MCQ: 'Single choice', MSQ: 'Multiple choice', SHORT: 'Short answer', LONG: 'Long answer', CODING: 'Coding', VIDEO: 'Video answer' }

// Difficulty reads as the experience it suits, so a recruiter can pick without guessing.
export const DIFFICULTIES = [['EASY', 'Easy', '0–2 yrs'], ['MEDIUM', 'Medium', '2–5 yrs'], ['HARD', 'Hard', '5+ yrs']]
export const difficultyLabel = (value) => { const d = DIFFICULTIES.find((x) => x[0] === value); return d ? `${d[1]} · ${d[2]} experience` : value }

/** "Section 2" or, when the organizer named it, "Section 2 · Aptitude". */
export const sectionLabel = (section, index) => {
    const fixed = `Section ${index + 1}`
    const name = String(section?.name ?? section?.title ?? '').trim()
    return !name || /^section\s*\d+$/i.test(name) ? fixed : `${fixed} · ${name}`
}

export const inputClass = 'w-full bg-card border-[1.5px] border-line rounded-[12px] px-3.5 py-2.5 text-[14px] text-ink placeholder:text-text-secondary/70 outline-none transition-all hover:border-accent/35 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-50'

export const downloadText = (filename, text, type = 'text/csv;charset=utf-8') => {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const countOf = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/** When the round runs, in one plain sentence. */
export const scheduleSentence = (schedule) => {
    if (!schedule?.startAt || !schedule?.endAt) return ''
    const tz = schedule.timezone
    if (schedule.mode === 'SLOTS') return `${countOf(schedule.slots?.length || 0, 'time slot')}, the first on ${formatDateTime(schedule.startAt, tz)}. ${schedule.durationMinutes} minutes each.`
    if (schedule.mode === 'FLEXIBLE') return `Open from ${formatDateTime(schedule.startAt, tz)} to ${formatDateTime(schedule.endAt, tz)}. A candidate can start at any time in between and gets ${schedule.durationMinutes} minutes.`
    return `Starts ${formatDateTime(schedule.startAt, tz)} for everyone. ${schedule.durationMinutes} minutes.`
}

// A round the organizer picked as `TEST_AI` (test + AI interview) is stored as a TEST round that has an AI part.
export const serverKind = (kind) => (kind === 'TEST_AI' ? 'TEST' : kind)
