// A form definition can omit validation.maxLength on a text field entirely -
// this is the backstop so a value still can't be arbitrarily long even when
// the admin who built the form forgot to set one.
const DEFAULT_MAX_LENGTH = 5000

// Server-side re-validation against the exact stored form version. Frontend
// validation is UX only - this is the real gate before a submission is
// accepted, per the spec's "never trust frontend validation" rule.
export const validateAgainstFormVersion = (formVersion, data, files = []) => {
    const errors = []
    const allFields = formVersion.sections.flatMap((s) => s.fields)
    const knownKeys = new Set(allFields.map((f) => f.key))

    for (const key of Object.keys(data || {})) {
        if (!knownKeys.has(key)) errors.push({ fieldKey: key, message: "Unknown field." })
    }

    for (const field of allFields) {
        const value = data?.[field.key]
        const isFileType = ["FILE", "IMAGE", "MULTI_FILE"].includes(field.type)
        const providedFile = files.find((f) => f.fieldKey === field.key)

        if (field.required) {
            const missing = isFileType ? !providedFile : (value === undefined || value === null || String(value).trim() === "")
            if (missing) errors.push({ fieldKey: field.key, message: `${field.label} is required.` })
        }

        if (!isFileType && value !== undefined && value !== null && value !== "") {
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
            if (field.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push({ fieldKey: field.key, message: `${field.label} must be a valid email.` })
            if (field.type === "PHONE" && !/^[6-9][0-9]{9}$/.test(value)) errors.push({ fieldKey: field.key, message: `${field.label} must be a valid 10-digit mobile number.` })
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
