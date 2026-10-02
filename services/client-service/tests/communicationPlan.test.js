import test from "node:test"
import assert from "node:assert/strict"
import { mapServiceStatus, advanceStatus, planDispatch } from "../utils/communicationPlan.js"

test("asking the service to send is QUEUED, never SENT; only provider confirmation moves it on", () => {
    assert.equal(mapServiceStatus("QUEUED"), "QUEUED")
    assert.equal(mapServiceStatus(undefined), "QUEUED")
    assert.equal(mapServiceStatus("mystery"), "QUEUED")
    assert.equal(mapServiceStatus("SENT"), "SENT")
    assert.equal(mapServiceStatus("DELIVERED"), "DELIVERED")
    assert.equal(mapServiceStatus("OPENED"), "DELIVERED")          // opened implies delivered
    assert.equal(mapServiceStatus("FAILED"), "FAILED")
})

test("status only moves forward and a later failure cannot erase a confirmed send", () => {
    assert.equal(advanceStatus("QUEUED", "SENT"), "SENT")
    assert.equal(advanceStatus("SENT", "DELIVERED"), "DELIVERED")
    assert.equal(advanceStatus("DELIVERED", "QUEUED"), "DELIVERED")
    assert.equal(advanceStatus("SENT", "FAILED"), "SENT")
    assert.equal(advanceStatus("QUEUED", "FAILED"), "FAILED")
    assert.equal(advanceStatus("FAILED", "QUEUED"), "QUEUED")      // a retry may replace a failure
})

const cand = (id, extra = {}) => ({ id, status: "SCHEDULED", communications: [], ...extra })
const sent = (purpose, status = "SENT", extra = {}) => ({ purpose, channel: "EMAIL", status, ...extra })

test("a second click sends nothing new: already-sent candidates are skipped, failed ones are retried", () => {
    const list = [cand("a", { communications: [sent("CONGRATULATIONS")] }), cand("b", { communications: [sent("CONGRATULATIONS", "FAILED")] }),
                  cand("c", { communications: [sent("CONGRATULATIONS", "QUEUED")] }), cand("d")]
    const { toSend, skipped } = planDispatch(list, { purpose: "CONGRATULATIONS", channel: "EMAIL" })
    assert.deepEqual(toSend.map((c) => c.id), ["b", "d"])
    assert.deepEqual(skipped.map((s) => [s.candidate.id, s.reason]), [["a", "ALREADY_SENT"], ["c", "ALREADY_SENT"]])
})

test("the same channel matters: an email does not block a WhatsApp, and rejection does not block selection history", () => {
    const c = cand("a", { communications: [sent("CONGRATULATIONS")] })
    assert.equal(planDispatch([c], { purpose: "CONGRATULATIONS", channel: "WHATSAPP" }).toSend.length, 1)
})

test("an idempotency key makes the whole request repeatable", () => {
    const c = cand("a", { communications: [sent("REJECTION", "FAILED", { idempotencyKey: "k1" })] })
    assert.equal(planDispatch([c], { purpose: "REJECTION", channel: "EMAIL", idempotencyKey: "k1" }).skipped[0].reason, "DUPLICATE_REQUEST")
    assert.equal(planDispatch([c], { purpose: "REJECTION", channel: "EMAIL", idempotencyKey: "k2" }).toSend.length, 1)
})

test("selected and rejected are mutually exclusive", () => {
    const selected = cand("s", { status: "SHORTLISTED" }), rejected = cand("r", { status: "REJECTED" })
    assert.equal(planDispatch([selected], { purpose: "REJECTION", channel: "EMAIL" }).skipped[0].reason, "ALREADY_SELECTED")
    assert.equal(planDispatch([rejected], { purpose: "CONGRATULATIONS", channel: "EMAIL" }).skipped[0].reason, "ALREADY_REJECTED")
    assert.equal(planDispatch([rejected], { purpose: "REJECTION", channel: "EMAIL" }).toSend.length, 1)
})
