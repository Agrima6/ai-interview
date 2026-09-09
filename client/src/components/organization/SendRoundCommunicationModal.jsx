import React, { useState, useEffect, useMemo } from 'react'
import { Mail, MessageCircle, Send, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Select, useToast } from '../ui'
import { getNotificationTemplates, communicateWithCandidates } from '../../api/organization/organizationApi'
import { renderWithSamples } from '../../constants/templateVariables'

const COPY = {
  CONGRATULATIONS: {
    title: 'Send Congratulations',
    consequence: (n) => `This will send your selected Congratulations template to ${n} candidate${n === 1 ? '' : 's'}. Their status is not changed.`,
    confirmLabel: 'Send Congratulations',
  },
  REJECTION: {
    title: 'Reject & Send Rejection',
    consequence: (n) => `This will mark ${n} candidate${n === 1 ? '' : 's'} as Rejected and send them your selected Rejection template.`,
    confirmLabel: 'Reject & Notify',
  },
}

/**
 * `candidates`: [{ id, name }] already selected on the drive detail page.
 * `purpose`: 'CONGRATULATIONS' | 'REJECTION'
 */
function SendRoundCommunicationModal({ open, onClose, purpose, candidates, driveId, roundNumber, onSent }) {
  const toast = useToast()
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateId, setTemplateId] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingTemplates(true)
    getNotificationTemplates()
      .then((data) => {
        const matching = (data || []).filter((t) => t.purpose === purpose && (t.type === 'EMAIL' || t.type === 'WHATSAPP'))
        setTemplates(matching)
        setTemplateId(matching[0]?.templateId || matching[0]?._id || '')
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false))
  }, [open, purpose])

  const activeTemplate = templates.find((t) => (t.templateId || t._id) === templateId)
  const copy = COPY[purpose] || COPY.CONGRATULATIONS

  const previewValues = useMemo(() => ({
    candidate_name: candidates[0]?.name || 'Candidate',
    drive_title: 'this role',
    company_name: 'Your Organization',
    interview_link: 'https://…',
    expiry_date: '—',
  }), [candidates])

  const handleSend = async () => {
    if (!activeTemplate) return
    setSending(true)
    try {
      const result = await communicateWithCandidates(driveId, roundNumber, {
        candidateIds: candidates.map((c) => c.id),
        purpose,
        templateId: activeTemplate.templateId || activeTemplate._id,
      })
      if (result.failedCount > 0) {
        toast.error(`Sent to ${result.sentCount}, failed for ${result.failedCount} (missing contact info or delivery error).`)
      } else {
        toast.success(`Sent to ${result.sentCount} candidate${result.sentCount === 1 ? '' : 's'}.`)
      }
      onSent?.()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={sending ? undefined : onClose}
      title={copy.title}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button
            size="sm"
            variant={purpose === 'REJECTION' ? 'danger' : 'primary'}
            onClick={handleSend}
            disabled={sending || !activeTemplate}
          >
            <Send size={14} /> {sending ? 'Sending...' : copy.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[13.5px] text-text-secondary">{copy.consequence(candidates.length)}</p>

        {loadingTemplates ? (
          <p className="text-[13px] text-text-secondary">Loading templates...</p>
        ) : templates.length === 0 ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-warning-soft)] text-[var(--color-warning)] text-[13px]">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>No {purpose === 'CONGRATULATIONS' ? 'Congratulations' : 'Rejection'} template exists yet. Create one on the Templates page first.</span>
          </div>
        ) : (
          <>
            <Select
              label="Template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              options={templates.map((t) => ({ value: t.templateId || t._id, label: `${t.name} (${t.type === 'EMAIL' ? 'Email' : 'WhatsApp'})` }))}
            />

            {activeTemplate && (
              <div className="rounded-xl border border-line p-4 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary flex items-center gap-1.5">
                  {activeTemplate.type === 'EMAIL' ? <Mail size={12} /> : <MessageCircle size={12} />} Preview (sample data)
                </span>
                {activeTemplate.type === 'EMAIL' && (
                  <p className="text-[13.5px] font-semibold text-ink">{renderWithSamples(activeTemplate.subject, previewValues)}</p>
                )}
                <p className="text-[13px] text-text-secondary whitespace-pre-wrap leading-relaxed">{renderWithSamples(activeTemplate.body, previewValues)}</p>
              </div>
            )}
          </>
        )}

        <div className="text-[12.5px] text-text-secondary pt-2 border-t border-line">
          Recipients: {candidates.slice(0, 5).map((c) => c.name).join(', ')}{candidates.length > 5 ? ` +${candidates.length - 5} more` : ''}
        </div>
      </div>
    </Modal>
  )
}

export default SendRoundCommunicationModal
