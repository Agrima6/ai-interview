// Minimal CSV parser (handles quoted fields, escaped "" quotes, commas/newlines
// inside quotes) - good enough for a "name,email,department..." employee sheet
// without pulling in a dependency for it.
const parseRows = (text) => {
    const rows = []
    let row = []
    let field = ""
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') { field += '"'; i++ }
                else inQuotes = false
            } else {
                field += char
            }
        } else if (char === '"') {
            inQuotes = true
        } else if (char === ",") {
            row.push(field); field = ""
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") i++
            row.push(field); field = ""
            rows.push(row); row = []
        } else {
            field += char
        }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
    return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

// Maps flexible real-world header spellings to our field names.
const HEADER_ALIASES = {
    name: ["name", "full name", "employee name"],
    email: ["email", "email address"],
    department: ["department", "dept"],
    assignedRole: ["role", "assignedrole", "interview role", "job role", "position"],
    assignedExperience: ["experience", "assignedexperience", "experience level"],
    assignedMode: ["mode", "interview type", "assignedmode", "interview mode"],
    assignedContext: ["context", "job description", "assignedcontext", "notes", "focus areas"],
}

const resolveField = (header) => {
    const normalized = header.trim().toLowerCase()
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.includes(normalized)) return field
    }
    return null
}

// Parses raw CSV text into an array of {name, email, department, assignedRole,
// assignedExperience, assignedMode, assignedContext} objects, ignoring any
// unrecognized columns.
export const parseEmployeeCsv = (text) => {
    const rows = parseRows(text.trim())
    if (rows.length < 2) return []

    const fields = rows[0].map(resolveField)
    return rows.slice(1).map((row) => {
        const obj = {}
        fields.forEach((field, i) => {
            if (field && row[i] !== undefined) obj[field] = row[i].trim()
        })
        return obj
    }).filter((obj) => obj.name || obj.email)
}
