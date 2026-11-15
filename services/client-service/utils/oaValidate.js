import { ApiError } from "./response.js"

// Every limit the Online Assessment room enforces lives here. The client mirrors these numbers in
// client/src/components/oa/oaRules.js so the form and the server can never disagree.
export const LIMITS = Object.freeze({
    title: { min: 3, max: 140 },
    roundLabel: { max: 60 },
    description: { max: 2000 },
    instructions: { max: 4000 },
    orgName: { min: 2, max: 120 },
    personName: { min: 2, max: 80 },
    studentName: { min: 2, max: 100 },
    rollNumber: { max: 40 },
    passPercent: { min: 0, max: 100 },
    maxViolations: { min: 1, max: 10 },
    snapshotIntervalSec: { min: 15, max: 300 },
    durationMinutes: { min: 5, max: 360 },
    lateEntryMinutes: { min: 0, max: 120 },
    slotCapacity: { min: 1, max: 5000 },
    slots: { min: 1, max: 40 },
    aiCount: { min: 1, max: 25 },
    sections: { max: 12 },
})

export const PHONE_RE = /^\d{10}$/
// Letters (any script), spaces and the punctuation real names carry. No digits or symbols.
export const PERSON_NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u

/** "+91 98765-43210", "098765 43210" and "9876543210" all become "9876543210"; anything else returns null. */
export const normalizePhone = (value) => {
    let digits = String(value ?? "").replace(/[\s().-]/g, "")
    if (digits.startsWith("+91")) digits = digits.slice(3)
    else if (/^91\d{10}$/.test(digits)) digits = digits.slice(2)
    else if (/^0\d{10}$/.test(digits)) digits = digits.slice(1)
    return PHONE_RE.test(digits) ? digits : null
}

export const phoneProblem = (value, { required = false } = {}) => {
    const raw = String(value ?? "").trim()
    if (!raw) return required ? "Enter a 10-digit mobile number." : null
    return normalizePhone(raw) ? null : "Mobile number must be exactly 10 digits."
}

export const nameProblem = (value, { min = 2, max = 100, label = "Name" } = {}) => {
    const text = String(value ?? "").trim()
    if (text.length < min) return `${label} must be at least ${min} characters.`
    if (text.length > max) return `${label} can be at most ${max} characters.`
    if (!PERSON_NAME_RE.test(text)) return `${label} can contain letters, spaces and . ' - only.`
    return null
}

/** Whole number in range, or a field error. Never clamps: a wrong value is reported, not quietly changed. */
export const intInRange = (value, { min, max, field, label }) => {
    const text = String(value ?? "").trim()
    const n = Number(text)
    if (text === "" || !Number.isInteger(n) || n < min || n > max) {
        const message = `${label} must be a whole number between ${min} and ${max}.`
        throw new ApiError(400, "VALIDATION_ERROR", message, { [field]: message })
    }
    return n
}

/** Collects field errors and throws once, with the first message as the headline. */
export const throwFields = (fields) => {
    const keys = Object.keys(fields)
    if (keys.length) throw new ApiError(400, "VALIDATION_ERROR", fields[keys[0]], fields)
}

export const textLength = (value, { max, field, label }) => {
    const text = String(value ?? "").trim()
    if (text.length > max) {
        const message = `${label} can be at most ${max} characters.`
        throw new ApiError(400, "VALIDATION_ERROR", message, { [field]: message })
    }
    return text
}
