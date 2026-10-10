import test from "node:test"
import assert from "node:assert/strict"
import { candidateSafeQuestions, candidateCompletionReceipt } from "../utils/candidateQuestions.js"

const plan = {
    questions: [
        { id: "p_intro", type: "introduction", question_text: null },
        {
            id: "q1", type: "scenario", question_text: "How does a HashMap work?", topic: "hashmaps", time_limit: 120,
            competencies: ["technical_depth"], expected_topics: ["hashing", "buckets"], followup_topics: ["load factor"],
            focus: "Technical Depth", focus_priority: "HIGH", difficulty: "hard",
        },
    ],
    focus_areas: [{ name: "Technical Depth", priority: "HIGH" }],
    hr_guidance: ["probe depth"],
}

test("the browser gets question wording and limits, never the evaluator's rubric", () => {
    const questions = candidateSafeQuestions(plan)
    assert.deepEqual(questions, [{ id: "q1", type: "scenario", question_text: "How does a HashMap work?", topic: "hashmaps", time_limit: 120 }])
    const text = JSON.stringify(questions)
    for (const secret of ["expected_topics", "followup_topics", "competencies", "focus_priority", "difficulty", "hashing"]) {
        assert.equal(text.includes(secret), false, secret)
    }
})

test("a missing or malformed plan gives an empty list", () => {
    for (const bad of [null, undefined, {}, { questions: "x" }]) assert.deepEqual(candidateSafeQuestions(bad), [])
})

test("the completion receipt contains nothing evaluative", () => {
    assert.deepEqual(candidateCompletionReceipt(), { submitted: true })
})
