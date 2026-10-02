// Single source of truth for the dynamic tags a communication template body
// can reference - integration.md section 26. Keys match what
// renderWithSamples()/the backend substitution expect ({{key}} or {key}).
export const TEMPLATE_VARIABLES = [
  { key: 'candidate_name', label: 'Candidate Name', sample: 'Aarav Sharma' },
  { key: 'drive_title', label: 'Drive / Role Title', sample: 'Senior Backend Engineer' },
  { key: 'company_name', label: 'Company Name', sample: 'Your Organization' },
  { key: 'interview_link', label: 'Interview Link', sample: 'https://workmateiq.com/apply/sample123abc' },
  { key: 'expiry_date', label: 'Expiry Date', sample: new Date(Date.now() + 14 * 86400000).toLocaleDateString() },
]

export const TEMPLATE_VARIABLE_TAGS = TEMPLATE_VARIABLES.map((v) => `{${v.key}}`)

export const TEMPLATE_SAMPLE_VALUES = Object.fromEntries(TEMPLATE_VARIABLES.map((v) => [v.key, v.sample]))

// Handles both {var} and {{var}} interpolation styles.
export const renderWithSamples = (text, values = TEMPLATE_SAMPLE_VALUES) =>
  (text || '').replace(/\{\{?\s*(\w+)\s*\}?\}/g, (match, key) => (key in values ? values[key] : match))
