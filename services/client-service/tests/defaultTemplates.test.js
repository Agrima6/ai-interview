import test from "node:test"
import assert from "node:assert/strict"
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLE_KEYS } from "../utils/defaultTemplates.js"
import { findUnknownPlaceholders } from "../services/notificationTemplate.service.js"

test("every default has a unique key and the required content", () => {
    const keys = DEFAULT_TEMPLATES.map((t) => t.defaultKey)
    assert.equal(new Set(keys).size, keys.length)
    for (const t of DEFAULT_TEMPLATES) {
        assert.ok(t.name && t.body, t.defaultKey)
        if (t.type === "EMAIL") assert.ok(t.subject, `${t.defaultKey} needs a subject`)
    }
})

test("the required email templates exist, including round 2 and 3 invitations", () => {
    const email = DEFAULT_TEMPLATES.filter((t) => t.type === "EMAIL")
    const has = (purpose, roundNumber) => email.some((t) => t.purpose === purpose && (roundNumber === undefined || t.roundNumber === roundNumber))
    assert.ok(has("INVITATION", 1))
    assert.ok(has("INVITATION", 2))
    assert.ok(has("INVITATION", 3))
    assert.ok(has("CONGRATULATIONS"))
    assert.ok(has("REJECTION"))
})

test("defaults only use placeholders the sender can fill", () => {
    for (const t of DEFAULT_TEMPLATES) assert.deepEqual(findUnknownPlaceholders(t.subject, t.body), [], t.defaultKey)
})

test("unknown placeholders are reported, known ones (either brace style) are not", () => {
    assert.deepEqual(findUnknownPlaceholders("Hi {{candidatename}}", "{candidate_name} {{interview_link}}"), ["candidatename"])
    assert.ok(TEMPLATE_VARIABLE_KEYS.includes("round_number"))
})

test("round invitations carry the link, schedule and round", () => {
    const round2 = DEFAULT_TEMPLATES.find((t) => t.defaultKey === "EMAIL_ROUND_2_INVITATION")
    for (const key of ["candidate_name", "interview_link", "interview_date", "round_title", "drive_title"]) assert.match(round2.body + round2.subject, new RegExp(`\\{${key}\\}`))
})
