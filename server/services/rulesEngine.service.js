// Deterministic, rule-based scoring for interview answers. These are pure
// functions (no I/O, no AI calls) so they're cheap to unit test and give a
// consistent baseline score alongside the AI's own judgement.

// Default weighting between the deterministic rubric and the AI's scores
// when computing a question's final weighted score.
export const DEFAULT_WEIGHTS = {
    rubric: 0.4,
    ai: 0.6,
}

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "actually", "sort of", "kind of", "i mean"]

const STAR_SIGNALS = {
    situation: ["situation", "context", "background", "at the time", "when i was", "in my previous", "we had a", "there was a"],
    task: ["task", "goal", "objective", "needed to", "had to", "responsible for", "my role was"],
    action: ["i did", "i decided", "i implemented", "i built", "i led", "i created", "i designed", "action", "so i", "approach was", "i started by"],
    result: ["result", "outcome", "as a result", "eventually", "in the end", "we achieved", "this led to", "impact", "improved", "reduced", "increased"],
}

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n))

const tokenize = (text = "") =>
    (text.toLowerCase().match(/[a-z0-9+#.]+/g) || [])

/**
 * scoreKeywordCoverage
 * Compares the answer's vocabulary against the resume's skills and the
 * question's own text, rewarding answers that actually use relevant terms.
 */
export const scoreKeywordCoverage = (answerText, resumeSkills = [], questionText = "") => {
    const answer = (answerText || "").trim()
    if (!answer) return 0

    const answerTokens = new Set(tokenize(answer))

    const keywords = new Set([
        ...tokenize((resumeSkills || []).join(" ")),
        ...tokenize(questionText || ""),
    ])
    // Strip generic stopwords/short tokens from questionText-derived keywords
    // so we're not rewarding matches on words like "the"/"how"/"you".
    const STOPWORDS = new Set(["the", "a", "an", "how", "what", "why", "when", "where", "you", "your", "did", "do", "does", "is", "are", "to", "of", "in", "on", "for", "and", "or", "with", "about", "describe", "tell", "explain", "can"])
    const relevantKeywords = [...keywords].filter((k) => k.length > 2 && !STOPWORDS.has(k))

    if (relevantKeywords.length === 0) return 50 // nothing to compare against - neutral score

    const matched = relevantKeywords.filter((k) => answerTokens.has(k))
    const coverage = matched.length / relevantKeywords.length

    return clamp(Math.round(coverage * 100))
}

/**
 * scoreStructure
 * Heuristically detects presence of the STAR method (Situation/Task/Action/
 * Result) by looking for signal phrases associated with each component.
 */
export const scoreStructure = (answerText) => {
    const answer = (answerText || "").toLowerCase()
    if (!answer.trim()) return 0

    let componentsPresent = 0
    for (const signals of Object.values(STAR_SIGNALS)) {
        if (signals.some((phrase) => answer.includes(phrase))) {
            componentsPresent += 1
        }
    }

    // 4 components possible (S/T/A/R); scale to 0-100.
    return clamp(Math.round((componentsPresent / 4) * 100))
}

/**
 * scoreTimeManagement
 * Penalizes answers that are suspiciously fast (likely rushed/low-effort)
 * or that run well past the allotted time.
 */
export const scoreTimeManagement = (timeTakenSec, timeLimitSec) => {
    if (!timeLimitSec || timeLimitSec <= 0) return 50
    const taken = Math.max(0, timeTakenSec || 0)
    const ratio = taken / timeLimitSec

    if (taken === 0) return 0
    if (ratio > 1) {
        // Over time limit - score decays the further over it goes.
        const overBy = ratio - 1
        return clamp(Math.round(100 - overBy * 150))
    }
    if (ratio < 0.15) {
        // Too fast to have meaningfully answered.
        return clamp(Math.round(ratio / 0.15 * 40))
    }
    // Sweet spot: 15%-100% of the time limit used.
    if (ratio <= 0.9) return 100
    // Tapering as it approaches the limit (90%-100%).
    return clamp(Math.round(100 - (ratio - 0.9) * 100))
}

/**
 * scoreFillerWords
 * Computes filler-word rate (fillers per 100 words) and an inverse 0-100
 * score where fewer fillers scores higher.
 */
export const scoreFillerWords = (answerText) => {
    const answer = (answerText || "").toLowerCase()
    const words = tokenize(answer)
    const wordCount = words.length

    if (wordCount === 0) return { rate: 0, score: 0 }

    let fillerCount = 0
    for (const filler of FILLER_WORDS) {
        const pattern = new RegExp(`\\b${filler.replace(/\s+/g, "\\s+")}\\b`, "g")
        const matches = answer.match(pattern)
        if (matches) fillerCount += matches.length
    }

    const rate = (fillerCount / wordCount) * 100 // fillers per 100 words
    // 0 fillers/100 words -> 100; 20+ fillers/100 words -> 0.
    const score = clamp(Math.round(100 - rate * 5))

    return { rate: Number(rate.toFixed(2)), score }
}

/**
 * scoreLengthAppropriateness
 * Scores how close the answer's spoken length (estimated from word count,
 * ~130 wpm) is to the expected duration for the question.
 */
export const scoreLengthAppropriateness = (answerText, expectedDurationSec) => {
    const words = tokenize(answerText || "")
    if (words.length === 0) return 0
    if (!expectedDurationSec || expectedDurationSec <= 0) return 50

    const WORDS_PER_SEC = 130 / 60 // ~130 wpm average speaking pace
    const estimatedSec = words.length / WORDS_PER_SEC
    const ratio = estimatedSec / expectedDurationSec

    if (ratio < 0.3) return clamp(Math.round(ratio / 0.3 * 50)) // very short answer
    if (ratio <= 1.3) return 100 // within a reasonable band of expected length
    // Penalize rambling past ~1.3x the expected duration.
    const overBy = ratio - 1.3
    return clamp(Math.round(100 - overBy * 60))
}

/**
 * combineScores
 * Weighted blend of the deterministic rubric average and the AI's own
 * (correctness/communication/confidence) scores into one final number.
 * `aiScores` values are expected on a 0-10 scale (matching ai.service usage
 * elsewhere); rubric scores are 0-100 internally. Result is 0-10, one
 * decimal, to match every other score in the app (interview.finalScore,
 * question.score, aiScore.*) - the UI renders everything as "x/10".
 */
export const combineScores = (rubricScores = {}, aiScores = {}, weights = DEFAULT_WEIGHTS) => {
    const rubricValues = [
        rubricScores.keywordCoverage,
        rubricScores.structureScore,
        rubricScores.timeManagementScore,
        rubricScores.fillerWordRate,
        rubricScores.lengthAppropriateness,
    ].filter((v) => typeof v === "number")

    const rubricAvg = rubricValues.length
        ? rubricValues.reduce((a, b) => a + b, 0) / rubricValues.length
        : 0

    const aiValues = [aiScores.correctness, aiScores.communication, aiScores.confidence]
        .filter((v) => typeof v === "number")
    // AI scores are 0-10 in this codebase; scale to 0-100 to combine with rubric.
    const aiAvg = aiValues.length
        ? (aiValues.reduce((a, b) => a + b, 0) / aiValues.length) * 10
        : 0

    const w = { ...DEFAULT_WEIGHTS, ...weights }
    const final = clamp(Math.round(rubricAvg * w.rubric + aiAvg * w.ai)) // 0-100

    return Number((final / 10).toFixed(1)) // 0-10
}

const extractSkillsFromText = (text = "") => {
    // Very light heuristic extraction - splits on commas/newlines/bullets and
    // keeps short, skill-like tokens. Good enough as a fallback; real resume
    // parsing already happens via AI in interview.controller's analyzeResume.
    return [...new Set(
        (text || "")
            .split(/[,\n•|/]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 1 && s.length < 40)
    )]
}

/**
 * buildReport
 * Assembles the full report object (matching Interview.report schema) for a
 * completed interview: per-question rubric + AI scores, resume gap analysis,
 * and overall strengths/flaws/recommendation.
 */
export const buildReport = (interview, resumeText = "") => {
    const resumeSkills = extractSkillsFromText(resumeText || interview.resumeText || "")

    const allSkillTags = new Set()
    const perQuestion = interview.questions.map((q, index) => {
        const timeTakenSec = q.timeTaken ?? q.timeLimit ?? 0
        const skillTags = q.skillTags || []
        skillTags.forEach((t) => allSkillTags.add(t))

        // 0-100 internally - used for the strengths/flaws thresholds below and
        // fed into combineScores, which does its own final 0-10 conversion.
        const rubricScoresRaw = {
            keywordCoverage: scoreKeywordCoverage(q.answer, resumeSkills, q.question),
            structureScore: scoreStructure(q.answer),
            timeManagementScore: scoreTimeManagement(timeTakenSec, q.timeLimit),
            fillerWordRate: scoreFillerWords(q.answer).score,
            lengthAppropriateness: scoreLengthAppropriateness(q.answer, q.timeLimit),
        }

        const aiScore = {
            correctness: q.correctness || 0,
            communication: q.communication || 0,
            confidence: q.confidence || 0,
        }

        const weightedFinalScore = combineScores(rubricScoresRaw, aiScore)

        // Stored/displayed on a 0-10 scale, matching aiScore and every other
        // score in the app.
        const rubricScores = {
            keywordCoverage: Number((rubricScoresRaw.keywordCoverage / 10).toFixed(1)),
            structureScore: Number((rubricScoresRaw.structureScore / 10).toFixed(1)),
            timeManagementScore: Number((rubricScoresRaw.timeManagementScore / 10).toFixed(1)),
            fillerWordRate: Number((rubricScoresRaw.fillerWordRate / 10).toFixed(1)),
            lengthAppropriateness: Number((rubricScoresRaw.lengthAppropriateness / 10).toFixed(1)),
        }

        const strengths = []
        const flaws = []
        if (rubricScoresRaw.keywordCoverage >= 70) strengths.push("Used relevant terminology from the resume/question")
        if (rubricScoresRaw.structureScore >= 75) strengths.push("Well-structured answer (STAR method evident)")
        if (rubricScoresRaw.fillerWordRate >= 80) strengths.push("Minimal filler words")
        if (rubricScoresRaw.timeManagementScore >= 80) strengths.push("Good time management")

        if (rubricScoresRaw.keywordCoverage < 40) flaws.push("Answer didn't reference relevant skills/keywords")
        if (rubricScoresRaw.structureScore < 40) flaws.push("Lacked clear structure (Situation/Task/Action/Result)")
        if (rubricScoresRaw.fillerWordRate < 50) flaws.push("Frequent filler words")
        if (rubricScoresRaw.timeManagementScore < 40) flaws.push("Poor time management (too rushed or too long)")
        if (rubricScoresRaw.lengthAppropriateness < 40) flaws.push("Answer length was not appropriate for the question")

        return {
            questionIndex: index,
            rubricScores,
            aiScore,
            weightedFinalScore,
            strengths,
            flaws,
        }
    })

    const missingSkills = resumeSkills.filter((s) => !interview.questions.some((q) => (q.answer || "").toLowerCase().includes(s.toLowerCase())))
    const matchedSkills = resumeSkills.filter((s) => !missingSkills.includes(s))

    const overallStrengths = [...new Set(perQuestion.flatMap((p) => p.strengths))]
    const overallFlaws = [...new Set(perQuestion.flatMap((p) => p.flaws))]

    const finalWeightedScore = perQuestion.length
        ? Number((perQuestion.reduce((sum, p) => sum + p.weightedFinalScore, 0) / perQuestion.length).toFixed(1))
        : 0

    let recommendation
    if (finalWeightedScore >= 7.5) recommendation = "Strong candidate - recommend advancing to the next round."
    else if (finalWeightedScore >= 5) recommendation = "Mixed performance - consider a follow-up round to clarify weak areas."
    else recommendation = "Below bar - not recommended to advance without significant improvement."

    return {
        resumeAnalysis: {
            matchedSkills,
            missingSkills,
            gapSummary: missingSkills.length
                ? `Candidate did not demonstrate ${missingSkills.length} resume-listed skill(s) during the interview: ${missingSkills.join(", ")}.`
                : "No significant skill gaps detected between resume and interview answers.",
        },
        perQuestion,
        overallStrengths,
        overallFlaws,
        recommendation,
        finalWeightedScore,
    }
}
