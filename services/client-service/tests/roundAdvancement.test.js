import test from "node:test"
import assert from "node:assert/strict"
import { buildRosterEntry } from "../services/interviewDrive.service.js"

const round1Entry = {
    id: "c-1", name: "Asha", email: "asha@example.com", phone: "9876543210", exp: "3",
    status: "SHORTLISTED", aiScore: 82, resumeFilename: "r.pdf", resumeOriginalName: "Asha.pdf",
    interviewSlot: new Date("2026-10-12T10:00:00Z"), attemptedDate: new Date("2026-10-12T10:05:00Z"),
    preferredLanguage: "hi", agentCandidateId: "ag-1", agentInterviewId: "ai-1", agentReport: { x: 1 },
}
const drive = (r2candidates = []) => ({ rounds: [
    { roundNumber: 1, candidates: [round1Entry] },
    { roundNumber: 2, candidates: r2candidates },
] })
const incoming = { id: "tmp", name: "Asha", email: "asha@example.com", phone: "", exp: "", status: "SHORTLISTED", aiScore: 82, malpracticeFlags: 0 }

test("advancing a candidate carries identity data and resets round state", () => {
    const d = drive()
    const e = buildRosterEntry(incoming, d.rounds[1], d)
    assert.equal(e.id, "c-1")
    assert.equal(e.resumeFilename, "r.pdf")
    assert.equal(e.preferredLanguage, "hi")
    assert.equal(e.agentCandidateId, "ag-1")
    assert.equal(e.phone, "9876543210")
    assert.equal(e.status, "INVITED")
    assert.equal(e.aiScore, 0)
    for (const k of ["interviewSlot", "attemptedDate", "agentInterviewId", "agentReport"]) assert.equal(e[k], undefined, k)
})

test("re-saving a round keeps what the candidate already produced", () => {
    const d = drive()
    const first = buildRosterEntry(incoming, d.rounds[1], d)
    const booked = { ...first, interviewSlot: new Date("2026-10-20T09:00:00Z"), status: "SCHEDULED" }
    const d2 = drive([booked])
    const again = buildRosterEntry({ ...incoming, name: "Asha K" }, d2.rounds[1], d2)
    assert.equal(again.name, "Asha K")
    assert.equal(again.status, "SCHEDULED")
    assert.equal(+again.interviewSlot, +booked.interviewSlot)
    assert.equal(again.resumeFilename, "r.pdf")
})

test("a candidate new to every round is a plain invited entry", () => {
    const d = drive()
    const e = buildRosterEntry({ ...incoming, email: "new@example.com", status: "INVITED", aiScore: 0 }, d.rounds[1], d)
    assert.equal(e.resumeFilename, undefined)
    assert.equal(e.status, "INVITED")
})
