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
