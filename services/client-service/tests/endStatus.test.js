import test from "node:test"
import assert from "node:assert/strict"
import { resolveEndStatus, countUnfinishedCandidates } from "../services/interviewDrive.service.js"

const round = (status, ...candidateStatuses) => ({ status, candidates: candidateStatuses.map((s) => ({ status: s })) })

test("completing a round where everyone finished is COMPLETED", () => {
    assert.equal(resolveEndStatus("COMPLETED", [round("ACTIVE", "COMPLETED", "REJECTED", "SHORTLISTED")]), "COMPLETED")
})
test("closing while candidates have not taken the interview is CLOSED, never COMPLETED", () => {
    assert.equal(resolveEndStatus("COMPLETED", [round("ACTIVE", "COMPLETED", "SCHEDULED")]), "CLOSED")
    assert.equal(resolveEndStatus("COMPLETED", [round("ACTIVE", "INVITED")]), "CLOSED")
})
test("an explicit close is always CLOSED", () => {
    assert.equal(resolveEndStatus("CLOSED", [round("ACTIVE", "COMPLETED")]), "CLOSED")
})
test("the standing demo candidate never blocks completion", () => {
    assert.equal(countUnfinishedCandidates({ candidates: [{ status: "SCHEDULED", demoAlwaysLive: true }] }), 0)
})
