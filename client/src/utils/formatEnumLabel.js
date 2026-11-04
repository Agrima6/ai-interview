// Turns a raw backend enum value (e.g. "SOFTWARE_ENGINEERING") into a
// human-readable label ("Software Engineering"). Single source of truth so
// enum-like fields (role, department, experience band, ...) are never shown
// raw in the UI - integration.md section 8/49.
// Words that are acronyms/ampersand stand-ins rather than ordinary words.
const ACRONYMS = { hr: 'HR', ai: 'AI', it: 'IT', qa: 'QA', ui: 'UI', ux: 'UX', cv: 'CV', mcq: 'MCQ', sde: 'SDE' }

export function formatEnumLabel(value) {
  if (!value || typeof value !== 'string') return ''
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => ACRONYMS[word] || word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
