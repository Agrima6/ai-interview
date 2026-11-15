import { after, before, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import http from "http"
import { explainUpstreamFailure, extractJson } from "../services/oaAi.service.js"

// A stand-in for an OpenAI-compatible provider (OpenAI, Groq...). Each test sets what it should answer with.
let server; let port; let reply
const SECTION = "sec-1"

before(async () => {
    server = http.createServer((req, res) => {
        let raw = ""
        req.on("data", (c) => { raw += c })
        req.on("end", () => {
            const body = JSON.parse(raw || "{}")
            const out = reply(body, req)
            res.writeHead(out.status || 200, { "content-type": "application/json" })
            res.end(JSON.stringify(out.json))
        })
    })
    await new Promise((r) => server.listen(0, "127.0.0.1", r))
    port = server.address().port
    process.env.OA_AI_API_KEY = "test-key"
    process.env.OA_AI_BASE_URL = `http://127.0.0.1:${port}/v1`
    process.env.OA_AI_MODEL = "test-model"
})
after(() => new Promise((r) => server.close(r)))

const ask = async (over = {}) => {
    const { generateQuestions } = await import("../services/oaAi.service.js")
    return generateQuestions({ prompt: "Quantitative aptitude for freshers: percentages and ratios", count: 5, types: ["MCQ"], sectionId: SECTION, sectionIds: [SECTION], ...over })
}
const content = (text) => ({ json: { choices: [{ message: { content: text } }] } })
const mcq = (extra = {}) => ({ type: "MCQ", text: "What is 20% of 150?", options: ["20", "25", "30", "35"], correct: "C", marks: 1, difficulty: "EASY", ...extra })

describe("AI question drafting", () => {
    beforeEach(() => { reply = () => content(JSON.stringify({ questions: [mcq()] })) })

    it("accepts a clean answer", async () => {
        const r = await ask()
        assert.equal(r.questions.length, 1)
        assert.deepEqual(r.questions[0].correct, [r.questions[0].options[2].id])
    })

    it("reads JSON wrapped in fences and chatter", async () => {
        reply = () => content("Sure! Here you go:\n```json\n" + JSON.stringify({ questions: [mcq()] }) + "\n```\nHope this helps.")
        assert.equal((await ask()).questions.length, 1)
    })

    it("reads a bare array", async () => {
        reply = () => content(JSON.stringify([mcq(), mcq({ text: "What is 10% of 90?", correct: "B", options: ["8", "9", "10", "11"] })]))
        assert.equal((await ask()).questions.length, 2)
    })

    it("strips A) / 1. prefixes from options and resolves 'B) text' answers", async () => {
        reply = () => content(JSON.stringify({ questions: [mcq({ options: ["A) 20", "B) 25", "C) 30", "D) 35"], correct: "C) 30" })] }))
        const q = (await ask()).questions[0]
        assert.deepEqual(q.options.map((o) => o.text), ["20", "25", "30", "35"])
        assert.deepEqual(q.correct, [q.options[2].id])
    })

    it("handles MSQ with letters and lowercase", async () => {
        reply = () => content(JSON.stringify({ questions: [{ type: "MSQ", text: "Which are prime?", options: ["2", "3", "4", "9"], correct: ["a", "b"], marks: 2 }] }))
        const q = (await ask({ types: ["MSQ"] })).questions[0]
        assert.equal(q.correct.length, 2)
    })

    it("does not guess when the key is a bare number, and reports it as skipped", async () => {
        reply = () => content(JSON.stringify({ questions: [mcq({ correct: 2 }), mcq({ text: "Another question here?", correct: "A" })] }))
        const r = await ask()
        assert.equal(r.questions.length, 1)
        assert.equal(r.skipped, 1)
    })

    it("drops duplicates and types that were not asked for", async () => {
        reply = () => content(JSON.stringify({ questions: [mcq(), mcq(), { type: "LONG", text: "Explain percentages in detail please.", marks: 5 }] }))
        assert.equal((await ask()).questions.length, 1)
    })

    it("retries without JSON mode when the provider refuses it", async () => {
        let calls = 0
        reply = (body) => { calls++; return body.response_format ? { status: 400, json: { error: { message: "response_format is not supported by this model" } } } : content(JSON.stringify({ questions: [mcq()] })) }
        assert.equal((await ask()).questions.length, 1)
        assert.equal(calls, 2)
    })

    it("explains a provider with no credits", async () => {
        reply = () => ({ status: 429, json: { error: { message: "You have no credits remaining" } } })
        await assert.rejects(ask(), (e) => e.code === "AI_UNAVAILABLE" && /credits/.test(e.message))
    })

    it("explains a rejected key and an unknown model", async () => {
        reply = () => ({ status: 401, json: { error: { message: "Invalid API key" } } })
        await assert.rejects(ask(), (e) => /key/.test(e.message))
        reply = () => ({ status: 404, json: { error: { message: "The model `nope` does not exist" } } })
        await assert.rejects(ask(), (e) => /model/.test(e.message))
    })

    it("fails clearly on unreadable output", async () => {
        reply = () => content("I cannot help with that.")
        await assert.rejects(ask(), (e) => e.code === "AI_BAD_RESPONSE")
    })

    it("rejects out-of-range counts and short prompts before calling the provider", async () => {
        let called = false
        reply = () => { called = true; return content("{}") }
        await assert.rejects(ask({ count: 26 }), (e) => e.code === "VALIDATION_ERROR")
        await assert.rejects(ask({ count: 0 }), (e) => e.code === "VALIDATION_ERROR")
        await assert.rejects(ask({ count: 2.5 }), (e) => e.code === "VALIDATION_ERROR")
        await assert.rejects(ask({ prompt: "short" }), (e) => e.code === "VALIDATION_ERROR")
        assert.equal(called, false)
    })
})

describe("helpers", () => {
    it("extractJson", () => {
        assert.deepEqual(extractJson('{"a":1}'), { a: 1 })
        assert.deepEqual(extractJson('text {"a":1} more'), { a: 1 })
        assert.equal(extractJson("nothing"), null)
    })
    it("explainUpstreamFailure has no raw provider text", () => {
        assert.doesNotMatch(explainUpstreamFailure({ response: { status: 500, data: { error: { message: "secret internal stack" } } } }), /secret/)
    })
})
