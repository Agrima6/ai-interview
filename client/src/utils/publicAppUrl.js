// Candidate-facing links must never leak localhost/portal-dev prefixes (CLAUDE.md §6). Set
// VITE_PUBLIC_APP_URL in production; window.location.origin is only a local-dev fallback so
// this keeps working with zero config on a laptop.
const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '')

export function buildPublicApplyUrl(publicLink) {
  if (!publicLink) return ''
  return `${PUBLIC_APP_URL}/apply/${publicLink}`
}

// The page a candidate opens to sit an Online Assessment round. The round id travels in the link, so the candidate
// only types their email and access code.
// The open registration link: candidates register themselves here and wait for the organizer's approval.
export function buildJoinUrl(token) {
  return token ? `${PUBLIC_APP_URL}/oa/join/${token}` : ''
}

export function buildExamUrl(roundId) {
  return roundId ? `${PUBLIC_APP_URL}/oa/exam?a=${roundId}` : `${PUBLIC_APP_URL}/oa/exam`
}
