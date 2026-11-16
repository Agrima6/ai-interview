import test from "node:test"
import assert from "node:assert/strict"
import { canRunLanguage, normalizeOutput, outputsMatch, runOnce, runnableLanguages } from "../services/oaCodeRunner.service.js"

test("output is compared the way a coding site does: trailing spaces and blank lines do not count", () => {
    assert.equal(outputsMatch("4", "4\n"), true)
    assert.equal(outputsMatch("4  \n\n", "4"), true)
    assert.equal(outputsMatch("1 2\r\n3\r\n", "1 2\n3"), true)
    assert.equal(outputsMatch("a b", "a  b"), false)          // spaces inside a line do count
    assert.equal(outputsMatch("4", "5"), false)
    assert.equal(outputsMatch("", ""), true)
    assert.equal(normalizeOutput(null), "")
})

test("with no runner configured nothing is runnable and a run is refused clearly", async () => {
    const saved = process.env.OA_CODE_RUNNER_URL
    delete process.env.OA_CODE_RUNNER_URL
    try {
        assert.deepEqual(runnableLanguages(), [])
        assert.equal(canRunLanguage("python"), false)
        await assert.rejects(() => runOnce({ language: "python", code: "x", stdin: "" }), (e) => e.code === "CODE_RUNNER_NOT_CONFIGURED")
    } finally { if (saved !== undefined) process.env.OA_CODE_RUNNER_URL = saved }
})

test("database and markup languages are never runnable, even with a runner", () => {
    const saved = process.env.OA_CODE_RUNNER_URL
    process.env.OA_CODE_RUNNER_URL = "http://127.0.0.1:9"
    try {
        assert.equal(canRunLanguage("python"), true)
        assert.equal(canRunLanguage("mongodb"), false)
        assert.equal(canRunLanguage("html"), false)
        assert.equal(canRunLanguage("__proto__"), false)
    } finally { if (saved === undefined) delete process.env.OA_CODE_RUNNER_URL; else process.env.OA_CODE_RUNNER_URL = saved }
})
