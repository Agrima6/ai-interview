// A form definition can omit validation.maxLength on a text field entirely -
// this is the backstop so a value still can't be arbitrarily long even when
// the admin who built the form forgot to set one.
const DEFAULT_MAX_LENGTH = 5000

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
        const value = data?.[field.key]
        const isFileType = ["FILE", "IMAGE", "MULTI_FILE"].includes(field.type)
        if (isFileType) continue // file upload isn't part of the registration step in this slice

        if (field.required && (value === undefined || value === null || String(value).trim() === "")) {
            errors.push({ fieldKey: field.key, message: `${field.label} is required.` })
        }
        if (value !== undefined && value !== null && value !== "") {
            if (field.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push({ fieldKey: field.key, message: `${field.label} must be a valid email.` })
            if (field.type === "NUMBER") {
                const num = Number(value)
                if (isNaN(num)) {
                    errors.push({ fieldKey: field.key, message: `${field.label} must be a number.` })
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
        }
    }
    return errors
}
