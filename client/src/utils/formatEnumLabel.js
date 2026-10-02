// Turns a raw backend enum value (e.g. "SOFTWARE_ENGINEERING") into a
// human-readable label ("Software Engineering"). Single source of truth so
// enum-like fields (role, department, experience band, ...) are never shown
// raw in the UI - integration.md section 8/49.
export function formatEnumLabel(value) {
  if (!value || typeof value !== 'string') return ''
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
