import test from "node:test"
import assert from "node:assert/strict"
import { cleanBankInput } from "../services/questionBank.service.js"

test("blank rows are dropped, counts and duration are computed server-side", () => {
    const out = cleanBankInput({ title: " Set A ", category: "X", questionCount: 99, tenantId: "evil", isSystemDefault: true,
        questions: [{ text: "  Why?  ", timeLimit: 120 }, { text: "   " }, { text: "How?", topic: "T", timeLimit: 60 }] })
    assert.equal(out.title, "Set A")
    assert.equal(out.questionCount, 2)
    assert.equal(out.durationMinutes, 3)
    assert.equal(out.tenantId, undefined)
    assert.equal(out.isSystemDefault, undefined)
    assert.equal(out.questions[0].topic, "General")
})
test("missing title/category and repeated questions are rejected", () => {
    assert.throws(() => cleanBankInput({ category: "X" }), { code: "MISSING_TITLE" })
    assert.throws(() => cleanBankInput({ title: "t" }), { code: "MISSING_CATEGORY" })
    assert.throws(() => cleanBankInput({ title: "t", category: "c", questions: [{ text: "Same" }, { text: "same" }] }), { code: "DUPLICATE_QUESTION" })
})
test("time limits are clamped", () => {
    const out = cleanBankInput({ title: "t", category: "c", questions: [{ text: "a", timeLimit: 1 }, { text: "b", timeLimit: 99999 }] })
    assert.deepEqual(out.questions.map((q) => q.timeLimit), [15, 1800])
})
