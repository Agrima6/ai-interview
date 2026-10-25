// Turning rows (typed by hand, pasted, or read from a CSV) into students ready to add to an exam: header mapping,
// per-row validation and duplicate detection - all in one place so every way of adding students behaves the same.
import { parseCsv } from './csvRows.js'

export const MAX_STUDENTS = 500
export const MAX_FILE_BYTES = 1024 * 1024

export const STUDENT_FIELDS = [
    { key: 'name', label: 'Name', required: true, aliases: ['name', 'studentname', 'fullname', 'candidatename', 'student'] },
    { key: 'email', label: 'Email', required: true, aliases: ['email', 'emailaddress', 'emailid', 'mail', 'mailid', 'collegeemail', 'officialemail'] },
    { key: 'phone', label: 'Phone', aliases: ['phone', 'phoneno', 'phonenumber', 'mobile', 'mobileno', 'mobilenumber', 'contact', 'contactno', 'whatsapp'] },
    { key: 'rollNumber', label: 'Roll number', aliases: ['rollnumber', 'rollno', 'roll', 'enrollment', 'enrollmentno', 'enrolmentno', 'registrationno', 'regno', 'usn', 'studentid', 'admissionno'] },
    { key: 'branch', label: 'Branch', aliases: ['branch', 'department', 'dept', 'stream', 'course', 'program', 'programme'] },
    { key: 'batch', label: 'Batch', aliases: ['batch', 'year', 'passoutyear', 'passingyear', 'graduationyear', 'admissionyear', 'class'] },
]

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// One field key per column ('' = ignore). Each field is used by at most one column - the first that matches.
export const autoMapHeaders = (headers) => {
    const used = new Set()
    return headers.map((h) => {
        const n = norm(h)
        const field = STUDENT_FIELDS.find((f) => !used.has(f.key) && f.aliases.includes(n))
        if (!field) return ''
        used.add(field.key)
        return field.key
    })
}

// True when the first row looks like column names rather than a student (it names at least name+email or 2 fields).
export const looksLikeHeader = (firstRow) => autoMapHeaders(firstRow).filter(Boolean).length >= 2

// +91 / 91 / 0 prefixes, spaces and dashes are all common in Indian phone numbers; keep the last 10 digits.
export const normalizePhone = (raw) => {
    const digits = String(raw ?? '').replace(/\D/g, '')
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
    return digits
}

export const cleanStudent = (s) => ({
    name: String(s.name ?? '').replace(/\s+/g, ' ').trim(),
    email: String(s.email ?? '').trim().toLowerCase(),
    phone: normalizePhone(s.phone),
    rollNumber: String(s.rollNumber ?? '').trim(),
    branch: String(s.branch ?? '').replace(/\s+/g, ' ').trim(),
    batch: String(s.batch ?? '').trim(),
})

export const problemsOf = (s) => {
    const p = []
    if (!s.name) p.push('name is missing')
    else if (s.name.length > 100) p.push('name is too long')
    if (!s.email) p.push('email is missing')
    else if (!EMAIL.test(s.email)) p.push('email is not valid')
    if (s.phone && !/^\d{10}$/.test(s.phone)) p.push('phone must be 10 digits')
    if (s.rollNumber.length > 40) p.push('roll number is too long')
    if (s.branch.length > 80) p.push('branch is too long')
    if (s.batch.length > 40) p.push('batch is too long')
    return p
}

// rows -> students. `mapping[i]` is the field key for column i. `firstRowNumber` is the spreadsheet row of rows[0].
export const studentsFromRows = (rows, mapping, firstRowNumber = 1) => rows.map((cells, i) => {
    const raw = {}
    mapping.forEach((key, col) => { if (key && cells[col] != null && cells[col] !== '') raw[key] = cells[col] })
    return { ...cleanStudent(raw), rowNumber: firstRowNumber + i }
})

// Marks each student ok / invalid / duplicate. `existing` is what the exam already holds ({emails, phones, rolls}
// as lowercase Sets): a student matching it, or an earlier row in the same list, is a duplicate and is skipped.
export const classify = (students, existing = {}) => {
    const emails = new Set(existing.emails || [])
    const phones = new Set(existing.phones || [])
    const rolls = new Set(existing.rolls || [])
    return students.map((s) => {
        const problems = problemsOf(s)
        if (problems.length) return { ...s, status: 'invalid', reason: problems.join(', ') }
        const roll = s.rollNumber.toLowerCase()
        const dup = emails.has(s.email) ? 'email already added'
            : s.phone && phones.has(s.phone) ? 'phone already added'
                : roll && rolls.has(roll) ? 'roll number already added' : null
        if (dup) return { ...s, status: 'duplicate', reason: dup }
        emails.add(s.email)
        if (s.phone) phones.add(s.phone)
        if (roll) rolls.add(roll)
        return { ...s, status: 'ok', reason: '' }
    })
}

export const SAMPLE_CSV = [
    'Name,Email,Phone,Roll Number,Branch,Batch',
    'Asha Verma,asha.verma@college.edu,9876543210,21CS001,Computer Science & Engineering,2025',
    'Rohan Iyer,rohan.iyer@college.edu,+91 98765 43211,21IT014,Information Technology,2025',
    '"Meera Nair",meera.nair@college.edu,,21EC007,"Electronics & Communication",2025',
].join('\n')

// Column order assumed when a file has no header row: name, email, phone, roll number, branch, batch, then ignored.
export const defaultMapping = (width) => Array.from({ length: width }, (_, i) => STUDENT_FIELDS[i]?.key || '')

// File text -> { raw, headers, rows, mapping, hasHeader, delimiter }. Without a header row the default column order is
// name, email, phone, roll number, branch, batch.
// raw rows + whether the first row is a header -> { headers, rows, mapping } (used again when the person flips the toggle)
export const splitFile = (raw, hasHeader, width = Math.max(0, ...raw.map((r) => r.length))) => ({
    headers: hasHeader ? Array.from({ length: width }, (_, i) => raw[0][i] || `Column ${i + 1}`) : Array.from({ length: width }, (_, i) => `Column ${i + 1}`),
    rows: hasHeader ? raw.slice(1) : raw,
    mapping: hasHeader ? autoMapHeaders(Array.from({ length: width }, (_, i) => raw[0][i] || '')) : defaultMapping(width),
})

export const readStudentFile = (text) => {
    const { rows, delimiter } = parseCsv(text)
    if (!rows.length) return { raw: [], headers: [], rows: [], mapping: [], hasHeader: false, delimiter }
    const hasHeader = looksLikeHeader(rows[0])
    const width = Math.max(...rows.map((r) => r.length))
    return { raw: rows, ...splitFile(rows, hasHeader, width), hasHeader, delimiter }
}
