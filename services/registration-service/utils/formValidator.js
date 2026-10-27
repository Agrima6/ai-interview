// A form definition can omit validation.maxLength on a text field entirely -
// this is the backstop so a value still can't be arbitrarily long even when
// the admin who built the form forgot to set one.
const DEFAULT_MAX_LENGTH = 5000

// Contact numbers are validated as phone numbers even when the form definition typed the field as plain text
// (company contact number, contact-person mobile, ...), so a bad number can't slip in through a mis-typed field.
const PHONE_KEY = /(^|_)(phone|mobile|contact_?(no|number)|whatsapp)(_|$)/i
const isPhoneField = (field) => field.type === "PHONE" || (["TEXT", "NUMBER"].includes(field.type) && PHONE_KEY.test(field.key || ""))

// Server-side re-validation against the exact published registration form.
// Frontend validation is UX only.
export const validateAgainstFormVersion = (formVersion, data) => {
    const errors = []
    const allFields = formVersion.sections.flatMap((s) => s.fields)
    const knownKeys = new Set(allFields.map((f) => f.key))

    for (const key of Object.keys(data || {})) {
        if (!knownKeys.has(key)) errors.push({ fieldKey: key, message: "Unknown field." })
    }

    for (const field of allFields) {
        if (field.visibility?.field && String(data?.[field.visibility.field] ?? "") !== String(field.visibility.equals)) continue
        const value = data?.[field.key]
        const isFileType = ["FILE", "IMAGE", "MULTI_FILE"].includes(field.type)
        if (isFileType) continue // file upload isn't part of the registration step in this slice

        if (field.required && (value === undefined || value === null || String(value).trim() === "")) {
            errors.push({ fieldKey: field.key, message: `${field.label} is required.` })
        }
        if (value !== undefined && value !== null && value !== "") {
            if (field.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push({ fieldKey: field.key, message: `${field.label} must be a valid email.` })
            if (isPhoneField(field)) {
                // Stored as the bare 10 digits whatever the person typed (+91, spaces, dashes).
                const digits = String(value).replace(/[\s-]/g, "").replace(/^\+?91/, "")
                if (!/^[6-9][0-9]{9}$/.test(digits)) errors.push({ fieldKey: field.key, message: `${field.label} must be a valid 10-digit mobile number.` })
                else data[field.key] = digits
            }
            if (field.type === "NUMBER") {
                const num = Number(value)
                if (isNaN(num) || !Number.isInteger(num)) {
                    errors.push({ fieldKey: field.key, message: `${field.label} must be a whole number.` })
                } else {
                    const min = field.validation?.min ?? 0
                    const max = field.validation?.max
                    if (num < min) errors.push({ fieldKey: field.key, message: `${field.label} must be at least ${min}.` })
                    else if (max !== undefined && num > max) errors.push({ fieldKey: field.key, message: `${field.label} must be at most ${max}.` })
                    else data[field.key] = num
                }
            }
            if (field.validation?.minLength && String(value).length < field.validation.minLength) errors.push({ fieldKey: field.key, message: `${field.label} is too short.` })
            const maxLength = field.validation?.maxLength || DEFAULT_MAX_LENGTH
            if (String(value).length > maxLength) errors.push({ fieldKey: field.key, message: `${field.label} is too long.` })
            if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
                errors.push({ fieldKey: field.key, message: field.validation.patternMessage || `${field.label} is not a valid format.` })
            }
        }
    }
    return errors
}
