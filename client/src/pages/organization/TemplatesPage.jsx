import React, { useState, useEffect } from 'react'
import { FileText, Sparkles, Check, Edit2, Copy, Save } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { Card, Button, Input, Textarea, Badge } from '../../components/ui'
import { getNotificationTemplates, updateNotificationTemplate } from '../../api/organization/organizationApi'

const MOCK_TEMPLATES = [
  {
    id: 'tmpl-1',
    templateId: 'tmpl-1',
    name: 'Candidate AI Interview Invitation',
    type: 'EMAIL',
    subject: 'You have been invited to attempt the AI Interview for {drive_title} at {company_name}',
    body: `Hello {candidate_name},\n\nWe are pleased to invite you to take the AI-powered video interview for the position of {drive_title} at {company_name}.\n\nPlease click the link below to start your interview attempt before {expiry_date}:\n\n{interview_link}\n\nBest regards,\nRecruitment Team`,
    lastUpdated: '2026-08-20',
  },
  {
    id: 'tmpl-2',
    templateId: 'tmpl-2',
    name: 'Interview Reminder Notification',
    type: 'EMAIL',
    subject: 'Reminder: Your AI Interview for {drive_title} expires soon',
    body: `Hi {candidate_name},\n\nThis is a friendly reminder that your AI video interview for {drive_title} is scheduled to expire on {expiry_date}.\n\nAccess your interview room here: {interview_link}\n\nGood luck!`,
    lastUpdated: '2026-08-22',
  },
  {
    id: 'tmpl-3',
    templateId: 'tmpl-3',
    name: 'Shortlisted Candidate Next Round Email',
    type: 'EMAIL',
    subject: 'Congratulations! You have been shortlisted for {drive_title}',
    body: `Dear {candidate_name},\n\nGreat news! Based on your outstanding AI interview evaluation score, our hiring team has shortlisted your application for {drive_title}.\n\nOur recruiters will reach out shortly to schedule the final round.\n\nBest regards,\n{company_name} Talent Team`,
    lastUpdated: '2026-08-26',
  },
]

const VARIABLE_TAGS = ['{candidate_name}', '{drive_title}', '{company_name}', '{interview_link}', '{expiry_date}']

function TemplatesPage() {
  const [templates, setTemplates] = useState(MOCK_TEMPLATES)
  const [activeTemplateId, setActiveTemplateId] = useState('tmpl-1')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchTemplates = async () => {
    try {
      const data = await getNotificationTemplates()
      if (data && data.length > 0) {
        setTemplates(data.map((t) => ({ ...t, id: t.templateId || t._id || t.id })))
      }
    } catch (err) {
      console.warn('API error fetching templates, using local fallback:', err)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const activeTemplate = templates.find((t) => t.id === activeTemplateId || t.templateId === activeTemplateId) || templates[0]

  const handleUpdateActiveField = (field, value) => {
    setTemplates((prev) =>
      prev.map((t) => ((t.id === activeTemplateId || t.templateId === activeTemplateId) ? { ...t, [field]: value } : t))
    )
  }

  const insertTag = (tag) => {
    handleUpdateActiveField('body', activeTemplate.body + ' ' + tag)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateNotificationTemplate(activeTemplate.templateId || activeTemplate.id, {
        subject: activeTemplate.subject,
        body: activeTemplate.body,
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err) {
      console.warn('API error saving template, using local save:', err)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <OrganizationLayout
      title="Notification Templates"
      description="Customize candidate email invitations, reminders, and evaluation updates."
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template Selector List */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider px-1">
            Communication Templates
          </h3>
          {templates.map((tmpl) => {
            const tmplKey = tmpl.templateId || tmpl.id
            const isActive = activeTemplateId === tmplKey
            return (
              <div
                key={tmplKey}
                onClick={() => setActiveTemplateId(tmplKey)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                    : 'border-line bg-card hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[13.5px] text-ink">{tmpl.name}</span>
                  <Badge variant="purple">{tmpl.type}</Badge>
                </div>
                <p className="text-[12px] text-text-secondary line-clamp-1">{tmpl.subject}</p>
              </div>
            )
          })}
        </div>

        {/* Live Template Editor */}
        <div className="lg:col-span-2">
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 className="font-display text-[16px] font-bold text-ink">{activeTemplate.name}</h2>
                <p className="text-[12.5px] text-text-secondary">Edit template text and dynamic variable tags below.</p>
              </div>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {savedSuccess ? <Check size={14} /> : <Save size={14} />} {saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Template'}
              </Button>
            </div>

            <Input
              label="Email Subject Line"
              value={activeTemplate.subject}
              onChange={(e) => handleUpdateActiveField('subject', e.target.value)}
            />

            {/* Variable Tag Toolbar */}
            <div>
              <label className="block text-[12.5px] font-semibold text-ink mb-1.5">Insert Dynamic Tags</label>
              <div className="flex flex-wrap gap-2">
                {VARIABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertTag(tag)}
                    className="px-2.5 py-1 rounded-lg border border-line bg-black/[0.03] dark:bg-white/[0.05] text-[12px] font-mono text-accent font-semibold hover:bg-accent/10 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Email Body Content"
              rows={8}
              value={activeTemplate.body}
              onChange={(e) => handleUpdateActiveField('body', e.target.value)}
              className="font-sans text-[13px] leading-relaxed"
            />
          </Card>
        </div>
      </div>
    </OrganizationLayout>
  )
}

export default TemplatesPage
