// Candidate-facing links must never leak localhost/portal-dev prefixes (CLAUDE.md §6). Set
// VITE_PUBLIC_APP_URL in production; window.location.origin is only a local-dev fallback so
// this keeps working with zero config on a laptop.
const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '')

export function buildPublicApplyUrl(publicLink) {
  if (!publicLink) return ''
  return `${PUBLIC_APP_URL}/apply/${publicLink}`
}
