import { getViolationImageUrl } from '../api/organization/organizationApi'

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const band = (score) => (score >= 70 ? 'Strong' : score >= 50 ? 'Adequate' : 'Weak')
const when = (value) => (value ? new Date(value).toLocaleString() : '')
const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '')

const STYLES = `
  *{box-sizing:border-box} body{font-family:Inter,Calibri,Arial,sans-serif;color:#111827;margin:28px;font-size:12.5px;line-height:1.5}
  h1{font-size:22px;margin:0 0 2px} h2{font-size:14px;margin:22px 0 8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
  .muted{color:#6b7280} .row{display:flex;gap:10px;flex-wrap:wrap} .tile{border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;min-width:130px}
  .tile b{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:600}
  .q{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:10px;break-inside:avoid}
  .q h3{font-size:13px;margin:0 0 6px} .pill{display:inline-block;border-radius:99px;padding:1px 9px;font-size:11px;font-weight:600;background:#f3f4f6;margin-left:6px}
  .strong{background:#ecfdf3;color:#16a34a} .adequate{background:#fff7ed;color:#d97706} .weak{background:#fef2f2;color:#dc2626}
  .review{background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;margin-top:8px} ul{margin:3px 0 0 18px;padding:0}
  .flag{display:flex;gap:10px;align-items:center;border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin-bottom:8px;break-inside:avoid}
  .flag img{width:150px;height:96px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb} .cap{font-size:10px;color:#6b7280;text-align:center}
  .you{color:#1d4ed8} .bot{color:#9f1239} footer{margin-top:24px;font-size:10.5px;color:#6b7280}
  @media print{body{margin:14mm}}
`

/**
 * Opens a print-ready copy of a candidate's report; "Save as PDF" in the print dialog produces the file. The recording itself
 * cannot be inside a PDF, so the report says where it is. Proctoring screenshots are fetched with the HR login and embedded.
 */
export async function openReportPdf(candidate, { transcript } = {}) {
  const win = window.open('', '_blank')
  if (!win) throw new Error('Allow pop-ups for this site to download the PDF.')
  win.document.write('<p style="font-family:sans-serif;padding:24px">Preparing the report…</p>')

  const content = candidate.agentReport?.content || {}
  const overall = content.overall || {}
  const competencies = candidate.agentReport?.competency_scores || {}
  const violations = candidate.violations || []

  const images = await Promise.all(violations.map(async (v) => {
    const load = async (src) => { try { return src ? await getViolationImageUrl(src) : '' } catch { return '' } }
    return { camera: await load(v.snapshot), screen: await load(v.screenSnapshot) }
  }))

  const questions = (content.questions || []).map((q, i) => {
    const c = q.content_score || {}
    const score = Number.isFinite(Number(c.score)) ? Math.round(Number(c.score)) : null
    const answered = q.answered !== false && (q.candidate_answer || '').trim()
    const pill = !answered ? '<span class="pill weak">Not answered</span>' : q.kind === 'introduction' ? '<span class="pill">Introduction</span>'
      : score != null ? `<span class="pill ${band(score).toLowerCase()}">${band(score)} · ${score}%</span>` : ''
    const comm = answered && q.communication_score?.score != null && q.kind !== 'introduction' ? `<span class="pill">Communication ${Math.round(q.communication_score.score)}%</span>` : ''
    const review = (c.explanation || c.strengths?.length || c.improvement_areas?.length || c.missing_topics?.length)
      ? `<div class="review"><b>AI review</b>${c.explanation ? `<p style="margin:4px 0">${esc(c.explanation)}</p>` : ''}
          ${c.strengths?.length ? `<div><b style="color:#16a34a">What went well</b>${list(c.strengths)}</div>` : ''}
          ${c.improvement_areas?.length ? `<div><b style="color:#d97706">To improve</b>${list(c.improvement_areas)}</div>` : ''}
          ${c.covered_topics?.length ? `<div class="muted">Topics covered: ${esc(c.covered_topics.join(', '))}</div>` : ''}
          ${c.missing_topics?.length ? `<div class="muted">Topics missed: ${esc(c.missing_topics.join(', '))}</div>` : ''}
          ${answered && q.communication_score?.explanation ? `<div class="muted">Communication: ${esc(q.communication_score.explanation)}</div>` : ''}</div>` : ''
    return `<div class="q"><h3>Q${i + 1}. ${esc(q.question)} ${pill}${comm}</h3>
      <div class="muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em">Candidate's answer</div>
      <p style="margin:2px 0;white-space:pre-wrap">${answered ? esc(q.candidate_answer) : '<i class="muted">The candidate did not give an answer to this question.</i>'}</p>${review}</div>`
  }).join('')

  const flagHtml = violations.map((v, i) => `<div class="flag">
      <div>${images[i].camera ? `<img src="${images[i].camera}" alt="Camera"/><div class="cap">Camera</div>` : '<div class="cap">Camera not captured</div>'}</div>
      <div>${images[i].screen ? `<img src="${images[i].screen}" alt="Screen"/><div class="cap">Screen</div>` : '<div class="cap">Screen not captured</div>'}</div>
      <div><b>Flag ${i + 1}: ${esc(v.reason)}</b><div class="muted">${esc(when(v.occurredAt))}</div></div></div>`).join('')

  const transcriptHtml = transcript?.length
    ? `<h2>Conversation transcript</h2>${transcript.map((l) => `<p style="margin:3px 0"><b class="${l.speaker === 'candidate' ? 'you' : 'bot'}">${l.speaker === 'candidate' ? 'Candidate' : 'Interviewer'}${l.at ? ` · ${esc(new Date(l.at).toLocaleTimeString())}` : ''}:</b> ${esc(l.text)}</p>`).join('')}` : ''

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(candidate.name)} - interview report</title><style>${STYLES}</style></head><body>
    <h1>${esc(candidate.name)}</h1>
    <div class="muted">${esc(candidate.email)} · ${esc(candidate.driveTitle || '')}${candidate.roundNumber ? ` · Round ${esc(candidate.roundNumber)}` : ''}</div>
    <div class="row" style="margin-top:12px">
      <div class="tile"><b>AI overall score</b>${candidate.aiScore > 0 ? `${esc(candidate.aiScore)}%` : 'Not evaluated'}</div>
      <div class="tile"><b>Recommendation</b>${esc(String(overall.recommendation || '—').replace(/_/g, ' '))}</div>
      <div class="tile"><b>Attempted</b>${esc(candidate.attemptedDate ? new Date(candidate.attemptedDate).toLocaleDateString() : '—')}</div>
      <div class="tile"><b>Interview slot</b>${esc(when(candidate.interviewSlot) || '—')}</div>
      <div class="tile"><b>Proctoring flags</b>${esc(candidate.malpracticeFlags || 0)}</div>
      <div class="tile"><b>Phone / experience</b>${esc(candidate.phone || '—')} / ${esc(candidate.exp || '—')}</div>
    </div>
    ${Object.keys(competencies).length ? `<h2>Competency breakdown</h2><div class="row">${Object.entries(competencies).map(([k, v]) => `<div class="tile"><b>${esc(k.replace(/_/g, ' '))}</b>${Math.round(v)}% · ${band(v)}</div>`).join('')}</div>` : ''}
    ${overall.summary ? `<h2>AI summary</h2><p>${esc(overall.summary)}</p>${overall.recommendation_reason ? `<p><b>Why: </b>${esc(overall.recommendation_reason)}</p>` : ''}
      <div class="row"><div style="flex:1;min-width:240px"><b style="color:#16a34a">Key strengths</b>${list(overall.key_strengths)}</div><div style="flex:1;min-width:240px"><b style="color:#d97706">Gaps to probe</b>${list(overall.key_gaps)}</div></div>` : ''}
    <h2>Questions, answers and AI review</h2>
    <p class="muted">${esc(content.answered_questions ?? 0)} answered of ${esc(content.asked_questions ?? (content.questions || []).length)} asked. Scores out of 100: 70+ strong, 50-69 adequate, below 50 weak.</p>
    ${questions || '<p class="muted">No evaluated questions.</p>'}
    ${violations.length ? `<h2>Proctoring violation log (${violations.length})</h2>${flagHtml}` : ''}
    <h2>Recording</h2><p class="muted">The interview recording is available in the organization dashboard under this candidate's scorecard.</p>
    ${transcriptHtml}
    <footer>Generated ${esc(new Date().toLocaleString())} · WorkmateIQ. AI evaluation is decision support, not a hiring decision.</footer>
    </body></html>`

  win.document.open()
  win.document.write(html)
  win.document.close()
  // let the embedded screenshots paint before the print dialog opens
  setTimeout(() => { win.focus(); win.print() }, 700)
}
