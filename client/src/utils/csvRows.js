// A small RFC-4180 style CSV reader for the import dialogs. Handles what real spreadsheet exports contain: a UTF-8
// byte-order mark, comma / semicolon / tab delimiters, quoted cells with commas, quotes ("") and line breaks inside,
// and CRLF / LF / CR row endings. Blank rows are dropped and cells are trimmed.
const DELIMITERS = [',', ';', '\t']

export const detectDelimiter = (text) => {
    // Count each candidate outside quotes on the first non-empty line.
    const firstLine = []
    let inQuotes = false
    for (const ch of text) {
        if (ch === '"') inQuotes = !inQuotes
        if (!inQuotes && (ch === '\n' || ch === '\r')) { if (firstLine.length) break; continue }
        firstLine.push(ch)
    }
    let best = ','
    let bestCount = 0
    for (const d of DELIMITERS) {
        let count = 0
        let q = false
        for (const ch of firstLine) { if (ch === '"') q = !q; else if (!q && ch === d) count += 1 }
        if (count > bestCount) { best = d; bestCount = count }
    }
    return best
}

export const parseCsv = (input) => {
    const text = String(input ?? '').replace(/^\uFEFF/, '')
    const delimiter = detectDelimiter(text)
    const rows = []
    let row = []
    let cell = ''
    let inQuotes = false
    const endCell = () => { row.push(cell.trim()); cell = '' }
    const endRow = () => { endCell(); if (row.some((c) => c !== '')) rows.push(row); row = [] }

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i]
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') { cell += '"'; i += 1 } else inQuotes = false
            } else cell += ch
        } else if (ch === '"' && cell === '') {
            inQuotes = true
        } else if (ch === delimiter) {
            endCell()
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i += 1
            endRow()
        } else cell += ch
    }
    if (cell !== '' || row.length) endRow()
    return { rows, delimiter }
}
