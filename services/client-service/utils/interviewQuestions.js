// Which HR questions an AI interview is built from. One place, so the rule is testable and cannot drift.
//
// HR's questions live on the round (the source the edit screen writes) and are mirrored on the drive for round 1. The
// interview uses the round's own list; the drive-level list is only a fallback for round 1 and only when the round has
// none configured. Later rounds never inherit round 1's questions.

const clean = (list) => (Array.isArray(list) ? list : [])
    .map((q) => (q && typeof q.toObject === "function" ? q.toObject() : q))
    .filter((q) => q && String(q.text || q.question_text || "").trim())
    .map((q) => ({
        id: q.id ? String(q.id) : undefined,
        text: String(q.text || q.question_text).trim(),
        topic: q.topic ? String(q.topic).trim() : "",
        timeLimit: Number(q.timeLimit || q.time_limit) || undefined,
        followUps: q.followUps === undefined || q.followUps === null || q.followUps === "" ? 1 : Math.max(0, Math.min(3, Math.round(Number(q.followUps)) || 0)),
    }))

// An interview that has not begun yet is a plan on paper. If HR has changed their questions since it was built, it must be rebuilt,
// or the candidate is asked yesterday's questions. A plan matches when its HR questions are exactly HR's list (same words, same
// order, same follow-up count) and it holds nothing the interviewer invented.
const SPOKEN_ONLY = new Set(["introduction", "candidate_introduction"])
export function planMatchesHrQuestions(plan, hrQuestions) {
    const items = Array.isArray(plan?.questions) ? plan.questions.filter((q) => !SPOKEN_ONLY.has(q.type)) : []
    if (items.length !== hrQuestions.length) return false
    return items.every((q, i) => q.type === "hr" && String(q.question_text || "").trim() === hrQuestions[i].text && Number(q.max_followups) === hrQuestions[i].followUps)
}
export const NOT_STARTED = new Set(["CREATED", "PLANNED", "READY"])

export function resolveInterviewQuestions(round, drive) {
    const own = clean(round?.questions)
    if (own.length) return own
    const ownCustom = clean(round?.customQuestions)
    if (ownCustom.length) return ownCustom
    if (Number(round?.roundNumber) > 1) return []
    const inherited = clean(drive?.questions)
    if (inherited.length) return inherited
    return clean(drive?.customQuestionsList)
}
