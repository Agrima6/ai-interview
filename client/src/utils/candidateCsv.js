// Minimal RFC4180-ish CSV parser/writer for candidate import - separate
// from utils/csv.js (that one is a different, employee-CSV-specific parser
// already used by AdminPanel.jsx with its own header-alias scheme; this
// file must not collide with it).
export function parseCsv(text) {
    const rows = []
    let row = []
    let field = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        const next = text[i + 1]

        if (inQuotes) {
            if (char === '"' && next === '"') { field += '"'; i++ }
            else if (char === '"') { inQuotes = false }
            else { field += char }
        } else if (char === '"') {
            inQuotes = true
        } else if (char === ',') {
            row.push(field); field = ''
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && next === '\n') i++
            row.push(field); field = ''
            if (row.length > 1 || row[0] !== '') rows.push(row)
            row = []
        } else {
            field += char
        }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row) }

    if (rows.length === 0) return { headers: [], records: [] }
    const headers = rows[0].map((h) => h.trim())
    const records = rows.slice(1)
        .filter((r) => r.some((v) => v.trim() !== ''))
        .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
    return { headers, records }
}

const escapeCsvField = (value) => {
    const str = String(value ?? '')
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function toCsv(headers, rows) {
    const lines = [headers.join(',')]
    for (const row of rows) lines.push(headers.map((h) => escapeCsvField(row[h])).join(','))
    return lines.join('\n')
}

export function downloadCsv(filename, headers, rows) {
    const blob = new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
