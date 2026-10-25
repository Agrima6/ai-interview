// Turns pasted or uploaded CSV text into student rows, each with the problems that would stop it being added.
const COLUMNS = ['name', 'email', 'phone', 'rollNumber', 'branch', 'batch']
const ALIASES = { name: 'name', fullname: 'name', studentname: 'name', email: 'email', emailaddress: 'email', phone: 'phone', mobile: 'phone', phonenumber: 'phone', roll: 'rollNumber', rollno: 'rollNumber', rollnumber: 'rollNumber', enrollment: 'rollNumber', enrollmentno: 'rollNumber', branch: 'branch', department: 'branch', batch: 'batch', year: 'batch' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const splitLine = (line) => line.split(/,|\t/).map((c) => c.trim().replace(/^"|"$/g, ''))

// Parses pasted/uploaded text into students. A first row that names columns (name, email, roll number ...) sets the
// order; otherwise the columns are name, email, phone, roll number, branch, batch.
export const parseStudents = (text) => {
    const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return []
    const first = splitLine(lines[0]).map((c) => ALIASES[c.toLowerCase().replace(/[^a-z]/g, '')])
    const hasHeader = first.filter(Boolean).length >= 2
    const order = hasHeader ? first : COLUMNS
    return (hasHeader ? lines.slice(1) : lines).map((line, i) => {
        const cells = splitLine(line)
        const row = { line: i + (hasHeader ? 2 : 1) }
        order.forEach((key, idx) => { if (key && cells[idx]) row[key] = cells[idx] })
        const problems = []
        if (!row.name) problems.push('name missing')
        if (!row.email || !EMAIL.test(row.email)) problems.push('invalid email')
        if (row.phone && !/^\d{10}$/.test(row.phone)) problems.push('phone must be 10 digits')
        return { ...row, email: row.email?.toLowerCase(), problems }
    })
}

