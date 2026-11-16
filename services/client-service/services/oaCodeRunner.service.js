import axios from "axios"
import { ApiError } from "../utils/response.js"

// Runs a candidate's program against test cases in a sandbox that is NOT this server: untrusted code never executes
// here. Any Judge0-compatible service works; point OA_CODE_RUNNER_URL at it (for a demo, https://ce.judge0.com).
// Without that setting, "Run" is simply unavailable and coding answers are marked by a person.

// Our language ids -> Judge0 language ids. Database and markup languages cannot be run this way.
const LANGUAGE_IDS = Object.freeze({
    javascript: 97, typescript: 74, python: 100, java: 62, c: 103, cpp: 105, csharp: 51, go: 107, rust: 108,
    kotlin: 111, swift: 83, php: 98, ruby: 72, scala: 112, dart: 90, r: 99, perl: 85, bash: 46, sql: 82,
})

const clean = (value) => String(value || "").trim().replace(/^["']|["']$/g, "").trim()
const config = () => ({ url: clean(process.env.OA_CODE_RUNNER_URL).replace(/\/$/, ""), key: clean(process.env.OA_CODE_RUNNER_KEY) })

export const runnerConfigured = () => Boolean(config().url)
export const runnableLanguages = () => (runnerConfigured() ? Object.keys(LANGUAGE_IDS) : [])
export const canRunLanguage = (language) => runnerConfigured() && Object.hasOwn(LANGUAGE_IDS, String(language))

const b64 = (text) => Buffer.from(String(text ?? ""), "utf8").toString("base64")
const unb64 = (text) => (text ? Buffer.from(String(text), "base64").toString("utf8") : "")
const clip = (text, max = 3000) => (text.length > max ? `${text.slice(0, max)}\n… (output cut)` : text)

/** Trailing spaces on a line and blank lines at the end are not mistakes: "3\n" equals "3". */
export const normalizeOutput = (text) => String(text ?? "").replace(/\r\n/g, "\n").split("\n").map((line) => line.replace(/\s+$/, "")).join("\n").replace(/\s+$/, "")
export const outputsMatch = (a, b) => normalizeOutput(a) === normalizeOutput(b)

// Judge0 status ids: 3 ran fine, 5 too slow, 6 would not compile, 7-12 crashed, 13-14 the sandbox itself failed.
const verdictOf = (id) => (id === 3 ? "OK" : id === 5 ? "TIME_LIMIT" : id === 6 ? "COMPILE_ERROR" : id >= 7 && id <= 12 ? "RUNTIME_ERROR" : "ERROR")

/** One run of the program with `stdin`. Never throws for a bad program, only when the runner itself is unreachable. */
export const runOnce = async ({ language, code, stdin }) => {
    const { url, key } = config()
    if (!url) throw new ApiError(503, "CODE_RUNNER_NOT_CONFIGURED", "Running code is not set up on this server. Your code is saved and your organizer will review it.")
    if (!Object.hasOwn(LANGUAGE_IDS, language)) throw new ApiError(400, "UNSUPPORTED_LANGUAGE", "This language cannot be run here. Your code is still saved.")
    try {
        const res = await axios.post(`${url}/submissions`, { source_code: b64(code), language_id: LANGUAGE_IDS[language], stdin: b64(stdin), cpu_time_limit: 5, wall_time_limit: 10, memory_limit: 256000 }, {
            params: { base64_encoded: true, wait: true, fields: "stdout,stderr,compile_output,message,status,time,memory" },
            headers: { "Content-Type": "application/json", "User-Agent": "WorkmateIQ/1.0 (online assessment)", ...(key ? { "X-Auth-Token": key } : {}) },
            timeout: 35000,
        })
        const d = res.data || {}
        const verdict = verdictOf(d.status?.id)
        return {
            verdict, status: d.status?.description || "",
            stdout: clip(unb64(d.stdout)), stderr: clip(unb64(d.stderr)), compileOutput: clip(unb64(d.compile_output)), message: clip(unb64(d.message) || String(d.message || "")),
            timeMs: d.time ? Math.round(Number(d.time) * 1000) : null,
        }
    } catch (error) {
        const status = error.response?.status
        console.error("[client-service] OA code runner failed:", status, error.code || error.message)
        throw new ApiError(502, "CODE_RUNNER_UNAVAILABLE", status === 429 ? "The code runner is busy right now. Wait a few seconds and try again." : "The code runner could not be reached. Try again in a moment. Your code is saved.")
    }
}

/**
 * Run `cases` ({ input, expected, hidden }) and compare each output with what was expected. A program that does not
 * compile is reported once and the other cases are not run. At most three cases run at the same time.
 */
export const runCases = async ({ language, code, cases }) => {
    const results = new Array(cases.length)
    let blocked = null
    let next = 0
    const worker = async () => {
        while (next < cases.length) {
            const index = next++
            const c = cases[index]
            if (blocked) { results[index] = { index, hidden: Boolean(c.hidden), passed: false, verdict: "COMPILE_ERROR", output: "", error: blocked, timeMs: null }; continue }
            const r = await runOnce({ language, code, stdin: c.input })
            if (r.verdict === "COMPILE_ERROR") blocked = r.compileOutput || r.message || "The program did not compile."
            const passed = r.verdict === "OK" && outputsMatch(r.stdout, c.expected)
            results[index] = {
                index, hidden: Boolean(c.hidden), passed, verdict: r.verdict === "OK" && !passed ? "WRONG_ANSWER" : r.verdict,
                output: r.stdout, error: r.verdict === "COMPILE_ERROR" ? (r.compileOutput || r.message) : (r.stderr || r.message || ""), timeMs: r.timeMs,
            }
        }
    }
    await Promise.all(Array.from({ length: Math.min(3, cases.length) }, worker))
    return results
}
