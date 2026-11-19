import test from "node:test"
import assert from "node:assert/strict"

process.env.MONGODB_URL ||= "mongodb://127.0.0.1:1/none"
const { injectOrgLogo, interpolateHtml } = await import("../services/communication.service.js")
const { wrapOrgEmailBodyWithHero, wrapOrgEmailBody } = await import("../utils/emailHtml.js")

test("the organization's logo is placed above its name in both branded shells", () => {
    const hero = interpolateHtml(wrapOrgEmailBodyWithHero("<p>hi</p>", "company_name", { heading: "H" }), { company_name: "QA Test Co" })
    const withLogo = injectOrgLogo(hero, "https://api.example.com/api/v1/oa/brand/client/abc/logo", "QA Test Co")
    assert.match(withLogo, /<img src="https:\/\/api\.example\.com\/api\/v1\/oa\/brand\/client\/abc\/logo" alt="QA Test Co"/)
    assert.ok(withLogo.indexOf("<img") < withLogo.indexOf("QA Test Co</p>"))
    const plain = interpolateHtml(wrapOrgEmailBody("<p>hi</p>", "company_name"), { company_name: "QA Test Co" })
    assert.match(injectOrgLogo(plain, "http://localhost:4000/logo", "QA Test Co"), /<img src="http:\/\/localhost:4000\/logo"/)
})

test("no logo, or a logo address that is not plain http(s), leaves the email untouched", () => {
    const hero = interpolateHtml(wrapOrgEmailBodyWithHero("<p>hi</p>", "company_name", { heading: "H" }), { company_name: "X" })
    for (const bad of ["", undefined, "javascript:alert(1)", 'https://x.com/a"onerror="alert(1)', "data:image/png;base64,AAAA"]) assert.equal(injectOrgLogo(hero, bad, "X"), hero)
})

test("names are data, never markup, inside the HTML email", () => {
    const html = interpolateHtml("<b>{{company_name}}</b> {{note_html}}", { company_name: '<script>alert(1)</script> & Co', note_html: "<i>ok</i>" })
    assert.equal(html, "<b>&lt;script&gt;alert(1)&lt;/script&gt; &amp; Co</b> <i>ok</i>")
})

test("the sender shows as the organization's own name, cleaned so it cannot break the From header", async () => {
    const { withDisplayName } = await import("../providers/emailProvider.js")
    assert.equal(withDisplayName("WorkmateIQ <onboarding@workmateiq.com>", "QA Test Co"), '"QA Test Co" <onboarding@workmateiq.com>')
    assert.equal(withDisplayName("onboarding@workmateiq.com", "QA Test Co"), '"QA Test Co" <onboarding@workmateiq.com>')
    assert.equal(withDisplayName("WorkmateIQ <a@b.com>", 'Evil" <x@y.com>\r\nBcc: z@z.com'), '"Evil x@y.com Bcc: z@z.com" <a@b.com>')
    assert.equal(withDisplayName("WorkmateIQ <a@b.com>", undefined), "WorkmateIQ <a@b.com>")
})
