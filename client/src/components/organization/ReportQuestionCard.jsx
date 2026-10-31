import React from 'react'
import { CheckCircle2, AlertTriangle, MinusCircle, Sparkles } from 'lucide-react'
import { Badge } from '../ui'

const bandOf = (score) => (score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger')
const bandLabel = (score) => (score >= 70 ? 'Strong' : score >= 50 ? 'Adequate' : 'Weak')

function Chips({ items, tone }) {
  if (!items?.length) return null
  const cls = tone === 'good' ? 'bg-success/10 text-success' : 'bg-red-500/10 text-red-600'
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {items.map((t, i) => <span key={`${t}-${i}`} className={`text-[11.5px] px-2 py-0.5 rounded-full ${cls}`}>{t}</span>)}
    </div>
  )
}

/**
 * One interview question, what the candidate said, and the AI's review of that answer (score, communication, what was
 * good, what was missing). Nothing is invented: an unanswered question is shown as unanswered, not scored.
 */
function ReportQuestionCard({ index, q }) {
  const content = q.content_score || {}
  const comm = q.communication_score || null
  const answered = q.answered !== false && Boolean((q.candidate_answer || '').trim())
  const score = Number.isFinite(Number(content.score)) ? Math.round(Number(content.score)) : null
  const isIntro = q.kind === 'introduction'

  return (
    <article className="p-4 rounded-xl border border-line bg-card" aria-label={`Question ${index + 1}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-[13.5px] font-semibold text-ink flex-1 min-w-[14rem]">
          <span className="text-text-secondary font-medium mr-1.5">Q{index + 1}.</span>{q.question}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {isIntro && <Badge variant="neutral">Introduction</Badge>}
          {!answered ? <Badge variant="danger">Not answered</Badge> : score != null && !isIntro && (
            <Badge variant={bandOf(score)}>{bandLabel(score)} · {score}%</Badge>
          )}
          {answered && comm?.score != null && !isIntro && <Badge variant="neutral">Communication {Math.round(comm.score)}%</Badge>}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-1">Candidate's answer</p>
        {answered
          ? <p className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">{q.candidate_answer}</p>
          : <p className="text-[13px] text-text-secondary italic">The candidate did not give an answer to this question.</p>}
      </div>

      {(content.explanation || content.strengths?.length || content.improvement_areas?.length || content.missing_topics?.length || content.covered_topics?.length) && (
        <div className="mt-3 rounded-lg bg-accent/5 border border-accent/15 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-1.5 flex items-center gap-1.5"><Sparkles size={12} /> AI review</p>
          {content.explanation && <p className="text-[12.5px] text-ink leading-relaxed">{content.explanation}</p>}
          {content.strengths?.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[12px] font-semibold text-success flex items-center gap-1"><CheckCircle2 size={12} /> What went well</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[12.5px] text-ink">{content.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {content.improvement_areas?.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[12px] font-semibold text-amber-600 flex items-center gap-1"><AlertTriangle size={12} /> To improve</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[12.5px] text-ink">{content.improvement_areas.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {(content.covered_topics?.length > 0 || content.missing_topics?.length > 0) && (
            <div className="mt-2.5 grid sm:grid-cols-2 gap-3">
              {content.covered_topics?.length > 0 && <div><p className="text-[12px] font-semibold text-text-secondary">Topics covered</p><Chips items={content.covered_topics} tone="good" /></div>}
              {content.missing_topics?.length > 0 && <div><p className="text-[12px] font-semibold text-text-secondary flex items-center gap-1"><MinusCircle size={11} /> Topics missed</p><Chips items={content.missing_topics} tone="bad" /></div>}
            </div>
          )}
          {comm?.explanation && answered && <p className="mt-2.5 text-[12px] text-text-secondary"><span className="font-semibold">Communication: </span>{comm.explanation}</p>}
        </div>
      )}
    </article>
  )
}

export default ReportQuestionCard
