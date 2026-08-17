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

        if (field.required && (value === undefined || value === null || value === "")) {
            errors.push({ fieldKey: field.key, message: `${field.label} is required.` })
        }
        if (value !== undefined && value !== null && value !== "") {
            if (field.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push({ fieldKey: field.key, message: `${field.label} must be a valid email.` })
            if (field.type === "NUMBER" && typeof value !== "number") errors.push({ fieldKey: field.key, message: `${field.label} must be a number.` })
            if (field.validation?.minLength && String(value).length < field.validation.minLength) errors.push({ fieldKey: field.key, message: `${field.label} is too short.` })
            if (field.validation?.maxLength && String(value).length > field.validation.maxLength) errors.push({ fieldKey: field.key, message: `${field.label} is too long.` })
        }
    }
    return errors
}
