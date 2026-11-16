// A designed HTML email for candidates. Table layout and inline styles only: that is what mail apps render reliably.
// Every value that comes from a person (names, titles, an organization's name) is escaped; nothing is trusted as markup.

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])

export const DEFAULT_BRAND_COLOR = "#B9141A"
const HEX = /^#[0-9a-fA-F]{6}$/
/** A brand colour from the database is used only when it is a plain #RRGGBB value; anything else falls back. */
export const safeColor = (value, fallback = DEFAULT_BRAND_COLOR) => (HEX.test(String(value || "").trim()) ? String(value).trim() : fallback)

const safeUrl = (value) => (/^https?:\/\//i.test(String(value || "")) ? String(value) : "")

// Readable text on top of the brand colour: white on dark colours, near-black on light ones.
const onColor = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    const luminance = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
    return luminance > 0.62 ? "#111827" : "#FFFFFF"
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/**
 * @param brand   { name, logoUrl, color }  the organization sending the email (logoUrl must be absolute)
 * @param heading big line at the top of the card
 * @param greeting "Hello Asha,"
 * @param paragraphs[] short paragraphs
 * @param details [[label, value]]  e.g. window, duration
 * @param code    access code shown in a box
 * @param steps[] numbered instructions
 * @param cta     { label, url }
 * @param notes[] bulleted reminders
 * @param footer  small print
 */
export const renderEmailHtml = ({ brand = {}, preheader = "", heading, greeting, paragraphs = [], details = [], code, codeLabel = "Your access code", steps = [], cta, notes = [], notesTitle = "Before you begin", footer }) => {
    const color = safeColor(brand.color)
    const text = onColor(color)
    const name = String(brand.name || "Your organizer")
    const logo = safeUrl(brand.logoUrl)
    const mark = logo
        ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" height="44" style="display:block;height:44px;max-width:180px;width:auto;border:0;outline:none;text-decoration:none;">`
        : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:22px;background:${color};color:${text};font:700 20px/44px ${FONT};">${escapeHtml(name.charAt(0).toUpperCase())}</td></tr></table>`

    const detailRows = details.map(([label, value]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #EEF0F3;font:600 12px ${FONT};color:#6B7280;text-transform:uppercase;letter-spacing:.04em;width:38%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:9px 0 9px 12px;border-bottom:1px solid #EEF0F3;font:500 14px/1.45 ${FONT};color:#111827;vertical-align:top;">${escapeHtml(value)}</td></tr>`).join("")
    const stepRows = steps.map((step, i) => `<tr><td width="32" valign="top" style="padding:6px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="24" height="24" align="center" valign="middle" style="width:24px;height:24px;border-radius:12px;background:${color};color:${text};font:700 12px/24px ${FONT};">${i + 1}</td></tr></table></td><td style="padding:6px 0;font:400 14px/1.5 ${FONT};color:#111827;">${escapeHtml(step)}</td></tr>`).join("")
    const noteRows = notes.map((note) => `<tr><td width="18" valign="top" style="padding:3px 0;font:700 14px/1.5 ${FONT};color:${color};">&bull;</td><td style="padding:3px 0;font:400 13px/1.5 ${FONT};color:#374151;">${escapeHtml(note)}</td></tr>`).join("")
    const ctaUrl = safeUrl(cta?.url)

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader || heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
    <tr><td style="height:5px;background:${color};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:24px 32px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td valign="middle">${mark}</td><td valign="middle" style="padding-left:12px;font:700 16px ${FONT};color:#111827;">${logo ? "" : escapeHtml(name)}</td></tr></table>
    </td></tr>
    <tr><td style="padding:12px 32px 4px;font:700 24px/1.25 ${FONT};color:#111827;">${escapeHtml(heading)}</td></tr>
    <tr><td style="padding:8px 32px 0;font:400 15px/1.6 ${FONT};color:#374151;">
      ${greeting ? `<p style="margin:0 0 12px;">${escapeHtml(greeting)}</p>` : ""}
      ${paragraphs.map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`).join("")}
    </td></tr>
    ${detailRows ? `<tr><td style="padding:8px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #EEF0F3;">${detailRows}</table></td></tr>` : ""}
    ${code ? `<tr><td style="padding:20px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px dashed #D1D5DB;border-radius:12px;"><tr><td align="center" style="padding:14px 12px;"><div style="font:600 11px ${FONT};color:#6B7280;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(codeLabel)}</div><div style="margin-top:6px;font:700 26px/1.2 'SFMono-Regular',Menlo,Consolas,monospace;letter-spacing:.18em;color:#111827;">${escapeHtml(code)}</div><div style="margin-top:6px;font:400 12px ${FONT};color:#6B7280;">This code is personal. Please do not share it.</div></td></tr></table></td></tr>` : ""}
    ${stepRows ? `<tr><td style="padding:20px 32px 0;"><div style="font:700 14px ${FONT};color:#111827;margin-bottom:6px;">How to take it</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stepRows}</table></td></tr>` : ""}
    ${ctaUrl ? `<tr><td align="center" style="padding:24px 32px 4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${color}" style="border-radius:10px;background:${color};"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 30px;font:700 15px ${FONT};color:${text};text-decoration:none;border-radius:10px;">${escapeHtml(cta.label || "Open")}</a></td></tr></table></td></tr><tr><td align="center" style="padding:6px 32px 0;font:400 12px/1.5 ${FONT};color:#6B7280;word-break:break-all;">Button not working? Copy this link: ${escapeHtml(ctaUrl)}</td></tr>` : ""}
    ${noteRows ? `<tr><td style="padding:22px 32px 0;"><div style="background:#F9FAFB;border-radius:12px;padding:14px 16px;"><div style="font:700 13px ${FONT};color:#111827;margin-bottom:4px;">${escapeHtml(notesTitle)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${noteRows}</table></div></td></tr>` : ""}
    <tr><td style="padding:26px 32px 28px;font:400 12px/1.6 ${FONT};color:#6B7280;border-top:1px solid #F3F4F6;margin-top:20px;">${footer ? `${escapeHtml(footer)}<br>` : ""}Sent by ${escapeHtml(name)} using WorkmateIQ.</td></tr>
  </table>
</td></tr></table>
</body></html>`
}
