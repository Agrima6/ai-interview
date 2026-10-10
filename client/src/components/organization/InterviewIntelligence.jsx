import React from 'react'
import { Target, ShieldAlert } from 'lucide-react'
import { Badge } from '../ui'

// Labels and tones for the states the agent reports. Text always accompanies colour (accessibility).
const FOCUS_STATUS = {
  COVERED: ['Covered', 'success'], PARTIAL: ['Partly covered', 'warning'],
  NOT_ANSWERED: ['Not answered', 'danger'], NOT_ASKED: ['Not asked', 'danger'],
}
const CLAIM_STATUS = {
  SUBSTANTIATED: ['Substantiated', 'success'], UNVERIFIED: ['Unverified', 'warning'],
  REVIEW_INCONSISTENCY: ['Review needed', 'danger'], NOT_ANSWERED: ['Not answered', 'neutral'],
}
const PRIORITY_LABEL = { HIGH: 'High priority', MEDIUM: 'Medium priority', LOW: 'Low priority' }

/**
 * What the hiring team asked to be validated, what the interview actually covered, and anything a person
 * should double-check. Renders nothing for interviews that pre-date this report section.
 * Decision support only: it never rejects a candidate.
 */
function InterviewIntelligence({ content }) {
  const hrQuestions = content?.hr_question_coverage || []
  const focus = content?.hr_focus_coverage || []
  const claims = content?.resume_validation || []
  const flags = content?.contradictions || []
  if (!hrQuestions.length && !focus.length && !claims.length && !flags.length) return null

  return (
    <div className="mb-6 space-y-4">
      {hrQuestions.length > 0 && (
        <section aria-label="HR questions">
          <h3 className="text-[13px] font-semibold text-ink mb-2.5 flex items-center gap-1.5">
            <Target size={14} className="text-accent" /> HR questions: {hrQuestions.filter((q) => q.status === 'ANSWERED').length} of {hrQuestions.length} reached
          </h3>
          <ul className="divide-y divide-line rounded-xl border border-line bg-card">
            {hrQuestions.map((q) => (
              <li key={q.question_id} className="p-3.5 flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-ink flex-1 min-w-[12rem]">{q.question}</span>
                {q.score != null && <span className="text-[12px] text-text-secondary">Score {Math.round(q.score)}%</span>}
                <Badge variant={q.status === 'ANSWERED' ? 'success' : 'danger'}>{q.status === 'ANSWERED' ? 'Answered' : 'Not reached'}</Badge>
              </li>
            ))}
          </ul>
          {content?.hr_questions_not_reached?.length > 0 && (
            <p className="mt-1.5 text-[12px] text-text-secondary">Questions marked &ldquo;Not reached&rdquo; were not asked in this interview (for example because time ran out or it ended early).</p>
          )}
        </section>
      )}

      {focus.length > 0 && (
        <section aria-label="HR focus coverage">
          <h3 className="text-[13px] font-semibold text-ink mb-2.5 flex items-center gap-1.5">
            <Target size={14} className="text-accent" /> HR focus coverage
          </h3>
          <ul className="divide-y divide-line rounded-xl border border-line bg-card">
            {focus.map((f) => {
              const [label, tone] = FOCUS_STATUS[f.status] || [f.status, 'neutral']
              return (
                <li key={f.focus} className="p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-ink">{f.focus}</span>
                    <Badge variant="neutral">{PRIORITY_LABEL[f.priority] || f.priority}</Badge>
                    <Badge variant={tone}>{label}</Badge>
                    {f.score != null && <span className="text-[12px] text-text-secondary">Score {Math.round(f.score)}%</span>}
                    {f.follow_up_depth > 0 && <span className="text-[12px] text-text-secondary">{f.follow_up_depth} follow-up{f.follow_up_depth > 1 ? 's' : ''}</span>}
                    {f.confidence && f.confidence !== 'NONE' && <span className="text-[12px] text-text-secondary">Confidence {f.confidence.toLowerCase()}</span>}
                  </div>
                  {f.evidence?.length > 0 && (
                    <p className="mt-1.5 text-[12.5px] text-text-secondary">Evidence: {f.evidence.map((e) => `“${e}”`).join(' · ')}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {claims.length > 0 && (
        <section aria-label="Resume claim validation">
          <h3 className="text-[13px] font-semibold text-ink mb-2.5">Resume claims checked</h3>
          <ul className="divide-y divide-line rounded-xl border border-line bg-card">
            {claims.map((c) => {
              const [label, tone] = CLAIM_STATUS[c.status] || [c.status, 'neutral']
              return (
                <li key={c.claim} className="p-3.5 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-ink flex-1 min-w-[12rem]">{c.claim}</span>
                  <Badge variant={tone}>{label}</Badge>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {flags.length > 0 && (
        <section aria-label="Items for human review" className="p-3.5 rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-soft)]">
          <h3 className="text-[13px] font-semibold text-ink mb-1.5 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-[var(--color-warning)]" /> Needs your review
          </h3>
          <ul className="space-y-1 text-[12.5px] text-text-secondary list-disc pl-4">
            {flags.map((f, i) => <li key={i}>{f.claim ? <><strong>{f.claim}:</strong> </> : null}{f.note}</li>)}
          </ul>
        </section>
      )}

      {content?.notice && <p className="text-[11.5px] text-text-secondary">{content.notice}</p>}
    </div>
  )
}

export default InterviewIntelligence
