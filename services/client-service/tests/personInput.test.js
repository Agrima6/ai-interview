import test from "node:test"
import assert from "node:assert/strict"
import { validatePersonName, normalizePhone } from "../utils/personInput.js"

test("legitimate Indian and international names are accepted", () => {
    for (const name of ["Aarav Sharma", "Agrima Agarwal", "Priya K.", "O'Brien", "Anne-Marie Dubois", "José Álvarez", "विनीत यादव", "அருண் குமார்", "Müller Zoë", "李 小龍", "Mary Jane Watson-Parker"]) {
        assert.equal(validatePersonName(name).ok, true, name)
    }
})

test("names with digits, URLs, markup or script are rejected", () => {
    for (const name of ["Vinit1234", "http://evil.example", "www.spam.com", "evil.com/path", "<script>alert(1)</script>", "Robert'); DROP TABLE", "a@b.com", "x", "  ", "Name--Name", "..", "$$$", "{{7*7}}", "javascript:alert(1)", "John_Doe"]) {
        assert.equal(validatePersonName(name).ok, false, name)
    }
})

test("names are trimmed and whitespace collapsed", () => {
    assert.equal(validatePersonName("  Aarav    Sharma ").value, "Aarav Sharma")
    assert.equal(validatePersonName("a".repeat(101)).ok, false)
})

test("Indian mobile numbers normalise to 10 digits", () => {
    for (const raw of ["9876543210", "+91 98765 43210", "+91-9876543210", "919876543210", "09876543210", "(98765) 43210"]) {
        assert.deepEqual(normalizePhone(raw), { ok: true, value: "9876543210" }, raw)
    }
})

test("explicit international numbers are kept with their country code", () => {
    assert.deepEqual(normalizePhone("+1 (415) 555-0132"), { ok: true, value: "+14155550132" })
    assert.deepEqual(normalizePhone("+44 7911 123456"), { ok: true, value: "+447911123456" })
})

test("malformed numbers are rejected: too long, too short, letters, URLs, repeated digit", () => {
    for (const raw of ["7900991020323424", "12345", "98765abc10", "http://x.com", "+", "+123", "+1234567890123456", "0000000000", "<script>"]) {
        assert.equal(normalizePhone(raw).ok, false, raw)
    }
})

test("phone is optional", () => {
    assert.deepEqual(normalizePhone(""), { ok: true, value: "" })
    assert.deepEqual(normalizePhone(undefined), { ok: true, value: "" })
})
