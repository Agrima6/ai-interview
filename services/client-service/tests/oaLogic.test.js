import test from "node:test"
import assert from "node:assert/strict"
import { buildPaperOrder, attemptDeadline, gradeAnswer, gradeAttempt, inWaitingRoom, parseSchedule, rankRows, schedulePhase, seededShuffle } from "../utils/oaExam.js"
import { normalizeQuestion, normalizeQuestions, studentQuestionView } from "../utils/oaQuestions.js"
import { codesMatch, generateAccessCode, hashAccessCode, hashPassword, normalizeAccessCode, passwordProblem, verifyPassword } from "../utils/oaSecurity.js"

const SECTIONS = [{ id: "s1", title: "Aptitude" }, { id: "s2", title: "Coding" }]
const mcq = (n, extra = {}) => normalizeQuestion({ type: "MCQ", text: `Q${n}`, options: ["a", "b", "c", "d"], correct: "B", sectionId: "s1", ...extra }, { sectionIds: ["s1", "s2"], defaultSectionId: "s1" })

test("every student gets a different order, and the same student always gets the same one", () => {
    const questions = Array.from({ length: 20 }, (_, i) => mcq(i))
    const a1 = buildPaperOrder({ sections: SECTIONS, questions, settings: {}, seed: "attempt-a" })
    const a2 = buildPaperOrder({ sections: SECTIONS, questions, settings: {}, seed: "attempt-a" })
    const b = buildPaperOrder({ sections: SECTIONS, questions, settings: {}, seed: "attempt-b" })
    assert.deepEqual(a1, a2)
    assert.notDeepEqual(a1.sections[0].questionIds, b.sections[0].questionIds)
    assert.deepEqual([...a1.sections[0].questionIds].sort(), [...b.sections[0].questionIds].sort())   // same questions, different order
})

test("shuffling can be switched off, and empty sections never appear", () => {
    const questions = [mcq(1), mcq(2), mcq(3)]
    const plain = buildPaperOrder({ sections: SECTIONS, questions, settings: { shuffleQuestions: false, shuffleOptions: false }, seed: "x" })
    assert.deepEqual(plain.sections[0].questionIds, questions.map((q) => q.id))
    assert.deepEqual(plain.optionOrder, {})
    assert.equal(plain.sections.length, 1)
})

test("shuffled option order is a permutation of the real option ids", () => {
    const q = mcq(1)
    const { optionOrder } = buildPaperOrder({ sections: SECTIONS, questions: [q], settings: {}, seed: "seed" })
    assert.deepEqual([...optionOrder[q.id]].sort(), q.options.map((o) => o.id).sort())
})

test("seededShuffle does not modify its input", () => {
    const input = [1, 2, 3, 4, 5]
    seededShuffle(input, "s")
    assert.deepEqual(input, [1, 2, 3, 4, 5])
})

test("the student's view never contains the answer key", () => {
    const q = mcq(1, { explanation: "because", modelAnswer: "x" })
    const view = studentQuestionView(q)
    assert.equal(view.correct, undefined)
    assert.equal(view.explanation, undefined)
    assert.equal(view.modelAnswer, undefined)
    const coding = normalizeQuestion({ type: "CODING", text: "Add", sectionId: "s2", testCases: [{ input: "1 2", expected: "3" }, { input: "9 9", expected: "18", hidden: true }] }, { sectionIds: ["s2"], defaultSectionId: "s2" })
    assert.equal(studentQuestionView(coding).sampleCases.length, 1)   // hidden cases stay hidden
})

test("question upload resolves the correct answer from a letter, an index or the option text", () => {
    const base = { type: "MCQ", text: "Pick", options: ["red", "green", "blue"], sectionId: "s1" }
    const ctx = { sectionIds: ["s1"], defaultSectionId: "s1" }
    for (const correct of ["B", "b", 1, "1", "green", "GREEN"]) {
        const q = normalizeQuestion({ ...base, correct }, ctx)
        assert.deepEqual(q.correct, [q.options[1].id], String(correct))
    }
    const msq = normalizeQuestion({ ...base, type: "MSQ", correct: "A;C" }, ctx)
    assert.deepEqual(msq.correct, [msq.options[0].id, msq.options[2].id])
})

test("a wrong answer key is rejected loudly, never guessed", () => {
    const ctx = { sectionIds: ["s1"], defaultSectionId: "s1" }
    assert.throws(() => normalizeQuestion({ type: "MCQ", text: "Q", options: ["a", "b"], correct: "Z" }, ctx), /does not match/)
    assert.throws(() => normalizeQuestion({ type: "MCQ", text: "Q", options: ["a", "b"] }, ctx), /correct/i)
    assert.throws(() => normalizeQuestion({ type: "MCQ", text: "Q", options: ["a", "a"], correct: "A" }, ctx), /different/)
    assert.throws(() => normalizeQuestion({ type: "MCQ", text: "Q", options: ["a", "b"], correct: "A;B" }, ctx), /exactly one/)
    assert.throws(() => normalizeQuestion({ type: "MCQ", text: "", options: ["a", "b"], correct: "A" }, ctx), /required/)
    assert.throws(() => normalizeQuestion({ type: "ESSAY", text: "Q" }, ctx), /Type must be/)
    assert.throws(() => normalizeQuestion({ type: "MCQ", text: "Q", options: ["a", "b"], correct: "A", marks: 2, negativeMarks: 5 }, ctx), /Negative/)
})

test("a bulk upload reports every bad row by number", () => {
    const ctx = { sectionIds: ["s1"], defaultSectionId: "s1" }
    const { accepted, rejected } = normalizeQuestions([
        { type: "MCQ", text: "ok", options: ["a", "b"], correct: "A" },
        { type: "MCQ", text: "bad", options: ["a"], correct: "A" },
        { type: "SHORT", text: "short", keywords: "x;y" },
    ], ctx)
    assert.equal(accepted.length, 2)
    assert.deepEqual(rejected.map((r) => r.row), [2])
    assert.deepEqual(accepted[1].keywords, ["x", "y"])
})

test("multiple-choice marking: right, wrong with negative marks, and unanswered", () => {
    const q = mcq(1, { marks: 4, negativeMarks: 1 })
    assert.equal(gradeAnswer(q, [q.correct[0]]).marks, 4)
    assert.equal(gradeAnswer(q, [q.options.find((o) => !q.correct.includes(o.id)).id]).marks, -1)
    assert.equal(gradeAnswer(q, null).marks, 0)
    assert.equal(gradeAnswer(q, []).marks, 0)
})

test("multi-select needs the exact set", () => {
    const q = normalizeQuestion({ type: "MSQ", text: "Q", options: ["a", "b", "c"], correct: "A;B", marks: 2 }, { sectionIds: ["s1"], defaultSectionId: "s1" })
    const [a, b, c] = q.options.map((o) => o.id)
    assert.equal(gradeAnswer(q, [b, a]).marks, 2)
    assert.equal(gradeAnswer(q, [a]).marks, 0)
    assert.equal(gradeAnswer(q, [a, b, c]).marks, 0)
})

test("long answers and code wait for a human; short answers are keyword-scored and flagged", () => {
    const ctx = { sectionIds: ["s1"], defaultSectionId: "s1" }
    const long = normalizeQuestion({ type: "LONG", text: "Essay", marks: 10 }, ctx)
    assert.deepEqual(gradeAnswer(long, "some essay"), { marks: null, auto: false, needsReview: true })
    assert.equal(gradeAnswer(long, "").marks, 0)
    const code = normalizeQuestion({ type: "CODING", text: "Add" }, ctx)
    assert.equal(gradeAnswer(code, { code: "return 1", language: "python" }).marks, null)
    assert.equal(gradeAnswer(code, { code: "   ", language: "python" }).marks, 0)
    const short = normalizeQuestion({ type: "SHORT", text: "Define", keywords: "index; query", marks: 4 }, ctx)
    const graded = gradeAnswer(short, "An Index speeds up a lookup")
    assert.equal(graded.marks, 2)
    assert.equal(graded.needsReview, true)
    assert.equal(gradeAnswer(short, "indexes everywhere").marks, 0)   // whole words only
})

test("an attempt with a manual grade keeps it and is complete only when nothing is waiting", () => {
    const ctx = { sectionIds: ["s1"], defaultSectionId: "s1" }
    const m = mcq(1, { marks: 2 })
    const l = normalizeQuestion({ type: "LONG", text: "Essay", marks: 8 }, ctx)
    const first = gradeAttempt({ questions: [m, l], answers: { [m.id]: { value: m.correct }, [l.id]: { value: "text" } } })
    assert.equal(first.gradingStatus, "PENDING_REVIEW")
    assert.equal(first.score, 2)
    assert.equal(first.maxScore, 10)
    const second = gradeAttempt({ questions: [m, l], answers: { [m.id]: { value: m.correct }, [l.id]: { value: "text" } }, grades: { ...first.grades, [l.id]: { marks: 6, auto: false } } })
    assert.equal(second.gradingStatus, "COMPLETE")
    assert.equal(second.score, 8)
    assert.equal(second.percent, 80)
})

test("negative marking can never push the total below zero", () => {
    const q = mcq(1, { marks: 1, negativeMarks: 1 })
    const wrong = q.options.find((o) => !q.correct.includes(o.id)).id
    assert.equal(gradeAttempt({ questions: [q], answers: { [q.id]: { value: [wrong] } } }).score, 0)
})

test("schedule validation: duration, order of times, past closing time", () => {
    const now = Date.UTC(2030, 0, 1, 9, 0)
    const iso = (offsetMin) => new Date(now + offsetMin * 60000).toISOString()
    assert.ok(parseSchedule({ startAt: iso(60), endAt: iso(180), durationMinutes: 60 }, { now }).startAt)
    assert.equal(parseSchedule({ startAt: iso(60), endAt: iso(90), durationMinutes: 60 }, { now }).field, "endAt")      // closes before one duration fits
    assert.equal(parseSchedule({ startAt: iso(60), endAt: iso(180), durationMinutes: 2 }, { now }).field, "durationMinutes")
    assert.equal(parseSchedule({ startAt: iso(-180), endAt: iso(-60), durationMinutes: 30 }, { now }).field, "endAt")
    assert.equal(parseSchedule({ startAt: "nope", endAt: iso(60), durationMinutes: 30 }, { now }).field, "startAt")
})

test("the test phases follow the server clock", () => {
    const start = Date.UTC(2030, 0, 1, 10, 0)
    const schedule = { startAt: new Date(start), endAt: new Date(start + 120 * 60000), durationMinutes: 60, lateEntryMinutes: 10 }
    assert.equal(schedulePhase(schedule, start - 1), "UPCOMING")
    assert.equal(schedulePhase(schedule, start), "OPEN")
    assert.equal(schedulePhase(schedule, start + 10 * 60000), "OPEN")
    assert.equal(schedulePhase(schedule, start + 10 * 60000 + 1), "CLOSED_TO_ENTRY")
    assert.equal(schedulePhase(schedule, start + 120 * 60000), "ENDED")
    assert.equal(inWaitingRoom(schedule, start - 10 * 60000), true)
    assert.equal(inWaitingRoom(schedule, start - 30 * 60000), false)
})

test("a late starter's time is cut at the closing time, never extended past it", () => {
    const start = Date.UTC(2030, 0, 1, 10, 0)
    const schedule = { startAt: new Date(start), endAt: new Date(start + 70 * 60000), durationMinutes: 60 }
    assert.equal(attemptDeadline(schedule, new Date(start)).getTime(), start + 60 * 60000)
    assert.equal(attemptDeadline(schedule, new Date(start + 30 * 60000)).getTime(), start + 70 * 60000)
})

test("ranking: higher score first, faster breaks ties, equal results share a rank, ineligible get none", () => {
    const ranks = rankRows([
        { id: "a", percent: 90, durationSec: 100, eligible: true },
        { id: "b", percent: 90, durationSec: 80, eligible: true },
        { id: "c", percent: 90, durationSec: 80, eligible: true },
        { id: "d", percent: 70, durationSec: 10, eligible: true },
        { id: "e", percent: 99, durationSec: 5, eligible: false },
    ])
    assert.equal(ranks.get("b"), 1)
    assert.equal(ranks.get("c"), 1)
    assert.equal(ranks.get("a"), 3)
    assert.equal(ranks.get("d"), 4)
    assert.equal(ranks.has("e"), false)
})

test("passwords and access codes", () => {
    const stored = hashPassword("Correct1horse")
    assert.equal(verifyPassword("Correct1horse", stored), true)
    assert.equal(verifyPassword("correct1horse", stored), false)
    assert.equal(verifyPassword("x", "garbage"), false)
    assert.notEqual(stored, hashPassword("Correct1horse"))   // salted
    assert.ok(passwordProblem("short1"))
    assert.ok(passwordProblem("alllettersonly"))
    assert.equal(passwordProblem("Longenough1"), null)

    const code = generateAccessCode()
    assert.match(code, /^[A-HJKMNP-Z2-9]{8}$/)
    assert.equal(codesMatch(code.toLowerCase(), hashAccessCode(code)), true)            // typed in lower case
    assert.equal(codesMatch(`${code.slice(0, 4)}-${code.slice(4)}`, hashAccessCode(code)), true)   // typed with a dash
    assert.equal(codesMatch("AAAAAAAA", hashAccessCode(code)), false)
    assert.equal(normalizeAccessCode(" ab-cd 12 "), "ABCD12")
})
