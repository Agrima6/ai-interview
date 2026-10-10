import test from "node:test"
import assert from "node:assert/strict"
import { resolveInterviewQuestions } from "../utils/interviewQuestions.js"

const MARK = "HR-REF-TEST-731: Explain how you would investigate a production database connection-pool exhaustion incident."
const hr = (text = MARK, extra = {}) => ({ id: "hq1", text, topic: "Production debugging", timeLimit: 150, ...extra })

test("the HR question reaches the interview with its text, topic and time limit intact", () => {
    const [q] = resolveInterviewQuestions({ roundNumber: 1, questions: [hr()] }, {})
    assert.deepEqual(q, { id: "hq1", text: MARK, topic: "Production debugging", timeLimit: 150 })
})

test("both ways HR can choose questions (typed, or a picked question set) are used", () => {
    assert.equal(resolveInterviewQuestions({ roundNumber: 1, questions: [hr()], customQuestions: [] }, {}).length, 1)   // picked set
    assert.equal(resolveInterviewQuestions({ roundNumber: 1, questions: [], customQuestions: [hr()] }, {}).length, 1)   // typed
})

test("a round's own questions win over a stale drive-level copy", () => {
    const out = resolveInterviewQuestions({ roundNumber: 1, questions: [hr("New question?")] }, { questions: [hr("Old question?")] })
    assert.deepEqual(out.map((q) => q.text), ["New question?"])
})

test("the drive-level copy is only a fallback for round 1 when the round has no questions of its own", () => {
    assert.equal(resolveInterviewQuestions({ roundNumber: 1, questions: [] }, { questions: [hr()] }).length, 1)
    assert.equal(resolveInterviewQuestions({ roundNumber: 1 }, { customQuestionsList: [hr()] }).length, 1)
})

test("later rounds never inherit round 1's questions", () => {
    assert.deepEqual(resolveInterviewQuestions({ roundNumber: 2, questions: [] }, { questions: [hr()] }), [])
})

test("blank or malformed entries are dropped and never sent", () => {
    const out = resolveInterviewQuestions({ roundNumber: 1, questions: [hr("   "), null, {}, { text: "Real question?" }] }, {})
    assert.deepEqual(out.map((q) => q.text), ["Real question?"])
})

test("database documents are reduced to plain data (no driver internals leak into the request)", () => {
    const doc = { ...hr(), toObject() { return { id: "hq1", text: MARK, topic: "T", timeLimit: 90, _id: "x", $__: {} } } }
    const [q] = resolveInterviewQuestions({ roundNumber: 1, questions: [doc] }, {})
    assert.deepEqual(Object.keys(q).sort(), ["id", "text", "timeLimit", "topic"])
})

test("nothing configured gives an empty list (the interview then uses its normal generation)", () => {
    assert.deepEqual(resolveInterviewQuestions(undefined, undefined), [])
    assert.deepEqual(resolveInterviewQuestions({ roundNumber: 1 }, {}), [])
})
