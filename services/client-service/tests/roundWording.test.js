import test from "node:test"
import assert from "node:assert/strict"
import { roundWording } from "../services/interviewDrive.service.js"

const drive = { driveKind: "HIRING" }
test("round 1 keeps the standard invitation wording", () => {
    assert.equal(roundWording(drive, { roundNumber: 1 }).deadline_label, "Apply by")
})
test("later rounds say the candidate is moving forward and only ask for a slot", () => {
    const w = roundWording(drive, { roundNumber: 2 })
    assert.match(w.invite_phrase, /Round 2/)
    assert.equal(w.invite_eyebrow, "You're moving forward")
    assert.match(w.portal_help, /resume is already on file/)
    assert.equal(w.deadline_label, "Complete by")
})

import { unresolvedPlaceholders } from "../services/interviewDrive.service.js"
test("placeholders that cannot be filled are reported, known ones are not", () => {
    const values = { candidate_name: "", drive_title: "" }
    assert.deepEqual(unresolvedPlaceholders(["Hi {{candidate_name}}, {drive_title}", "{{typo_name}}"], values), ["typo_name"])
    assert.deepEqual(unresolvedPlaceholders(["Hi {candidate_name}"], values), [])
})
