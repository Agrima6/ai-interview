import test from "node:test"
import assert from "node:assert/strict"
import { permissionsForMode, resolveInterviewMode, normalizeInterviewMode, DEFAULT_INTERVIEW_MODE } from "../utils/interviewMode.js"

test("each mode requests only what it needs", () => {
    assert.deepEqual(permissionsForMode("VOICE"), { microphone: true, camera: false, screen: false })
    assert.deepEqual(permissionsForMode("VIDEO"), { microphone: true, camera: true, screen: false })
    assert.deepEqual(permissionsForMode("SCREEN"), { microphone: true, camera: true, screen: true })
})

test("the microphone is always required (the interview is a voice conversation)", () => {
    for (const mode of ["VOICE", "VIDEO", "SCREEN", "", null, undefined, "nonsense"]) assert.equal(permissionsForMode(mode).microphone, true)
})

test("unknown or missing values fall back to the safe, fully-proctored default", () => {
    assert.equal(DEFAULT_INTERVIEW_MODE, "SCREEN")
    for (const bad of [undefined, null, "", "  ", "audio", 7, {}]) assert.deepEqual(permissionsForMode(bad), permissionsForMode("SCREEN"))
    assert.equal(normalizeInterviewMode("nonsense"), undefined)
    assert.equal(normalizeInterviewMode(" video "), "VIDEO")            // trimmed and case-insensitive
})

test("a round's own mode wins, otherwise it inherits the drive's, otherwise the default", () => {
    assert.equal(resolveInterviewMode({ interviewMode: "VOICE" }, { interviewMode: "SCREEN" }), "VOICE")
    assert.equal(resolveInterviewMode({}, { interviewMode: "VIDEO" }), "VIDEO")
    assert.equal(resolveInterviewMode({ interviewMode: "bogus" }, { interviewMode: "VIDEO" }), "VIDEO")   // invalid round value is ignored
    assert.equal(resolveInterviewMode({}, {}), "SCREEN")
    assert.equal(resolveInterviewMode(undefined, undefined), "SCREEN")
})
