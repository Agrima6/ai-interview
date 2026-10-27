import test from "node:test"
import assert from "node:assert/strict"
import { planAssembly, assembleRecording, isAllowedMime, extensionFor } from "../services/recording.service.js"

const memoryStorage = (failGet = []) => {
    const objects = new Map()
    return {
        objects,
        async uploadBuffer(bucket, key, buf) { objects.set(key, Buffer.from(buf)); return key },
        async getObjectBuffer(bucket, key) { if (failGet.includes(key) || !objects.has(key)) throw new Error("NoSuchKey"); return objects.get(key) },
        async objectSize(bucket, key) { return objects.has(key) ? objects.get(key).length : null },
        async deleteObject(bucket, key) { objects.delete(key) },
    }
}
const seed = (storage, count, skip = []) => {
    const parts = []
    for (let i = 0; i < count; i += 1) {
        if (skip.includes(i)) continue
        const key = `p/${i}`
        storage.objects.set(key, Buffer.from(`[${i}]`))
        parts.push({ index: i, size: 3, key })
    }
    return parts
}
const run = (storage, parts, extra = {}) => assembleRecording({ storage, bucket: "b", baseKey: "base", recordingId: "rec-12345678", parts, mimeType: "video/webm;codecs=vp8,opus", endedCleanly: true, ...extra })

test("planAssembly finds missing parts and requires the header part", () => {
    assert.deepEqual(planAssembly([{ index: 0 }, { index: 2 }], 4).missing, [1, 3])
    assert.equal(planAssembly([{ index: 1 }], 2).playable, false)
    assert.equal(planAssembly([], undefined).expected, 0)
})

test("all parts present and ended cleanly => COMPLETED, assembled in order, read back and verified", async () => {
    const storage = memoryStorage()
    const parts = seed(storage, 4).reverse()           // arrival order must not matter
    const out = await run(storage, parts, { expectedParts: 4 })
    assert.equal(out.status, "COMPLETED")
    assert.equal(out.bytes, 12)
    assert.equal(storage.objects.get(out.key).toString(), "[0][1][2][3]")
    assert.match(out.key, /rec-12345678\.webm$/)
})

test("a missing middle part is INCOMPLETE and says so - never COMPLETED", async () => {
    const storage = memoryStorage()
    const out = await run(storage, seed(storage, 5, [2]), { expectedParts: 5 })
    assert.equal(out.status, "INCOMPLETE")
    assert.deepEqual(out.missing, [2])
    assert.ok(out.key)
})

test("the browser reporting more parts than arrived (tail lost) is INCOMPLETE", async () => {
    const storage = memoryStorage()
    const out = await run(storage, seed(storage, 3), { expectedParts: 6 })
    assert.equal(out.status, "INCOMPLETE")
    assert.deepEqual(out.missing, [3, 4, 5])
})

test("an interrupted capture with every received part is INCOMPLETE (it stopped early)", async () => {
    const storage = memoryStorage()
    const out = await run(storage, seed(storage, 3), { endedCleanly: false })
    assert.equal(out.status, "INCOMPLETE")
})

test("without the first part, or with no data, it is FAILED and nothing is stored as playable", async () => {
    const storage = memoryStorage()
    assert.equal((await run(storage, seed(storage, 3, [0]))).status, "FAILED")
    assert.equal((await run(memoryStorage(), [])).status, "FAILED")
})

test("a part that cannot be read back is reported missing", async () => {
    const storage = memoryStorage(["p/1"])
    const out = await run(storage, seed(storage, 3), { expectedParts: 3 })
    assert.equal(out.status, "INCOMPLETE")
    assert.deepEqual(out.missing, [1])
})

test("an assembled object that does not verify in storage is FAILED", async () => {
    const storage = memoryStorage()
    storage.objectSize = async () => 1
    assert.equal((await run(storage, seed(storage, 2), { expectedParts: 2 })).status, "FAILED")
})

test("media types", () => {
    assert.ok(isAllowedMime("video/webm;codecs=vp8,opus"))
    assert.ok(isAllowedMime("audio/webm"))
    assert.ok(!isAllowedMime("application/x-msdownload"))
    assert.equal(extensionFor("video/mp4"), "mp4")
})
