import test from "node:test"
import assert from "node:assert/strict"
import { validateAgainstFormVersion } from "../utils/formValidator.js"
import { entityNounFor, fallbackClientName } from "../utils/entityTerms.js"

const form = {
    sections: [{
        fields: [
            { key: "company_name", label: "Company name", type: "TEXT", required: true },
            { key: "industry", label: "Industry", type: "SELECT", required: true },
            { key: "industry_other", label: "Industry (other)", type: "TEXT", required: true, visibility: { field: "industry", equals: "OTHER" } },
            { key: "registration_number", label: "Registration number", type: "TEXT", required: false, validation: { minLength: 3 } },
        ],
    }],
}

const keys = (errors) => errors.map((e) => e.fieldKey).sort()

test("registration number may be omitted, empty or null", () => {
    for (const reg of [undefined, "", null]) {
        const data = { company_name: "Acme", industry: "TECHNOLOGY", registration_number: reg }
        assert.deepEqual(validateAgainstFormVersion(form, data), [])
    }
})

test("a provided registration number is still format-checked", () => {
    const errors = validateAgainstFormVersion(form, { company_name: "Acme", industry: "TECHNOLOGY", registration_number: "ab" })
    assert.deepEqual(keys(errors), ["registration_number"])
})

test("'Other' industry requires the custom value, other industries do not", () => {
    assert.deepEqual(keys(validateAgainstFormVersion(form, { company_name: "Acme", industry: "OTHER" })), ["industry_other"])
    assert.deepEqual(validateAgainstFormVersion(form, { company_name: "Acme", industry: "OTHER", industry_other: "Aerospace" }), [])
    assert.deepEqual(validateAgainstFormVersion(form, { company_name: "Acme", industry: "FINANCE" }), [])
})

test("entity noun follows the selected type, with a documented default", () => {
    assert.equal(entityNounFor("ORGANIZATION"), "organization")
    assert.equal(entityNounFor("college"), "institution")
    assert.equal(entityNounFor(undefined), "organization")
    assert.equal(fallbackClientName("COLLEGE"), "your institution")
    assert.equal(fallbackClientName("ORGANIZATION"), "your organization")
})

import { signedFilePath, verifyFileSignature } from "../utils/signedFileUrl.js"

test("signed file links verify, expire and cannot be reused for another file", () => {
    const url = new URL(`http://x${signedFilePath("ob1", "f1", 60)}`)
    const exp = url.searchParams.get("exp"), sig = url.searchParams.get("sig")
    assert.equal(verifyFileSignature("ob1", "f1", exp, sig), true)
    assert.equal(verifyFileSignature("ob1", "f2", exp, sig), false)
    assert.equal(verifyFileSignature("ob2", "f1", exp, sig), false)
    assert.equal(verifyFileSignature("ob1", "f1", exp, "bad"), false)
    const expired = new URL(`http://x${signedFilePath("ob1", "f1", -5)}`)
    assert.equal(verifyFileSignature("ob1", "f1", expired.searchParams.get("exp"), expired.searchParams.get("sig")), false)
})
