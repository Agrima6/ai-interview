// Shared HTML email shell - logo header + footer, inline styles only (no
// external stylesheet - most mail clients strip <style> in <head>).
// Individual templates supply just the body content between header/footer.
const ACCENT = "#c4161f"
const INK = "#1a1215"
const TEXT_SECONDARY = "#6b6570"
const LOGO_URL = "https://workmateiq.com/logo.png"

export const wrapEmailBody = (innerHtml) => `
<div style="background:#f7f5f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #eee6e6;overflow:hidden;">
    <div style="padding:32px 32px 8px;text-align:center;">
      <img src="${LOGO_URL}" width="32" height="32" alt="WorkmateIQ" style="border-radius:50%;vertical-align:middle;" />
      <span style="font-size:18px;font-weight:700;color:${INK};vertical-align:middle;margin-left:8px;">WorkmateIQ</span>
    </div>
    <div style="padding:8px 32px 32px;">
      ${innerHtml}
    </div>
    <div style="padding:20px 32px 28px;border-top:1px solid #f1eaea;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:${TEXT_SECONDARY};">We appreciate your time and look forward to working with you.</p>
      <p style="margin:0;font-size:13px;font-weight:700;color:${ACCENT};">WorkmateIQ Team</p>
    </div>
  </div>
</div>`

// Org-branded variant for emails an ORGANIZATION sends to its own team/
// candidates (invites) - the org's name is the primary identity here, not
// WorkmateIQ (which is just the platform they're using), matching how the
// rest of the org's dashboard is already themed by their own branding.
// `brandVar` is the {{variable}} name holding the org's display name
// (different per template - "company_name" for candidate invites,
// "organizationName" for team invites).
export const wrapOrgEmailBody = (innerHtml, brandVar) => `
<div style="background:#f7f5f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #eee6e6;overflow:hidden;">
    <div style="padding:32px 32px 8px;text-align:center;">
      <span style="font-size:19px;font-weight:800;color:${INK};">{{${brandVar}}}</span>
    </div>
    <div style="padding:8px 32px 32px;">
      ${innerHtml}
    </div>
    <div style="padding:20px 32px 28px;border-top:1px solid #f1eaea;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:${TEXT_SECONDARY};">We appreciate your time and look forward to working with you.</p>
      <p style="margin:0;font-size:13px;font-weight:700;color:${ACCENT};">{{${brandVar}}} Team</p>
      <p style="margin:8px 0 0;font-size:11px;color:${TEXT_SECONDARY};">Sent via WorkmateIQ</p>
    </div>
  </div>
</div>`

// Org-branded variant with a full-bleed colored hero band at the top
// (org name + a headline + optional eyebrow tag) instead of a plain
// centered logo line - used for candidate-facing emails where first
// impression matters (interview invite, application confirmation).
// `brandVar` is the {{variable}} holding the org's display name, same
// convention as wrapOrgEmailBody.
export const wrapOrgEmailBodyWithHero = (innerHtml, brandVar, { eyebrow, heading, subheading }) => `
<div style="background:#f3f0f0;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:18px;border:1px solid #eee6e6;overflow:hidden;box-shadow:0 12px 32px -14px rgba(30,10,12,0.3);">
    <div style="background:${ACCENT};background:linear-gradient(135deg,#d81f27 0%,${ACCENT} 55%,#8f0f14 100%);padding:36px 32px 30px;text-align:center;">
      ${eyebrow ? `<p style="margin:0 0 12px;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.8);">${eyebrow}</p>` : ""}
      <p style="margin:0 0 8px;font-size:15px;font-weight:800;color:#ffffff;">{{${brandVar}}}</p>
      <h1 style="margin:0;font-size:23px;font-weight:800;color:#ffffff;line-height:1.35;">${heading}</h1>
      ${subheading ? `<p style="margin:10px 0 0;font-size:13.5px;color:rgba(255,255,255,0.85);line-height:1.5;">${subheading}</p>` : ""}
    </div>
    <div style="padding:30px 32px 32px;">
      ${innerHtml}
    </div>
    <div style="padding:20px 32px 28px;border-top:1px solid #f1eaea;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:${TEXT_SECONDARY};">We appreciate your time and look forward to working with you.</p>
      <p style="margin:0;font-size:13px;font-weight:700;color:${ACCENT};">{{${brandVar}}} Team</p>
      <p style="margin:8px 0 0;font-size:11px;color:${TEXT_SECONDARY};">Sent via WorkmateIQ</p>
    </div>
  </div>
</div>`

// A horizontal 3-4 step "how this works" strip - each step a numbered
// badge + short label, used on the candidate invite so the ask (apply,
// interview, hear back) is scannable at a glance before the CTA button.
export const stepStrip = (steps) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    ${steps.map((label, idx) => `
    <td width="${Math.floor(100 / steps.length)}%" style="text-align:center;vertical-align:top;padding:0 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 0 8px;">
        <tr><td style="width:26px;height:26px;border-radius:50%;background:${ACCENT};color:#ffffff;font-size:12px;font-weight:800;text-align:center;line-height:26px;">${idx + 1}</td></tr>
      </table>
      <p style="margin:0;font-size:11.5px;font-weight:600;color:${INK};line-height:1.4;">${label}</p>
    </td>`).join("")}
  </tr>
</table>`

// A labeled key/value info card (role, department, chosen slot, etc.) -
// reused by both the invite and application-confirmation emails so a
// candidate sees the same at-a-glance summary in each.
export const infoCard = (rows) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f6;border:1px solid #eee6e6;border-radius:12px;margin:0 0 20px;">
  <tr><td style="padding:16px 20px;">
    ${rows.map(([label, value]) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr>
        <td style="font-size:12px;font-weight:700;color:${TEXT_SECONDARY};text-transform:uppercase;letter-spacing:0.04em;width:40%;vertical-align:top;">${label}</td>
        <td style="font-size:13.5px;font-weight:600;color:${INK};text-align:right;">${value}</td>
      </tr>
    </table>`).join("")}
  </td></tr>
</table>`

export const supportBox = () => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf1ea;border:1px solid #f7ded0;border-radius:12px;margin:20px 0;">
  <tr>
    <td style="padding:16px 18px;">
      <p style="margin:0 0 4px;font-size:13.5px;font-weight:700;color:${ACCENT};">Need help?</p>
      <p style="margin:0;font-size:13px;color:${TEXT_SECONDARY};line-height:1.5;">
        If you have any questions or run into an issue, please contact our support team at
        <a href="mailto:{{supportEmail}}" style="color:${ACCENT};font-weight:600;text-decoration:none;">{{supportEmail}}</a>.
      </p>
    </td>
  </tr>
</table>`

export const button = (label, url) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center">
      <a href="${url}" style="display:inline-block;background:${ACCENT};color:#ffffff;font-size:14.5px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:10px;">${label}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 20px;font-size:12px;color:${TEXT_SECONDARY};text-align:center;">
  If the button doesn't work, copy and open this link:<br />
  <a href="${url}" style="color:${ACCENT};word-break:break-all;">${url}</a>
</p>`

export { ACCENT, INK, TEXT_SECONDARY }
