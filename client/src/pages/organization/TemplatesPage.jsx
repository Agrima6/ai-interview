import React, { useState, useEffect } from 'react'
import { Check, Save, AlertCircle } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { Card, Button, Input, Textarea, Badge, Skeleton, useToast } from '../../components/ui'
import { getNotificationTemplates, updateNotificationTemplate } from '../../api/organization/organizationApi'

const VARIABLE_TAGS = ['{candidate_name}', '{drive_title}', '{company_name}', '{interview_link}', '{expiry_date}']

function TemplatesPage() {
  const toast = useToast()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTemplateId, setActiveTemplateId] = useState(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchTemplates = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getNotificationTemplates()
      const mapped = (data || []).map((t) => ({ ...t, id: t.templateId || t._id || t.id }))
      setTemplates(mapped)
      setActiveTemplateId((prev) => prev || mapped[0]?.id || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const activeTemplate = templates.find((t) => t.id === activeTemplateId || t.templateId === activeTemplateId)

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
      // A failed save must never look like "Saved!" - the admin needs to
      // know the template text wasn't actually persisted.
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <OrganizationLayout
      title="Notification Templates"
      description="Customize candidate email invitations, reminders, and evaluation updates."
    >
      {error ? (
        <Card className="p-10 text-center">
          <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
          <p className="text-[14px] text-ink font-medium mb-1">Couldn't load templates</p>
          <p className="text-[13px] text-text-secondary mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchTemplates}>Retry</Button>
        </Card>
      ) : loading ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <div className="lg:col-span-2"><Skeleton className="h-96" /></div>
        </div>
      ) : !activeTemplate ? (
        <Card className="p-12 text-center"><p className="text-[14px] text-text-secondary">No templates found.</p></Card>
      ) : (
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
      )}
    </OrganizationLayout>
  )
}

export default TemplatesPage
