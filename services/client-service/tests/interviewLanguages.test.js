import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { INTERVIEW_LANGUAGES, isInterviewLanguage, normalizeInterviewLanguage } from "../utils/interviewLanguages.js"

test("every language is valid, anything else falls back to English", () => {
    for (const lang of INTERVIEW_LANGUAGES) assert.ok(isInterviewLanguage(lang.value))
    assert.ok(!isInterviewLanguage("klingon"))
    assert.equal(normalizeInterviewLanguage("ta"), "ta")
    assert.equal(normalizeInterviewLanguage("zz"), "en")
    assert.equal(normalizeInterviewLanguage(undefined), "en")
})

test("the client's language list is identical to the server's", () => {
    const client = fs.readFileSync(new URL("../../../client/src/constants/interviewLanguages.js", import.meta.url), "utf8")
    const rows = [...client.matchAll(/value: '(\w+)', label: '([^']+)', native: '([^']+)'/g)].map((m) => [m[1], m[2], m[3]])
    assert.deepEqual(rows, INTERVIEW_LANGUAGES.map((l) => [l.value, l.label, l.native]))
})

test("the interviewer agent supports every language offered (when its repo is checked out beside this one)", () => {
    const agent = new URL("../../../../workmate-iq-agent/languages.py", import.meta.url)
    if (!fs.existsSync(agent)) return
    const text = fs.readFileSync(agent, "utf8")
    for (const { value } of INTERVIEW_LANGUAGES) {
        assert.ok(text.includes(`"${value}"`), `agent has no language "${value}"`)
    }
})

test("candidates are offered only languages the active voice can speak, and everything if the agent is unreachable", async () => {
    const { agentServiceClient } = await import("../config/agentServiceClient.js")
    const { getAvailableInterviewLanguages } = await import("../services/voiceProvider.service.js")
    const original = agentServiceClient.getVoiceProvider
    try {
        agentServiceClient.getVoiceProvider = async () => ({ supportedLanguages: ["en", "hi", "hinglish", "ta", "zz"] })
        assert.deepEqual(await getAvailableInterviewLanguages(), ["en", "hi", "hinglish", "ta"])
        agentServiceClient.getVoiceProvider = async () => { throw new Error("down") }
        assert.equal((await getAvailableInterviewLanguages()).length, INTERVIEW_LANGUAGES.length)
    } finally {
        agentServiceClient.getVoiceProvider = original
    }
})
