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
            const missing = isFileType ? !providedFile : (value === undefined || value === null || value === "")
            if (missing) errors.push({ fieldKey: field.key, message: `${field.label} is required.` })
        }

        if (!isFileType && value !== undefined && value !== null && value !== "") {
            if (field.type === "NUMBER") {
                const num = Number(value)
                if (isNaN(num)) {
                    errors.push({ fieldKey: field.key, message: `${field.label} must be a number.` })
                } else {
                    data[field.key] = num
                }
            }
            if (field.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push({ fieldKey: field.key, message: `${field.label} must be a valid email.` })
            if (field.validation?.minLength && String(value).length < field.validation.minLength) errors.push({ fieldKey: field.key, message: `${field.label} is too short.` })
            if (field.validation?.maxLength && String(value).length > field.validation.maxLength) errors.push({ fieldKey: field.key, message: `${field.label} is too long.` })
            if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) errors.push({ fieldKey: field.key, message: `${field.label} is not a valid format.` })
        }
    }

    return errors
}
