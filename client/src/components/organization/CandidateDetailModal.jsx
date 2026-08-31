import React from 'react'
import { Check, X, Star, FileText, Video, Sparkles, User, Award, ShieldAlert } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Badge, Card } from '../ui'

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
      size="xl"
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

        <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 ${getScoreColor(candidate.aiScore)}`}>
          <Sparkles size={18} />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider">AI Overall Score</div>
            <div className="text-[20px] font-extrabold leading-none">{candidate.aiScore}%</div>
          </div>
        </div>
      </div>

      {/* Grid: Skill Scores & AI Feedback */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Skill Metrics */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2">
            <Award size={16} className="text-accent" /> Skill Breakdown
          </h3>
          <div className="space-y-3 bg-black/[0.02] dark:bg-white/[0.04] p-4 rounded-xl border border-line">
            {[
              { skill: 'Technical Depth & Problem Solving', score: candidate.aiScore },
              { skill: 'Communication & Expression Clarity', score: Math.min(candidate.aiScore + 5, 98) },
              { skill: 'System Architecture & Knowledge', score: Math.max(candidate.aiScore - 8, 55) },
              { skill: 'Confidence & Behavioral Match', score: Math.min(candidate.aiScore + 2, 95) },
            ].map((s) => (
              <div key={s.skill} className="space-y-1">
                <div className="flex justify-between text-[12.5px] font-medium text-ink">
                  <span>{s.skill}</span>
                  <span className="font-bold">{s.score}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div className="h-full gradient-brand rounded-full transition-all duration-300" style={{ width: `${s.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Key Insights */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2">
            <Sparkles size={16} className="text-accent" /> AI Insights Summary
          </h3>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Key Strengths</div>
              <p className="text-[12.5px] text-ink leading-relaxed">
                Demonstrated strong logical breakdown during system design questions with concise code explanations. High verbal clarity and structured thinking.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-[12.5px] font-semibold text-amber-700 dark:text-amber-400 mb-1">Areas for Verification</div>
              <p className="text-[12.5px] text-ink leading-relaxed">
                Recommends deeper manual probing on database indexing optimization and asynchronous concurrency edge cases during human round.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Video Response Transcripts Placeholder */}
      <div>
        <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2 mb-3">
          <Video size={16} className="text-accent" /> AI Interview Transcripts & Recording
        </h3>
        <div className="p-4 rounded-xl border border-line bg-card space-y-3">
          <div className="flex items-center justify-between text-[13px] font-medium text-ink">
            <span>Question 1: Explain how React Reconciliation algorithm works.</span>
            <span className="text-[12px] text-emerald-600 font-semibold">Match Score: 92%</span>
          </div>
          <p className="text-[12.5px] text-text-secondary italic bg-black/[0.02] dark:bg-white/[0.04] p-3 rounded-lg">
            "React uses a virtual DOM to optimize UI updates. When component state changes, React creates a new VDOM tree and compares it with the previous tree using the diffing algorithm..."
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default CandidateDetailModal
