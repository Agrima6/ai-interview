// Every limit on an Online Assessment form. These mirror services/client-service/utils/oaValidate.js: the server is
// the authority and re-checks everything, this file only lets the form say so before the request is sent.

export const LIMITS = Object.freeze({
    title: { min: 3, max: 140 },
    roundLabel: { max: 60 },
    description: { max: 2000 },
    instructions: { max: 4000 },
    orgName: { min: 2, max: 120 },
    personName: { min: 2, max: 80 },
    studentName: { min: 2, max: 100 },
    rollNumber: { max: 40 },
    purpose: { max: 500 },
    passPercent: { min: 0, max: 100 },
    maxViolations: { min: 1, max: 10 },
    snapshotIntervalSec: { min: 15, max: 300 },
    durationMinutes: { min: 5, max: 360 },
    lateEntryMinutes: { min: 0, max: 120 },
    slotCapacity: { min: 1, max: 5000 },
    slots: { min: 1, max: 40 },
    aiCount: { min: 1, max: 25 },
    aiPrompt: { min: 10, max: 2000 },
    questionText: { max: 4000 },
    marks: { min: 0.5, max: 100 },
    options: { min: 2, max: 8 },
    sectionTitle: { max: 80 },
    nextRoundTop: { min: 1, max: 100000 },
})

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PERSON_NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u

/** "+91 98765-43210" and "9876543210" both become "9876543210"; anything else is null. */
export const normalizePhone = (value) => {
    let digits = String(value ?? '').replace(/[\s().-]/g, '')
    if (digits.startsWith('+91')) digits = digits.slice(3)
    else if (/^91\d{10}$/.test(digits)) digits = digits.slice(2)
    else if (/^0\d{10}$/.test(digits)) digits = digits.slice(1)
    return /^\d{10}$/.test(digits) ? digits : null
}

// Each check returns a message, or '' when the value is fine, so forms can drop them straight into an error prop.
export const phoneError = (value, { required = false } = {}) => {
    const raw = String(value ?? '').trim()
    if (!raw) return required ? 'Enter a 10-digit mobile number.' : ''
    return normalizePhone(raw) ? '' : 'Mobile number must be exactly 10 digits.'
}

export const nameError = (value, { min = 2, max = 100, label = 'Name' } = {}) => {
    const text = String(value ?? '').trim()
    if (text.length < min) return text ? `${label} must be at least ${min} characters.` : `${label} is required.`
    if (text.length > max) return `${label} can be at most ${max} characters.`
    if (!PERSON_NAME_RE.test(text)) return `${label} can contain letters, spaces and . ' - only.`
    return ''
}

export const emailError = (value, { required = true } = {}) => {
    const text = String(value ?? '').trim()
    if (!text) return required ? 'Email is required.' : ''
    return text.length <= 200 && EMAIL_RE.test(text) ? '' : 'Enter a valid email address.'
}

export const lengthError = (value, { min = 0, max, label }) => {
    const n = String(value ?? '').trim().length
    if (n < min) return n ? `${label} must be at least ${min} characters.` : `${label} is required.`
    if (n > max) return `${label} can be at most ${max} characters.`
    return ''
}

/** Whole numbers by default; pass decimals: true for marks. */
export const rangeError = (value, { min, max, label = 'This', decimals = false, required = true }) => {
    const text = String(value ?? '').trim()
    if (text === '') return required ? `${label} is required.` : ''
    const n = Number(text)
    const shape = decimals ? 'a number' : 'a whole number'
    if (!Number.isFinite(n) || (!decimals && !Number.isInteger(n))) return `${label} must be ${shape} between ${min} and ${max}.`
    if (n < min || n > max) return `${label} must be between ${min} and ${max}.`
    return ''
}

/** Keep only what a numeric field may hold while the user types. */
export const digitsOnly = (value, maxLength) => String(value ?? '').replace(/\D/g, '').slice(0, maxLength)
export const decimalOnly = (value) => {
    const cleaned = String(value ?? '').replace(/[^\d.]/g, '')
    const [whole, ...rest] = cleaned.split('.')
    return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole.slice(0, 6)
}

/**
 * What a phone box keeps while typing: digits only, never more than ten. A pasted "+91 98765 43210" or "098765 43210"
 * loses its prefix, so the box always holds exactly what will be stored.
 */
export const tidyPhone = (raw) => {
    let digits = String(raw ?? '').replace(/\D/g, '')
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
    return digits.slice(0, 10)
}

/** On leaving the box, "+91 98765 43210" is shown as the plain ten digits that will be stored. */
export const settlePhone = (value) => normalizePhone(value) || value

// What each kind of text box keeps while the user types. A character that is not allowed never appears, so a form
// cannot be filled in wrongly and then refused: the same rule is checked again on submit and on the server.
const keep = (pattern, max) => (raw) => String(raw ?? '').replace(pattern, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ').slice(0, max)

export const FILTERS = Object.freeze({
    /** People's names: letters of any script, spaces and . ' - only. */
    personName: (raw, max = LIMITS.studentName.max) => keep(/[^\p{L}\p{M}\s.'’-]/gu, max)(raw).replace(/^[\s.'’-]+/, ''),
    /** Organization and college names: letters, digits and the punctuation company names carry. */
    orgName: keep(/[^\p{L}\p{M}\d\s.,&'’()/-]/gu, LIMITS.orgName.max),
    /** Drive, round and section names. */
    title: (raw, max = LIMITS.title.max) => keep(/[^\p{L}\p{M}\d\s.,&'’():/+#|-]/gu, max)(raw),
    /** Emails never contain spaces; anything else is left for the format check. */
    email: (raw) => String(raw ?? '').replace(/[^A-Za-z0-9.@_%+'-]/g, '').replace(/@(?=.*@)/g, '').slice(0, 200).toLowerCase(),
    /** Roll numbers and employee ids: letters, digits and - / _ . */
    rollNumber: (raw) => String(raw ?? '').replace(/[^A-Za-z0-9/_.-]/g, '').slice(0, LIMITS.rollNumber.max),
    /** Test ids and access codes: letters and digits only, shown in capitals. */
    code: (raw, max = 16) => String(raw ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, max).toUpperCase(),
    /** Comma-separated keywords. */
    keywords: (raw, max = 300) => String(raw ?? '').replace(/[^\p{L}\p{M}\d\s,.+#_-]/gu, '').replace(/^\s+/, '').slice(0, max),
})
