// What a candidate's browser may be told about the interview's questions.
//
// The agent's plan carries the evaluator's working data - expected topics, follow-up topics, competencies,
// focus priorities, difficulty - which is effectively the answer key. The browser needs the wording (to show the
// question), an id, the type and the per-question time limit. Nothing else is forwarded.
const CANDIDATE_VISIBLE_FIELDS = ["id", "type", "question_text", "topic", "time_limit"]

export const candidateSafeQuestions = (plan) =>
    (Array.isArray(plan?.questions) ? plan.questions : [])
        .filter((q) => q && q.question_text)
        .map((q) => Object.fromEntries(CANDIDATE_VISIBLE_FIELDS.filter((key) => q[key] !== undefined).map((key) => [key, q[key]])))

// What the candidate gets back when they finish. The evaluation itself (score, recommendation, strengths, gaps,
// per-question analysis) is stored on the roster entry for HR and is never returned to the candidate.
export const candidateCompletionReceipt = () => ({ submitted: true })
