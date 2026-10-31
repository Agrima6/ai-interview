import test from "node:test"
import assert from "node:assert/strict"
import { signRecordingLink, verifyRecordingLink } from "../utils/recordingLink.js"

const parts = { tenantId: "tenant-a", driveId: "d1", roundNumber: "1", candidateId: "c1", segment: "rec-1" }

test("a freshly signed link verifies", () => {
    const { exp, sig } = signRecordingLink(parts)
    assert.equal(verifyRecordingLink(parts, exp, sig), true)
})

test("the link is bound to one organization, drive, round, candidate and capture", () => {
    const { exp, sig } = signRecordingLink(parts)
    for (const change of [{ tenantId: "tenant-b" }, { driveId: "d2" }, { roundNumber: "2" }, { candidateId: "c2" }, { segment: "rec-2" }, { segment: "" }]) {
        assert.equal(verifyRecordingLink({ ...parts, ...change }, exp, sig), false, JSON.stringify(change))
    }
})

test("an expired or altered link is refused", () => {
    const { exp, sig } = signRecordingLink(parts, -10)
    assert.equal(verifyRecordingLink(parts, exp, sig), false)
    const fresh = signRecordingLink(parts)
    assert.equal(verifyRecordingLink(parts, fresh.exp + 3600, fresh.sig), false)     // extending the expiry invalidates it
    assert.equal(verifyRecordingLink(parts, fresh.exp, `${fresh.sig}x`), false)
    assert.equal(verifyRecordingLink(parts, fresh.exp, undefined), false)
    assert.equal(verifyRecordingLink(parts, "abc", fresh.sig), false)
})
