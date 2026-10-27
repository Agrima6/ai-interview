// The auth API returns the person's name as `name` (older shapes used `displayName`). Never fall back to showing the
// raw email: derive something readable from its local part, or a neutral label if there is nothing at all.
const prettifyLocalPart = (email) => {
    const local = String(email || '').split('@')[0]
    return local.replace(/[._+-]+/g, ' ').replace(/\d+/g, ' ').trim().replace(/\s+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const resolveCandidateName = (user) => {
    const name = (user?.name || user?.displayName || '').trim()
    // Some accounts were provisioned with the email address as the name; treat that as "no name".
    if (name && !name.includes('@')) return name
    return prettifyLocalPart(name || user?.email) || 'Candidate'
}

export const firstNameOf = (fullName) => String(fullName || '').trim().split(/\s+/)[0] || 'there'

export const initialOf = (fullName) => (String(fullName || '').trim().charAt(0) || '?').toUpperCase()
