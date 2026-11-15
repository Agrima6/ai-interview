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


export const TYPE_LABELS = { MCQ: 'Single choice', MSQ: 'Multiple choice', SHORT: 'Short answer', LONG: 'Long answer', CODING: 'Coding' }
export const LANGUAGES = [['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['python', 'Python'], ['java', 'Java'], ['cpp', 'C++'], ['c', 'C'], ['go', 'Go'], ['sql', 'SQL']]

export const inputClass = 'w-full bg-card border-[1.5px] border-line rounded-[12px] px-3.5 py-2.5 text-[14px] text-ink placeholder:text-text-secondary/70 outline-none transition-all hover:border-accent/35 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-50'

export const downloadText = (filename, text, type = 'text/csv;charset=utf-8') => {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
