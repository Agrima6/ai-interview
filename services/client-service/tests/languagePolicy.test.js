import test from "node:test"
import assert from "node:assert/strict"
import { cleanLanguagePolicy, languageAllowed, policyOf, startingLanguage } from "../utils/languagePolicy.js"

test("no policy means everything is allowed, English first, switching allowed", () => {
    assert.deepEqual(policyOf({}), { defaultLanguage: "en", allowed: [], allowSwitch: true })
    assert.deepEqual(cleanLanguagePolicy(undefined), { defaultLanguage: "en", allowed: [], allowSwitch: true })
})

test("unknown languages are dropped and the default is always one of the allowed ones", () => {
    const p = cleanLanguagePolicy({ defaultLanguage: "ta", allowed: ["hi", "xx", "en", "hi"], allowSwitch: false })
    assert.deepEqual(p, { defaultLanguage: "hi", allowed: ["hi", "en"], allowSwitch: false })
    assert.equal(cleanLanguagePolicy({ defaultLanguage: "en", allowed: ["hi", "en"] }).defaultLanguage, "en")
})

test("choosing every language is stored as 'all'", () => {
    const all = ["en", "hi", "hinglish", "pa", "ta", "te", "bn", "mr", "gu", "kn", "ml"]
    assert.deepEqual(cleanLanguagePolicy({ defaultLanguage: "hi", allowed: all }), { defaultLanguage: "hi", allowed: [], allowSwitch: true })
})

test("a candidate's pick is used only when HR allows it", () => {
    const p = cleanLanguagePolicy({ defaultLanguage: "hi", allowed: ["hi", "en"] })
    assert.equal(startingLanguage(p, "en"), "en")
    assert.equal(startingLanguage(p, "ta"), "hi")
    assert.equal(startingLanguage(p, undefined), "hi")
    assert.equal(languageAllowed(p, "ta"), false)
    assert.equal(languageAllowed(policyOf({}), "ta"), true)
})
