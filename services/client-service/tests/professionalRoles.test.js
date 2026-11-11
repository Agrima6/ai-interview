import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { PROFESSIONAL_ROLES, isProfessionalRole } from "../utils/professionalRoles.js"
import { PROFESSIONAL_QUESTION_BANKS } from "../utils/professionalBanks.js"

test("every CA and legal role has a built-in question set, and each set is well formed", () => {
    const covered = new Set(PROFESSIONAL_QUESTION_BANKS.flatMap((b) => b.roleCategories))
    for (const role of PROFESSIONAL_ROLES) assert.ok(covered.has(role.value), `${role.value} has no question set`)
    const titles = new Set()
    const ids = new Set()
    for (const bank of PROFESSIONAL_QUESTION_BANKS) {
        assert.ok(!titles.has(bank.title), bank.title); titles.add(bank.title)
        assert.ok(["CHARTERED_ACCOUNTANT", "LEGAL"].includes(bank.category))
        assert.equal(bank.questionCount, bank.questions.length)
        assert.ok(bank.questions.length >= 5)
        for (const q of bank.questions) {
            assert.ok(q.id && q.text && q.timeLimit > 0)
            assert.ok(!ids.has(q.id), q.id); ids.add(q.id)
        }
    }
})

test("professional roles are recognised and blue-collar ones are not", () => {
    assert.ok(isProfessionalRole("LEGAL_IP"))
    assert.ok(isProfessionalRole("CA_AUDIT"))
    assert.ok(!isProfessionalRole("BLUE_COLLAR_WATCHMAN"))
})

test("the client's professional role list is identical to the server's", () => {
    const client = fs.readFileSync(new URL("../../../client/src/constants/professionalRoles.js", import.meta.url), "utf8")
    const values = [...client.matchAll(/value: '([A-Z_]+)', label: '([^']+)'/g)].map((m) => [m[1], m[2]])
    assert.deepEqual(values, PROFESSIONAL_ROLES.map((r) => [r.value, r.label]))
})
