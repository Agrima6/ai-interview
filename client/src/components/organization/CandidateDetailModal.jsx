import React from 'react'
import { Check, X, Sparkles, ShieldAlert, Phone, Briefcase, CalendarClock, Info } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Badge } from '../ui'

function CandidateDetailModal({ open, onClose, candidate, onStatusChange }) {
  if (!candidate) return null

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (score >= 65) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Candidate AI Evaluation Scorecard"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-text-secondary">Current Status:</span>
            <Badge variant={candidate.status === 'SHORTLISTED' ? 'success' : candidate.status === 'REJECTED' ? 'danger' : 'neutral'}>
              {candidate.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                onStatusChange(candidate.id, 'REJECTED')
                onClose()
              }}
              className="text-red-600 hover:bg-red-50"
            >
              <X size={14} /> Reject
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onStatusChange(candidate.id, 'SHORTLISTED')
                onClose()
              }}
            >
              <Check size={14} /> Shortlist Candidate
            </Button>
          </div>
        </div>
      }
    >
      {/* Candidate Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-line mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-brand text-white flex items-center justify-center font-bold text-lg shrink-0">
            {candidate.name.charAt(0)}
          </div>
          <div>
            <h2 className="font-display text-[18px] font-bold text-ink">{candidate.name}</h2>
            <p className="text-[13px] text-text-secondary">{candidate.email} • Applied for {candidate.driveTitle}</p>
          </div>
        </div>

        {candidate.aiScore > 0 ? (
          <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 ${getScoreColor(candidate.aiScore)}`}>
            <Sparkles size={18} />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider">AI Overall Score</div>
              <div className="text-[20px] font-extrabold leading-none">{candidate.aiScore}%</div>
            </div>
          </div>
        ) : (
          <Badge variant="neutral">Not yet evaluated</Badge>
        )}
      </div>

      {/* Real candidate facts - phone/experience/attempted date/proctoring
          flags are all genuine fields on the backend record, unlike the
          fabricated skill-breakdown/insights/transcript this modal used to
          show for every candidate regardless of what actually happened. */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <FactTile icon={Phone} label="Phone" value={candidate.phone || '—'} />
        <FactTile icon={Briefcase} label="Experience" value={candidate.exp || '—'} />
        <FactTile icon={CalendarClock} label="Attempted" value={candidate.attemptedDate ? new Date(candidate.attemptedDate).toLocaleDateString() : 'Not yet attempted'} />
        <FactTile
          icon={ShieldAlert}
          label="Proctoring Flags"
          value={candidate.malpracticeFlags > 0 ? `${candidate.malpracticeFlags} flagged` : 'Clean'}
          tone={candidate.malpracticeFlags > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-line bg-black/[0.02] dark:bg-white/[0.04]">
        <Info size={16} className="text-text-secondary shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-text-secondary leading-relaxed">
          A per-skill score breakdown, AI-written insights, and interview transcripts aren't available yet for this evaluation
          pipeline - only the overall AI score and proctoring flags are currently captured per attempt.
        </p>
      </div>
    </Modal>
  )
}

function FactTile({ icon: Icon, label, value, tone }) {
  const toneClass = tone === 'danger' ? 'text-[var(--color-danger)]' : tone === 'success' ? 'text-[var(--color-success)]' : 'text-ink'
  return (
    <div className="p-3.5 rounded-xl border border-line bg-card">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-1.5">
        <Icon size={12} /> {label}
      </div>
      <div className={`text-[13.5px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

export default CandidateDetailModal
