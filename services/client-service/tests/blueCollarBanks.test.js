import test from "node:test"
import assert from "node:assert/strict"
import { BLUE_COLLAR_QUESTION_BANKS } from "../utils/blueCollarBanks.js"
import { BLUE_COLLAR_ROLES } from "../utils/blueCollar.js"

test("every blue-collar role has a built-in question set, and each set is well formed", () => {
    const covered = new Set(BLUE_COLLAR_QUESTION_BANKS.flatMap((b) => b.roleCategories))
    for (const role of BLUE_COLLAR_ROLES) assert.ok(covered.has(role.value), `${role.value} has no question set`)
    const titles = new Set()
    for (const bank of BLUE_COLLAR_QUESTION_BANKS) {
        assert.ok(!titles.has(bank.title)); titles.add(bank.title)
        assert.equal(bank.category, "BLUE_COLLAR")
        assert.equal(bank.questionCount, bank.questions.length)
        assert.ok(bank.questions.length >= 2)
        for (const q of bank.questions) assert.ok(q.id && q.text && q.timeLimit > 0)
    }
})
