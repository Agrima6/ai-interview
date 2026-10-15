// One place that decides which noun user-facing copy (emails, shared-link messages) uses for an entity type.
// Copy only: URLs, tokens and permissions never depend on this.
const NOUN_BY_TYPE = {
    ORGANIZATION: "organization",
    COLLEGE: "institution",
}

// Documented default for a type that is absent or unknown: "organization". Types the product never sends a
// shared link for (CANDIDATE) deliberately fall back to it too rather than inventing a third noun.
export const entityNounFor = (type) => NOUN_BY_TYPE[String(type || "").toUpperCase()] || "organization"

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// "your organization" / "your institution", used when the entity's own name is unavailable.
export const fallbackClientName = (type) => `your ${entityNounFor(type)}`
