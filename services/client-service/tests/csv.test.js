import test from "node:test"
import assert from "node:assert/strict"
import { csvEscape } from "../utils/csv.js"

test("plain values pass through and negative numbers stay numbers", () => {
    assert.equal(csvEscape("Asha Verma"), "Asha Verma")
    assert.equal(csvEscape(42), "42")
    assert.equal(csvEscape("-5"), "-5")
    assert.equal(csvEscape(null), "")
})

test("commas, quotes and line breaks are quoted", () => {
    assert.equal(csvEscape("Computer Science, Engineering"), '"Computer Science, Engineering"')
    assert.equal(csvEscape('say "hi"'), '"say ""hi"""')
    assert.equal(csvEscape("a\nb"), '"a\nb"')
    assert.equal(csvEscape("a\rb"), '"a\rb"')
})

test("spreadsheet formulas are neutralised so a typed name cannot run in Excel", () => {
    assert.equal(csvEscape("=HYPERLINK(\"http://evil\")"), `"'=HYPERLINK(""http://evil"")"`)
    assert.equal(csvEscape("@SUM(A1:A9)"), "'@SUM(A1:A9)")
    assert.equal(csvEscape("+91 98765"), "'+91 98765")
    assert.equal(csvEscape("-cmd|calc"), "'-cmd|calc")
})
