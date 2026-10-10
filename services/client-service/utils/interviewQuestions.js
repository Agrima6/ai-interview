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
    }))

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
