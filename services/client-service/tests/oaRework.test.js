import test from "node:test"
import assert from "node:assert/strict"
import { attemptDeadline, gradeAnswer, gradeAttempt, hasAnswer, parseSchedule, schedulePhase } from "../utils/oaExam.js"
import { normalizeQuestion, sectionName, studentQuestionView } from "../utils/oaQuestions.js"
import { CODE_LANGUAGES, OA_LANGUAGES, defaultStarter, starterCodesFor } from "../utils/oaLanguages.js"
import { signedVideoPath, verifyVideoSignature, videoObjectKey } from "../utils/oaVideo.js"

const ctx = { sectionIds: ["s1"], defaultSectionId: "s1" }
const MIN = 60000

test("multiple-correct: part marks only when switched on, and one wrong option is still a wrong answer", () => {
    const q = normalizeQuestion({ type: "MSQ", text: "Q", options: ["a", "b", "c", "d"], correct: "A;B;C", marks: 3, negativeMarks: 1 }, ctx)
    const [a, b, c, d] = q.options.map((o) => o.id)
    assert.equal(gradeAnswer(q, [a, b]).marks, -1)                                   // off by default: all or nothing
    const part = gradeAnswer(q, [a, b], { partialMarking: true })
    assert.equal(part.marks, 2)
    assert.equal(part.partial, true)
    assert.equal(gradeAnswer(q, [a], { partialMarking: true }).marks, 1)
    assert.equal(gradeAnswer(q, [a, b, c], { partialMarking: true }).marks, 3)
    assert.equal(gradeAnswer(q, [a, d], { partialMarking: true }).marks, -1)         // a wrong pick cancels the part marks
    assert.equal(gradeAnswer(q, [], { partialMarking: true }).marks, 0)

    const single = normalizeQuestion({ type: "MCQ", text: "Q", options: ["a", "b"], correct: "A", marks: 2 }, ctx)
    assert.equal(gradeAnswer(single, single.options[1].id, { partialMarking: true }).marks, 0)   // never applies to single-correct

    const on = gradeAttempt({ questions: [q], answers: { [q.id]: { value: [a, b] } }, settings: { partialMarking: true } })
    const off = gradeAttempt({ questions: [q], answers: { [q.id]: { value: [a, b] } }, settings: {} })
    assert.equal(on.score, 2)
    assert.equal(off.score, 0)
})

test("an open window: start any time inside it, day or night, and always get the full duration", () => {
    const now = Date.UTC(2026, 0, 10, 12)
    const iso = (m) => new Date(now + m * MIN).toISOString()
    const s = parseSchedule({ mode: "FLEXIBLE", startAt: iso(-60), endAt: iso(30), durationMinutes: 60 }, { now })
    assert.equal(s.mode, "FLEXIBLE")                                                // a window shorter than the duration is fine
    assert.equal(s.lateEntryMinutes, 0)
    assert.equal(parseSchedule({ mode: "FLEXIBLE", startAt: iso(60), endAt: iso(30), durationMinutes: 60 }, { now }).field, "endAt")
    assert.equal(parseSchedule({ mode: "FLEXIBLE", startAt: iso(-90), endAt: iso(-30), durationMinutes: 60 }, { now }).field, "endAt")
    assert.equal(parseSchedule({ mode: "FLEXIBLE", startAt: "x", endAt: iso(30), durationMinutes: 60 }, { now }).field, "startAt")

    assert.equal(schedulePhase(s, now - 61 * MIN), "UPCOMING")
    assert.equal(schedulePhase(s, now + 29 * MIN), "OPEN")                           // no "closed to entry" inside the window
    assert.equal(schedulePhase(s, now + 30 * MIN), "ENDED")
    const lastMinute = now + 29 * MIN
    assert.equal(attemptDeadline(s, new Date(lastMinute)).getTime(), lastMinute + 60 * MIN)
    const fixed = parseSchedule({ startAt: iso(0), endAt: iso(90), durationMinutes: 60 }, { now: now - 1 })
    assert.equal(attemptDeadline(fixed, new Date(now + 60 * MIN)).getTime(), now + 90 * MIN)     // a fixed test still closes on time
})

test("sections are numbered by position; only a real name is stored", () => {
    assert.equal(sectionName("Section 1"), "")
    assert.equal(sectionName("  section 12 "), "")
    assert.equal(sectionName("Untitled section"), "")
    assert.equal(sectionName(""), "")
    assert.equal(sectionName(" Aptitude "), "Aptitude")
    assert.equal(sectionName("Section 2 Reasoning"), "Section 2 Reasoning")
})

test("coding languages: a wide list, each with a starter snippet the candidate begins from", () => {
    assert.ok(OA_LANGUAGES.length >= 20)
    assert.equal(new Set(CODE_LANGUAGES).size, CODE_LANGUAGES.length)
    for (const l of OA_LANGUAGES) assert.ok(l.label && l.starter.trim(), l.id)

    const q = normalizeQuestion({ type: "CODING", text: "Add", marks: 10, codeLanguages: ["python", "java", "nope"], starterCodes: { java: "class Main {}", nope: "x", python: "   " } }, ctx)
    assert.deepEqual(q.codeLanguages, ["python", "java"])                             // unknown languages are dropped
    assert.equal(q.starterCodes.nope, undefined)
    const view = studentQuestionView(q)
    assert.equal(view.starterCodes.java, "class Main {}")                            // the organizer's own snippet wins
    assert.equal(view.starterCodes.python, defaultStarter("python"))                  // blank falls back to the default

    const legacy = { codeLanguages: ["cpp", "go"], starterCode: "// old snippet" }
    assert.deepEqual(starterCodesFor(legacy), { cpp: "// old snippet", go: defaultStarter("go") })
})

test("a video question: recorded answer, bounded length, graded by a person", () => {
    const q = normalizeQuestion({ type: "VIDEO", text: "Tell me about yourself", marks: 5, maxDurationSec: 90 }, ctx)
    assert.equal(q.type, "VIDEO")
    assert.equal(q.maxDurationSec, 90)
    assert.equal(normalizeQuestion({ type: "VIDEO", text: "Introduce yourself" }, ctx).maxDurationSec, 120)
    assert.throws(() => normalizeQuestion({ type: "VIDEO", text: "Introduce yourself", maxDurationSec: 9999 }, ctx), (e) => Boolean(e.fields.maxDurationSec))   // out of range is refused, not clamped
    assert.equal(studentQuestionView(q).maxDurationSec, 90)
    assert.equal(hasAnswer({ videoKey: "k" }), true)
    assert.equal(hasAnswer({}), false)
    const g = gradeAnswer(q, { videoKey: "k" })
    assert.equal(g.marks, null)
    assert.equal(g.needsReview, true)
    assert.equal(gradeAnswer(q, null).marks, 0)
})

test("a video link is signed, tied to one answer, and expires", () => {
    const path = signedVideoPath("att1", "q1")
    const url = new URL(path, "http://x")
    const exp = url.searchParams.get("exp"), sig = url.searchParams.get("sig")
    assert.match(url.pathname, /\/oa\/video\/att1\/q1$/)
    assert.equal(verifyVideoSignature("att1", "q1", exp, sig), true)
    assert.equal(verifyVideoSignature("att2", "q1", exp, sig), false)
    assert.equal(verifyVideoSignature("att1", "q1", exp, "0".repeat(sig.length)), false)
    const old = new URL(signedVideoPath("att1", "q1", -10), "http://x")
    assert.equal(verifyVideoSignature("att1", "q1", old.searchParams.get("exp"), old.searchParams.get("sig")), false)
    assert.match(videoObjectKey({ assessmentId: "a", attemptId: "b", questionId: "c", mime: "video/mp4" }), /\.mp4$/)
})

test("the invitation for an open-window round says there is no fixed time and names the round", async () => {
    const { inviteEmail } = await import("../services/oaMail.js")
    const assessment = {
        _id: "507f1f77bcf86cd799439011", title: "Campus Hiring", roundNumber: 2, roundLabel: "Coding",
        schedule: { mode: "FLEXIBLE", startAt: new Date("2026-03-01T00:00:00Z"), endAt: new Date("2026-03-05T00:00:00Z"), durationMinutes: 60, timezone: "Asia/Kolkata", slots: [] },
        proctoring: { requireLocation: true },
    }
    const mail = inviteEmail({ assessment, student: { name: "Asha Verma", email: "asha@c.test" }, code: "ABCD2345", orgName: "Acme" })
    assert.match(mail.body, /Round 2 \(Coding\) of Campus Hiring/)
    assert.match(mail.body, /no fixed time/i)
    assert.match(mail.body, /share your location/i)
    assert.doesNotMatch(mail.body, /Choose your time slot/)
})

test("a recording is judged by its contents, not by the label the browser gave it", async () => {
    const { sniffVideoType } = await import("../utils/oaVideo.js")
    const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(40)])
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(40)])
    assert.equal(sniffVideoType(webm), "video/webm")
    assert.equal(sniffVideoType(mp4), "video/mp4")
    assert.equal(sniffVideoType(Buffer.from("not a video at all, just text")), null)
    assert.equal(sniffVideoType(Buffer.alloc(0)), null)
    assert.equal(sniffVideoType(null), null)
})
