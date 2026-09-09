import React, { useState, useEffect, useMemo } from 'react'
import { Check, Save, AlertCircle, Eye, Plus, Trash2, Mail, MessageCircle, Phone } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import Modal from '../../components/ui/Modal'
import { Card, Button, Input, Select, Textarea, Badge, SearchInput, Tabs, Skeleton, EmptyState, ConfirmModal, useToast } from '../../components/ui'
import {
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  getOrganizationProfile,
} from '../../api/organization/organizationApi'
import { formatEnumLabel } from '../../utils/formatEnumLabel'
import { TEMPLATE_VARIABLE_TAGS, TEMPLATE_SAMPLE_VALUES, renderWithSamples } from '../../constants/templateVariables'
import logo from '../../assets/logo.png'

const CHANNEL_TABS = [
  { id: 'EMAIL', label: 'Email', icon: Mail },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
  { id: 'CALL', label: 'Call', icon: Phone },
]

const PURPOSE_OPTIONS = [
  { value: 'INVITATION', label: 'Invitation' },
  { value: 'REMINDER', label: 'Reminder' },
  { value: 'COMPLETION', label: 'Completion' },
  { value: 'REJECTION', label: 'Rejection' },
  { value: 'CONGRATULATIONS', label: 'Congratulations / Selection' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'OTHER', label: 'Other' },
]

const STATUS_BADGE = { ACTIVE: 'success', INACTIVE: 'neutral' }

function TemplatesPage() {
  const toast = useToast()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [channelTab, setChannelTab] = useState('EMAIL')
  const [search, setSearch] = useState('')
  const [activeTemplateId, setActiveTemplateId] = useState(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [orgName, setOrgName] = useState('Your Organization')

  const [newTemplate, setNewTemplate] = useState({ name: '', type: 'EMAIL', purpose: 'INVITATION', subject: '', body: '' })

  useEffect(() => {
    getOrganizationProfile().then((p) => p?.name && setOrgName(p.name)).catch(() => {})
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getNotificationTemplates()
      const mapped = (data || []).map((t) => ({ ...t, id: t.templateId || t._id || t.id }))
      setTemplates(mapped)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  const channelTemplates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => t.type === channelTab && (!q || t.name.toLowerCase().includes(q)))
  }, [templates, channelTab, search])

  // Keep the selected template in sync with the active channel tab/search -
  // never leave an editor open for a template that's no longer in view.
  useEffect(() => {
    if (!channelTemplates.some((t) => t.id === activeTemplateId)) {
      setActiveTemplateId(channelTemplates[0]?.id || null)
    }
  }, [channelTemplates, activeTemplateId])

  const activeTemplate = templates.find((t) => t.id === activeTemplateId)

  const handleUpdateActiveField = (field, value) => {
    setTemplates((prev) => prev.map((t) => (t.id === activeTemplateId ? { ...t, [field]: value } : t)))
  }

  const insertTag = (tag) => {
    handleUpdateActiveField('body', (activeTemplate.body || '') + ' ' + tag)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateNotificationTemplate(activeTemplate.templateId || activeTemplate.id, {
        name: activeTemplate.name,
        subject: activeTemplate.subject,
        body: activeTemplate.body,
        purpose: activeTemplate.purpose,
        status: activeTemplate.status,
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

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) return
    if (newTemplate.type === 'EMAIL' && !newTemplate.subject.trim()) return
    setCreating(true)
    try {
      const created = await createNotificationTemplate(newTemplate)
      toast.success('Template created.')
      setCreateOpen(false)
      setNewTemplate({ name: '', type: 'EMAIL', purpose: 'INVITATION', subject: '', body: '' })
      await fetchTemplates()
      setChannelTab(created.type)
      setActiveTemplateId(created.templateId || created._id || created.id)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteNotificationTemplate(deleteTarget.templateId || deleteTarget.id)
      toast.success('Template deleted.')
      setDeleteTarget(null)
      await fetchTemplates()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <OrganizationLayout
      title="Communication Templates"
      description="Manage email, WhatsApp, and call templates used to invite, remind, and follow up with candidates."
      action={
        <Button size="sm" onClick={() => { setNewTemplate((t) => ({ ...t, type: channelTab })); setCreateOpen(true) }}>
          <Plus size={14} /> Create Template
        </Button>
      }
    >
      <Tabs tabs={CHANNEL_TABS} value={channelTab} onChange={setChannelTab} className="mb-5" />

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
      ) : templates.filter((t) => t.type === channelTab).length === 0 ? (
        <Card>
          <EmptyState
            icon={CHANNEL_TABS.find((c) => c.id === channelTab)?.icon}
            title={`No ${formatEnumLabel(channelTab)} templates yet`}
            description={`Create your first ${formatEnumLabel(channelTab)} template to use it for candidate communication.`}
            actionLabel="Create Template"
            onAction={() => { setNewTemplate((t) => ({ ...t, type: channelTab })); setCreateOpen(true) }}
          />
        </Card>
      ) : (
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="space-y-3">
          <SearchInput placeholder="Search templates..." value={search} onChange={setSearch} className="mb-1" />
          {channelTemplates.map((tmpl) => {
            const isActive = activeTemplateId === tmpl.id
            return (
              <div
                key={tmpl.id}
                onClick={() => setActiveTemplateId(tmpl.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                  isActive
                    ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                    : 'border-line bg-card hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="font-semibold text-[13.5px] text-ink truncate">{tmpl.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(tmpl) }}
                    className="p-1 rounded text-text-secondary hover:text-red-600 hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    aria-label="Delete template"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="brand">{formatEnumLabel(tmpl.purpose)}</Badge>
                  <Badge variant={STATUS_BADGE[tmpl.status] || 'neutral'}>{formatEnumLabel(tmpl.status || 'ACTIVE')}</Badge>
                </div>
                <p className="text-[11.5px] text-text-secondary mt-1.5">
                  Updated {tmpl.lastUpdated ? new Date(tmpl.lastUpdated).toLocaleDateString() : '—'}
                </p>
              </div>
            )
          })}
        </div>

        {/* Live Template Editor */}
        <div className="lg:col-span-2">
          {!activeTemplate ? (
            <Card className="p-12 text-center"><p className="text-[14px] text-text-secondary">Select a template to edit.</p></Card>
          ) : (
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-4 flex-wrap gap-3">
              <div>
                <h2 className="font-display text-[16px] font-bold text-ink">{activeTemplate.name}</h2>
                <p className="text-[12.5px] text-text-secondary">Edit template text and dynamic variable tags below.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
                  <Eye size={14} /> Preview
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {savedSuccess ? <Check size={14} /> : <Save size={14} />} {saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Template'}
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Template Name"
                value={activeTemplate.name}
                onChange={(e) => handleUpdateActiveField('name', e.target.value)}
              />
              <Select
                label="Purpose"
                value={activeTemplate.purpose || 'OTHER'}
                onChange={(e) => handleUpdateActiveField('purpose', e.target.value)}
                options={PURPOSE_OPTIONS}
              />
            </div>

            {activeTemplate.type === 'EMAIL' && (
              <Input
                label="Email Subject Line"
                value={activeTemplate.subject || ''}
                onChange={(e) => handleUpdateActiveField('subject', e.target.value)}
              />
            )}

            {/* Variable Tag Toolbar */}
            <div>
              <label className="block text-[12.5px] font-semibold text-ink mb-1.5">Insert Dynamic Tags</label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARIABLE_TAGS.map((tag) => (
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
              label={activeTemplate.type === 'CALL' ? 'Call Script' : 'Message Body'}
              rows={8}
              value={activeTemplate.body}
              onChange={(e) => handleUpdateActiveField('body', e.target.value)}
              className="font-sans text-[13px] leading-relaxed"
            />
          </Card>
          )}
        </div>
      </div>
      )}

      {activeTemplate && (
        <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={`${formatEnumLabel(activeTemplate.type)} Preview`} size="md">
          <p className="text-[12.5px] text-text-secondary mb-4">
            Rendered with sample data (candidate/drive names are placeholders) - your organization name below is real.
          </p>
          {activeTemplate.type === 'EMAIL' ? (
            <div style={{ background: '#f7f5f5', padding: '24px 16px', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif', borderRadius: 12 }}>
              <div style={{ maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 16, border: '1px solid #eee6e6', overflow: 'hidden' }}>
                <div style={{ padding: '24px 24px 8px', textAlign: 'center' }}>
                  <img src={logo} alt="" width={28} height={28} style={{ borderRadius: '50%', verticalAlign: 'middle' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1215', verticalAlign: 'middle', marginLeft: 8 }}>WorkmateIQ</span>
                </div>
                <div style={{ padding: '16px 24px 24px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8085', margin: '0 0 4px' }}>Subject</p>
                  <p style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1215', margin: '0 0 16px' }}>
                    {renderWithSamples(activeTemplate.subject, { ...TEMPLATE_SAMPLE_VALUES, company_name: orgName })}
                  </p>
                  <div style={{ fontSize: 13.5, color: '#1a1215', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {renderWithSamples(activeTemplate.body, { ...TEMPLATE_SAMPLE_VALUES, company_name: orgName })}
                  </div>
                </div>
                <div style={{ padding: '16px 24px 20px', borderTop: '1px solid #f1eaea', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b6570' }}>We appreciate your time and look forward to working with you.</p>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#c4161f' }}>{orgName} via WorkmateIQ</p>
                </div>
              </div>
            </div>
          ) : activeTemplate.type === 'WHATSAPP' ? (
            <div style={{ background: '#e5ded6', padding: 20, borderRadius: 12 }}>
              <div style={{ maxWidth: 340, marginLeft: 'auto', background: '#dcf8c6', borderRadius: '12px 12px 2px 12px', padding: '10px 12px', fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: '#111' }}>
                {renderWithSamples(activeTemplate.body, { ...TEMPLATE_SAMPLE_VALUES, company_name: orgName })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-black/[0.02] dark:bg-white/[0.03] p-5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink">
              {renderWithSamples(activeTemplate.body, { ...TEMPLATE_SAMPLE_VALUES, company_name: orgName })}
            </div>
          )}
        </Modal>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Template"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button type="button" variant="secondary" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button type="button" size="sm" onClick={handleCreate} disabled={creating}>
              <Check size={14} /> {creating ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g. Final Round Reminder"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate((t) => ({ ...t, name: e.target.value }))}
            required
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Channel"
              value={newTemplate.type}
              onChange={(e) => setNewTemplate((t) => ({ ...t, type: e.target.value }))}
              options={CHANNEL_TABS.map((c) => ({ value: c.id, label: c.label }))}
            />
            <Select
              label="Purpose"
              value={newTemplate.purpose}
              onChange={(e) => setNewTemplate((t) => ({ ...t, purpose: e.target.value }))}
              options={PURPOSE_OPTIONS}
            />
          </div>
          {newTemplate.type === 'EMAIL' && (
            <Input
              label="Email Subject Line"
              value={newTemplate.subject}
              onChange={(e) => setNewTemplate((t) => ({ ...t, subject: e.target.value }))}
              required
            />
          )}
          <div>
            <label className="block text-[12.5px] font-semibold text-ink mb-1.5">Insert Dynamic Tags</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {TEMPLATE_VARIABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setNewTemplate((t) => ({ ...t, body: (t.body || '') + ' ' + tag }))}
                  className="px-2.5 py-1 rounded-lg border border-line bg-black/[0.03] dark:bg-white/[0.05] text-[12px] font-mono text-accent font-semibold hover:bg-accent/10 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
            <Textarea
              label={newTemplate.type === 'CALL' ? 'Call Script' : 'Message Body'}
              rows={7}
              value={newTemplate.body}
              onChange={(e) => setNewTemplate((t) => ({ ...t, body: e.target.value }))}
              required
            />
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete template?"
        confirmLabel="Delete"
        danger
      >
        <p className="text-[13.5px] text-text-secondary">
          "{deleteTarget?.name}" will be permanently removed and can no longer be used for candidate communication.
        </p>
      </ConfirmModal>
    </OrganizationLayout>
  )
}

export default TemplatesPage
