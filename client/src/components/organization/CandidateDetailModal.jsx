import React, { useState } from 'react'
import { Check, X, Sparkles, ShieldAlert, Phone, Briefcase, CalendarClock, Info, FileText, Download, Video } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Badge } from '../ui'
import { downloadCandidateResume, getCandidateRecordingUrl } from '../../api/organization/organizationApi'
import { useToast } from '../ui/Toast'

function CandidateDetailModal({ open, onClose, candidate, onStatusChange }) {
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState(null)
  const [loadingRecording, setLoadingRecording] = useState(false)
  if (!candidate) return null

  const handleDownloadResume = async () => {
    setDownloading(true)
    try {
      await downloadCandidateResume(candidate.driveId, candidate.roundNumber, candidate.id, candidate.resumeOriginalName)
    } catch (err) {
      toast.error(err.message || 'Failed to download resume.')
    } finally {
      setDownloading(false)
    }
  }

  const handleLoadRecording = async () => {
    setLoadingRecording(true)
    try {
      const url = await getCandidateRecordingUrl(candidate.driveId, candidate.roundNumber, candidate.id)
      setRecordingUrl(url)
    } catch (err) {
      toast.error(err.message || 'Failed to load recording.')
    } finally {
      setLoadingRecording(false)
    }
  }

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
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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

      {(candidate.interviewSlot || candidate.resumeFilename) && (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {candidate.interviewSlot && (
            <FactTile icon={CalendarClock} label="Chosen Interview Slot" value={new Date(candidate.interviewSlot).toLocaleString()} />
          )}
          {candidate.resumeFilename && (
            <div className="p-3.5 rounded-xl border border-line bg-card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-1.5">
                  <FileText size={12} /> Resume
                </div>
                <div className="text-[13px] font-medium text-ink truncate">{candidate.resumeOriginalName || 'resume'}</div>
              </div>
              <Button size="xs" variant="secondary" onClick={handleDownloadResume} disabled={downloading}>
                <Download size={13} /> {downloading ? 'Downloading...' : 'Download'}
              </Button>
            </div>
          )}
        </div>
      )}

      {candidate.recordingFilename && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-ink mb-2.5 flex items-center gap-1.5">
            <Video size={14} /> Interview Recording
          </h3>
          {recordingUrl ? (
            <video src={recordingUrl} controls className="w-full rounded-xl border border-line bg-black max-h-[400px]" />
          ) : (
            <div className="p-3.5 rounded-xl border border-line bg-card flex items-center justify-between gap-3">
              <p className="text-[13px] text-text-secondary">The candidate's full camera/mic recording is available for review.</p>
              <Button size="xs" variant="secondary" onClick={handleLoadRecording} disabled={loadingRecording}>
                <Video size={13} /> {loadingRecording ? 'Loading...' : 'Watch Recording'}
              </Button>
            </div>
          )}
        </div>
      )}

      {candidate.violations?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-ink mb-2.5 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-[var(--color-danger)]" /> Proctoring Violation Log
          </h3>
          <div className="space-y-2">
            {candidate.violations.map((v, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-line bg-card">
                <div className="flex items-center gap-1.5 shrink-0">
                  {v.snapshot ? (
                    <img src={v.snapshot} alt="Webcam snapshot" title="Webcam" className="w-14 h-10 rounded-lg object-cover border border-line" />
                  ) : (
                    <div className="w-14 h-10 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center">
                      <ShieldAlert size={14} className="text-text-secondary" />
                    </div>
                  )}
                  {v.screenSnapshot && (
                    <img src={v.screenSnapshot} alt="Screen snapshot" title="Screen at time of violation" className="w-14 h-10 rounded-lg object-cover border border-line" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">{v.reason}</p>
                  <p className="text-[11.5px] text-text-secondary">{new Date(v.occurredAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {candidate.agentReport?.competency_scores && Object.keys(candidate.agentReport.competency_scores).length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-ink mb-2.5 flex items-center gap-1.5">
            <Sparkles size={14} className="text-accent" /> Competency Breakdown
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(candidate.agentReport.competency_scores).map(([key, score]) => (
              <FactTile key={key} icon={Sparkles} label={key.replace(/_/g, ' ')} value={`${Math.round(score)}%`} />
            ))}
          </div>
        </div>
      )}

      {candidate.agentReport?.content?.overall?.summary && (
        <div className="mb-6 p-4 rounded-xl border border-line bg-card">
          <h3 className="text-[13px] font-semibold text-ink mb-1.5">AI Interviewer Summary</h3>
          <p className="text-[13px] text-text-secondary leading-relaxed">{candidate.agentReport.content.overall.summary}</p>
        </div>
      )}

      {candidate.agentReport?.content?.questions?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-ink mb-2.5">Interview Q&amp;A</h3>
          <div className="space-y-3">
            {candidate.agentReport.content.questions.map((q, idx) => (
              <div key={q.question_id || idx} className="p-3.5 rounded-xl border border-line bg-card">
                <p className="text-[13px] font-medium text-ink mb-1">{q.question}</p>
                <p className="text-[12.5px] text-text-secondary leading-relaxed mb-2">{q.candidate_answer}</p>
                {q.content_score?.score != null && (
                  <Badge variant="neutral">Score: {Math.round(q.content_score.score)}%</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!candidate.agentReport && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-line bg-black/[0.02] dark:bg-white/[0.04]">
          <Info size={16} className="text-text-secondary shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            This candidate hasn't completed an AI interview yet - once they do, their score breakdown, summary, and transcript will appear here.
          </p>
        </div>
      )}
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
