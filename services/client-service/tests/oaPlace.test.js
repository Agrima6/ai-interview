import test from "node:test"
import assert from "node:assert/strict"
import { placeName, validCoordinates } from "../services/oaPlace.service.js"

test("coordinates are checked before anything is looked up", () => {
    assert.equal(validCoordinates(28.4595, 77.0266), true)
    assert.equal(validCoordinates(91, 0), false)
    assert.equal(validCoordinates(0, 181), false)
    assert.equal(validCoordinates("abc", 1), false)
})

test("no coordinates, or impossible ones, give no place and make no request", async () => {
    assert.equal(await placeName(null, null), null)
    assert.equal(await placeName("", ""), null)
    assert.equal(await placeName(999, 1), null)
    assert.equal(await placeName("x", "y"), null)
})

test("a lookup that never connects gives up quickly with no place (the hard limit covers connecting)", async () => {
    // 10.255.255.1 is a blackhole address: the connection never completes, so only a whole-request limit can end it.
    const started = Date.now()
    const { default: axios } = await import("axios")
    const real = axios.get
    axios.get = (url, cfg) => real("http://10.255.255.1/", { ...cfg, params: undefined })
    try { assert.equal(await placeName(28.4595, 77.0266, { timeoutMs: 700 }), null) } finally { axios.get = real }
    assert.ok(Date.now() - started < 3000, `took ${Date.now() - started} ms`)
})
