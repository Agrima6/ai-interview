import test from "node:test"
import assert from "node:assert/strict"
import { escapeHtml, renderEmailHtml, safeColor } from "../utils/oaEmailHtml.js"
import { inviteEmail } from "../services/oaMail.js"

const assessment = {
    _id: "507f1f77bcf86cd799439011", title: "Campus <b>Hiring</b>", roundNumber: 1, roundLabel: "",
    schedule: { mode: "FLEXIBLE", startAt: new Date("2026-03-01T00:00:00Z"), endAt: new Date("2026-03-05T00:00:00Z"), durationMinutes: 60, timezone: "Asia/Kolkata", slots: [] },
    proctoring: { requireLocation: false },
}

test("escapeHtml neutralises markup and quotes", () => {
    assert.equal(escapeHtml(`<img src=x onerror="a()">&'`), "&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;")
})

test("only a plain #RRGGBB brand colour is used", () => {
    assert.equal(safeColor("#16A34A"), "#16A34A")
    assert.equal(safeColor("red; background:url(x)"), "#B9141A")
    assert.equal(safeColor(null), "#B9141A")
})

test("the email shows the organization's logo when there is one, and an initial when there is not", () => {
    const withLogo = renderEmailHtml({ brand: { name: "Acme College", logoUrl: "https://api.example.com/api/v1/oa/brand/1/logo", color: "#16A34A" }, heading: "Hi" })
    assert.match(withLogo, /<img src="https:\/\/api\.example\.com\/api\/v1\/oa\/brand\/1\/logo"/)
    assert.match(withLogo, /#16A34A/)
    const without = renderEmailHtml({ brand: { name: "Acme College", logoUrl: "" }, heading: "Hi" })
    assert.doesNotMatch(without, /<img/)
    assert.match(without, />A<\/td>/)
    // A logo address that is not http(s) is never placed in the page.
    assert.doesNotMatch(renderEmailHtml({ brand: { name: "X", logoUrl: "javascript:alert(1)" }, heading: "Hi" }), /javascript:/)
})

test("people's text is escaped everywhere in the invitation", () => {
    const mail = inviteEmail({ assessment, student: { name: "Asha <script>x</script>", email: "a@b.test" }, code: "ABCD2345", orgName: "Acme & Sons", brand: { name: "Acme & Sons", logoUrl: "", color: "#B9141A" } })
    assert.doesNotMatch(mail.html, /<script>/)
    assert.match(mail.html, /Asha &lt;script&gt;/)
    assert.match(mail.html, /Acme &amp; Sons/)
    assert.match(mail.html, /Campus &lt;b&gt;Hiring/)
})

test("the invitation carries the code, the sign-in link and a plain-text fallback", () => {
    const mail = inviteEmail({ assessment, student: { name: "Asha", email: "asha@c.test" }, code: "ABCD2345", orgName: "Acme" })
    assert.match(mail.html, /ABCD2345/)
    assert.match(mail.html, /href="[^"]*\/oa\/exam\?a=507f1f77bcf86cd799439011&amp;e=asha%40c\.test"/)
    assert.match(mail.html, /No fixed time/)
    assert.match(mail.body, /ABCD2345/)
    assert.doesNotMatch(mail.body, /<table/)
})
