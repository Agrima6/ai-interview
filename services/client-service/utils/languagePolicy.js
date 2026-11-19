import { INTERVIEW_LANGUAGE_CODES, isInterviewLanguage } from "./interviewLanguages.js"

// What the hiring team decides about languages for an interview drive:
//   defaultLanguage - what the interview starts in unless the candidate picks another
//   allowed         - the languages offered; an empty list means every supported language
//   allowSwitch     - whether the candidate may change language during the interview (by asking the interviewer)
export const DEFAULT_LANGUAGE_POLICY = Object.freeze({ defaultLanguage: "en", allowed: [], allowSwitch: true })

/** A clean policy from whatever was sent: unknown languages dropped, the default always among the allowed ones. */
export const cleanLanguagePolicy = (raw) => {
    const given = raw && typeof raw === "object" ? raw : {}
    const allowed = [...new Set((Array.isArray(given.allowed) ? given.allowed : []).map(String).filter(isInterviewLanguage))]
    const everything = allowed.length === 0 || allowed.length === INTERVIEW_LANGUAGE_CODES.length
    const wanted = isInterviewLanguage(given.defaultLanguage) ? given.defaultLanguage : (allowed[0] || "en")
    const defaultLanguage = everything || allowed.includes(wanted) ? wanted : allowed[0]
    return { defaultLanguage, allowed: everything ? [] : allowed, allowSwitch: given.allowSwitch !== false }
}

/** The policy of a drive (older drives have none: everything is allowed, and the candidate may switch). */
export const policyOf = (drive) => cleanLanguagePolicy(drive?.languagePolicy ? (drive.languagePolicy.toObject?.() || drive.languagePolicy) : DEFAULT_LANGUAGE_POLICY)

export const languageAllowed = (policy, code) => isInterviewLanguage(code) && (policy.allowed.length === 0 || policy.allowed.includes(code))

/** The language an interview starts in: the candidate's pick when the policy allows it, otherwise HR's default. */
export const startingLanguage = (policy, chosen) => (languageAllowed(policy, chosen) ? chosen : policy.defaultLanguage)
