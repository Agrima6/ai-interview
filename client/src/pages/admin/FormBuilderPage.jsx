import React, { useEffect, useMemo, useState } from 'react'
import AdminShell from '../../components/layout/AdminShell'
import { Button, Card, Badge, Select, ConfirmModal, useToast } from '../../components/ui'
import { listForms, getForm, saveForm, publishForm } from '../../api/formsAdminApi'
import { usePermission } from '../../hooks/useAuth.jsx'
import { featurePermissions } from '../../permissions/featurePermissions'
import { actionPermissions } from '../../permissions/actionPermissions'

const TYPES = ['ORGANIZATION', 'COLLEGE', 'CANDIDATE']
const STAGES = ['REGISTRATION', 'ONBOARDING']

const blankSection = () => ({
  key: `section_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
  title: 'New section',
  order: 1,
  fields: [],
})

const blankField = () => ({
  key: `field_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
  label: 'Untitled field',
  type: 'TEXT',
  required: false,
  placeholder: '',
  helpText: '',
  options: [],
})

function FormBuilderPage() {
  const hasPermission = usePermission()
  const canEdit = hasPermission(actionPermissions.editForm)
  const canPublish = hasPermission(actionPermissions.publishForm)
  const toast = useToast()

  const [type, setType] = useState('COLLEGE')
  const [stage, setStage] = useState('REGISTRATION')
  const [forms, setForms] = useState([])
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  // Discriminated confirm target: { kind: 'section', sectionIndex }
  // | { kind: 'field', sectionIndex, fieldIndex } | { kind: 'publish' }
  const [confirmTarget, setConfirmTarget] = useState(null)

  const selectedKey = useMemo(() => `${type}:${stage}`, [type, stage])

  const ensureDefaultForm = (draft = null) => {
    const next = draft || {
      id: null,
      type,
      stage,
      name: `${type.charAt(0)}${type.slice(1).toLowerCase()} ${stage.toLowerCase()}`,
      version: 0,
      sections: [blankSection()],
      status: 'DRAFT',
    }
    setForm(next)
  }

  useEffect(() => {
    const load = async () => {
      if (!hasPermission(featurePermissions.formBuilder)) return
      try {
        setLoading(true)
        const response = await listForms({})
        const items = response.items || []
        setForms(items)
        const current = items.find((item) => item.type === type && item.stage === stage) || null
        if (current) {
          setForm({
            ...current,
            sections: current.sections || [{ ...blankSection(), fields: [] }],
          })
        } else {
          ensureDefaultForm({
            id: null,
            type,
            stage,
            name: `${type.charAt(0)}${type.slice(1).toLowerCase()} ${stage.toLowerCase()}`,
            version: 0,
            sections: [blankSection()],
            status: 'DRAFT',
          })
        }
      } catch (err) {
        setError(err.message)
        ensureDefaultForm()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedKey, hasPermission])

  const handleTypeStageChange = (nextType, nextStage) => {
    setType(nextType)
    setStage(nextStage)
    const match = forms.find((item) => item.type === nextType && item.stage === nextStage)
    if (match) {
      setForm({ ...match, sections: match.sections || [blankSection()] })
    } else {
      ensureDefaultForm({
        id: null,
        type: nextType,
        stage: nextStage,
        name: `${nextType.charAt(0)}${nextType.slice(1).toLowerCase()} ${nextStage.toLowerCase()}`,
        version: 0,
        sections: [blankSection()],
        status: 'DRAFT',
      })
    }
  }

  const updateSection = (sectionIndex, nextSection) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) => index === sectionIndex ? nextSection : section),
    }))
  }

  const addSection = () => {
    setForm((prev) => ({ ...prev, sections: [...(prev?.sections || []), blankSection()] }))
  }

  const removeSection = (sectionIndex) => {
    setForm((prev) => ({ ...prev, sections: prev.sections.filter((_, index) => index !== sectionIndex) }))
  }

  const addField = (sectionIndex) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) => index === sectionIndex ? { ...section, fields: [...section.fields, blankField()] } : section),
    }))
  }

  const updateField = (sectionIndex, fieldIndex, nextField) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) => {
        if (index !== sectionIndex) return section
        return { ...section, fields: section.fields.map((field, fIndex) => fIndex === fieldIndex ? nextField : field) }
      }),
    }))
  }

  const removeField = (sectionIndex, fieldIndex) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) => index === sectionIndex ? { ...section, fields: section.fields.filter((_, fIndex) => fIndex !== fieldIndex) } : section),
    }))
  }

  const handleSave = async () => {
    if (!form || !canEdit) return
    try {
      setSaving(true)
      setError('')
      const payload = {
        name: form.name || `${type.charAt(0)}${type.slice(1).toLowerCase()} ${stage.toLowerCase()}`,
        sections: form.sections.map((section, index) => ({
          ...section,
          order: index + 1,
          fields: section.fields.map((field) => ({
            ...field,
            options: (field.options || []).map((option) => ({ label: option.label, value: option.value || option.label })),
          })),
        })),
      }
      const next = await saveForm(type, stage, payload)
      setForm({ ...form, ...next, sections: next.sections || form.sections })
      const refreshed = await listForms({})
      setForms(refreshed.items || [])
      toast.success('Draft saved.')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!form || !canPublish) return
    try {
      setPublishing(true)
      setError('')
      const next = await publishForm(type, stage)
      setForm((prev) => ({ ...prev, ...next, status: 'PUBLISHED' }))
      const refreshed = await listForms({})
      setForms(refreshed.items || [])
      toast.success('Form published successfully.')
    } catch (err) {
      setError(err.message)
      toast.error('Unable to publish the form.')
    } finally {
      setPublishing(false)
      setConfirmTarget(null)
    }
  }

  if (!hasPermission(featurePermissions.formBuilder)) {
    return <AdminShell><p className='text-text-secondary text-[14px]'>You don't have access to the form builder.</p></AdminShell>
  }

  return (
    <AdminShell>
      <div className='mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
        <div>
          <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Form builder</h1>
          <p className='text-text-secondary text-[14px]'>Create and publish the registration and onboarding forms by audience.</p>
        </div>
        <div className='flex flex-wrap gap-3'>
          <Select value={type} onChange={(e) => handleTypeStageChange(e.target.value, stage)} wrapperClassName='min-w-[170px]'>
            {TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
          <Select value={stage} onChange={(e) => handleTypeStageChange(type, e.target.value)} wrapperClassName='min-w-[170px]'>
            {STAGES.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
        </div>
      </div>

      {error && <div className='mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700'>{error}</div>}

      {loading || !form ? (
        <Card className='p-8 text-[14px] text-text-secondary'>Loading form configuration…</Card>
      ) : (
        <div className='space-y-6'>
          <Card className='p-5'>
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <div className='flex-1'>
                <label className='block text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary mb-2'>Form name</label>
                <input
                  value={form.name || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className='w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                  placeholder='Form display name'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Badge variant={form.status === 'PUBLISHED' ? 'success' : 'neutral'}>{form.status || 'DRAFT'}</Badge>
                {form.version ? <Badge variant='brand'>v{form.version}</Badge> : null}
              </div>
            </div>
            <div className='mt-4 flex flex-wrap gap-3'>
              <Button variant='secondary' onClick={handleSave} disabled={!canEdit || saving}>{saving ? 'Saving…' : 'Save draft'}</Button>
              <Button onClick={() => setConfirmTarget({ kind: 'publish' })} disabled={!canPublish || publishing}>{publishing ? 'Publishing…' : 'Publish form'}</Button>
            </div>
          </Card>

          <div className='space-y-5'>
            {(form.sections || []).map((section, sectionIndex) => (
              <Card key={section.key || `${sectionIndex}-${section.title}`} className='p-5'>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <input
                    value={section.title}
                    onChange={(e) => updateSection(sectionIndex, { ...section, title: e.target.value })}
                    className='w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                    placeholder='Section title'
                  />
                  <Button variant='ghost' size='sm' onClick={() => setConfirmTarget({ kind: 'section', sectionIndex })} disabled={(form.sections || []).length === 1}>Remove</Button>
                </div>

                <div className='space-y-4'>
                  {(section.fields || []).map((field, fieldIndex) => (
                    <div key={field.key || `${sectionIndex}-${fieldIndex}`} className='rounded-2xl border border-line bg-bg/60 p-4'>
                      <div className='grid gap-4 md:grid-cols-2'>
                        <div>
                          <label className='mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary'>Field label</label>
                          <input
                            value={field.label}
                            onChange={(e) => updateField(sectionIndex, fieldIndex, { ...field, label: e.target.value })}
                            className='w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                          />
                        </div>
                        <div>
                          <label className='mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary'>Field key</label>
                          <input
                            value={field.key}
                            onChange={(e) => updateField(sectionIndex, fieldIndex, { ...field, key: e.target.value })}
                            className='w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                          />
                        </div>
                        <div>
                          <label className='mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary'>Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(sectionIndex, fieldIndex, { ...field, type: e.target.value })}
                            className='w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                          >
                            {['TEXT','EMAIL','PHONE','NUMBER','DATE','SELECT','RADIO','CHECKBOX','TEXTAREA','FILE','URL','ADDRESS'].map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        <div className='flex items-end'>
                          <label className='flex w-full items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink'>
                            <span>Required</span>
                            <input
                              type='checkbox'
                              checked={!!field.required}
                              onChange={(e) => updateField(sectionIndex, fieldIndex, { ...field, required: e.target.checked })}
                            />
                          </label>
                        </div>
                        <div className='md:col-span-2'>
                          <label className='mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary'>Placeholder</label>
                          <input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(sectionIndex, fieldIndex, { ...field, placeholder: e.target.value })}
                            className='w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                          />
                        </div>
                        <div className='md:col-span-2'>
                          <label className='mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary'>Helper text</label>
                          <input
                            value={field.helpText || ''}
                            onChange={(e) => updateField(sectionIndex, fieldIndex, { ...field, helpText: e.target.value })}
                            className='w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                          />
                        </div>
                      </div>

                      {['SELECT', 'RADIO'].includes(field.type) && (
                        <div className='mt-4 rounded-xl border border-dashed border-line bg-white p-3'>
                          <div className='mb-2 flex items-center justify-between'>
                            <p className='text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary'>Options</p>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => updateField(sectionIndex, fieldIndex, { ...field, options: [...(field.options || []), { label: 'Option', value: 'option' }] })}
                            >
                              Add option
                            </Button>
                          </div>
                          <div className='space-y-2'>
                            {(field.options || []).map((option, optionIndex) => (
                              <div key={`${field.key}-option-${optionIndex}`} className='grid gap-2 md:grid-cols-[1fr_1fr_auto]'>
                                <input
                                  value={option.label}
                                  onChange={(e) => {
                                    const nextOptions = [...(field.options || [])]
                                    nextOptions[optionIndex] = { ...nextOptions[optionIndex], label: e.target.value }
                                    updateField(sectionIndex, fieldIndex, { ...field, options: nextOptions })
                                  }}
                                  className='rounded-xl border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                                  placeholder='Label'
                                />
                                <input
                                  value={option.value || option.label}
                                  onChange={(e) => {
                                    const nextOptions = [...(field.options || [])]
                                    nextOptions[optionIndex] = { ...nextOptions[optionIndex], value: e.target.value }
                                    updateField(sectionIndex, fieldIndex, { ...field, options: nextOptions })
                                  }}
                                  className='rounded-xl border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                                  placeholder='Value'
                                />
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => updateField(sectionIndex, fieldIndex, { ...field, options: (field.options || []).filter((_, index) => index !== optionIndex) })}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className='mt-4 flex justify-end'>
                        <Button variant='ghost' size='sm' onClick={() => setConfirmTarget({ kind: 'field', sectionIndex, fieldIndex })}>Remove field</Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='mt-4 flex justify-between'>
                  <Button variant='secondary' size='sm' onClick={() => addField(sectionIndex)}>Add field</Button>
                </div>
              </Card>
            ))}
          </div>

          <div className='flex justify-between'>
            <Button variant='secondary' onClick={addSection}>Add section</Button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title={confirmTarget?.kind === 'publish' ? 'Publish this form?' : confirmTarget?.kind === 'section' ? 'Remove this section?' : 'Remove this field?'}
        confirmLabel={confirmTarget?.kind === 'publish' ? 'Publish form' : 'Remove'}
        danger={confirmTarget?.kind !== 'publish'}
        onConfirm={async () => {
          if (!confirmTarget) return
          if (confirmTarget.kind === 'publish') {
            await handlePublish()
            return
          }
          if (confirmTarget.kind === 'section') {
            removeSection(confirmTarget.sectionIndex)
            toast.success('Section removed. Save the draft to keep this change.')
          } else if (confirmTarget.kind === 'field') {
            removeField(confirmTarget.sectionIndex, confirmTarget.fieldIndex)
            toast.success('Field removed. Save the draft to keep this change.')
          }
          setConfirmTarget(null)
        }}
      >
        {confirmTarget?.kind === 'publish'
          ? 'Once published, this version can be used by new registrations. This can\'t be undone, though you can always publish a newer version later.'
          : confirmTarget?.kind === 'section'
            ? 'This removes the section and all of its fields from the draft. This only takes effect once you save the draft.'
            : 'This removes the field from its section. This only takes effect once you save the draft.'}
      </ConfirmModal>
    </AdminShell>
  )
}

export default FormBuilderPage
