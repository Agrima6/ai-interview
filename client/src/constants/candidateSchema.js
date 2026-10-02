// Single source of truth for what a "candidate record" is - integration.md
// section 20. CandidateImportModal (CSV mapping + verification), the
// sample CSV template it offers, and the Candidates table all read field
// definitions from here instead of each hardcoding its own copy of
// name/email/phone/exp, so adding or renaming a field only happens once.
//
// Mirrors the backend's CandidateRosterSchema (services/client-service/
// models/interviewDrive.model.js) field-for-field. `key` must match the
// property name the backend candidate object actually uses.
export const CANDIDATE_FIELDS = [
  {
    key: 'name',
    label: 'Full Name',
    type: 'text',
    required: true,
    sample: 'Aarav Sharma',
    importAliases: ['name', 'full name', 'candidate name'],
  },
  {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    required: true,
    sample: 'aarav.sharma@example.com',
    importAliases: ['email'],
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || ''),
    invalidMessage: 'Missing/invalid Email',
  },
  {
    key: 'phone',
    label: 'Phone',
    type: 'phone',
    required: false,
    sample: '+91-9876543210',
    importAliases: ['phone', 'mobile', 'contact'],
    // Loose on purpose - candidate phone numbers arrive in every country/
    // formatting convention (spaces, dashes, parens, leading +). This only
    // rejects things that clearly aren't a phone number (letters, too short).
    validate: (value) => !value || /^\+?[\d\s\-()]{7,18}$/.test(value),
    invalidMessage: 'Invalid phone number',
  },
  {
    key: 'exp',
    label: 'Experience',
    type: 'text',
    required: false,
    sample: '4',
    importAliases: ['exp', 'experience'],
    // Accepts "4", "4.5", "4 years", "4yrs" etc. - whatever an admin's
    // spreadsheet happens to use - but rejects free text that isn't a
    // number at all (e.g. "Senior").
    validate: (value) => !value || /^\d+(\.\d+)?\s*(yrs?|years?)?$/i.test(value),
    invalidMessage: 'Invalid experience value',
  },
]

export const REQUIRED_CANDIDATE_FIELDS = CANDIDATE_FIELDS.filter((f) => f.required)

export const candidateFieldByKey = (key) => CANDIDATE_FIELDS.find((f) => f.key === key)

// Guesses the likely source column for each field from a file's actual
// headers, so the import mapping step starts pre-filled instead of forcing
// an admin to map every column by hand.
export const guessCandidateMapping = (headers) => {
  const find = (aliases) => headers.find((h) => aliases.some((a) => h.toLowerCase().includes(a))) || ''
  return Object.fromEntries(CANDIDATE_FIELDS.map((f) => [`${f.key}Header`, find(f.importAliases)]))
}

// Returns { severity: 'VALID' | 'WARNING' | 'INVALID', issues: [{text, severity}] }
// for one candidate record. A missing/invalid REQUIRED field, or an email
// duplicating another row's, blocks import (INVALID); an invalid OPTIONAL
// field is flagged but still importable (WARNING).
export const validateCandidateRecord = (record, seenEmails = new Set()) => {
  const issues = []

  for (const field of CANDIDATE_FIELDS) {
    const value = record[field.key]
    if (field.required && !value?.trim()) {
      issues.push({ text: `Empty ${field.label} Field`, severity: 'INVALID' })
      continue
    }
    if (field.validate && value && !field.validate(value)) {
      issues.push({ text: field.invalidMessage || `Invalid ${field.label}`, severity: field.required ? 'INVALID' : 'WARNING' })
    }
  }

  if (record.email && seenEmails.has(record.email.toLowerCase())) {
    issues.push({ text: 'Duplicate email in this file', severity: 'INVALID' })
  }

  const severity = issues.some((i) => i.severity === 'INVALID') ? 'INVALID' : issues.length ? 'WARNING' : 'VALID'
  return { severity, issues }
}

export const CANDIDATE_SAMPLE_ROWS = [
  Object.fromEntries(CANDIDATE_FIELDS.map((f) => [f.label, f.sample])),
  { 'Full Name': 'Priya Patel', 'Email Address': 'priya.patel@example.com', 'Phone': '+91-9812345678', 'Experience': '3' },
]
