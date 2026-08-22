import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, MessageSquareWarning, FileText } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import { Card, Badge, Button, Modal, ConfirmModal, Textarea, useToast } from '../../components/ui'
import { usePermission } from '../../hooks/useAuth.jsx'
import { actionPermissions } from '../../permissions/actionPermissions'
import { getOnboardingForReview, approveOnboarding, rejectOnboarding, requestOnboardingChanges } from '../../api/onboardingApi'
import { GatewayUrl } from '../../api/client'

function OnboardingReviewDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const hasPermission = usePermission()
    const toast = useToast()
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [modal, setModal] = useState(null) // 'approve' | 'reject' | 'changes' | null
    const [reason, setReason] = useState('')
    // Keyed by field.key -> { checked, message, sectionKey, label }. Built
    // from the actual form schema so a reviewer picks real fields instead
    // of typing a field key by hand and hoping it matches.
    const [fieldChanges, setFieldChanges] = useState({})
    const [generalNote, setGeneralNote] = useState('')

    const load = () => {
        setLoading(true)
        getOnboardingForReview(id).then(setData).catch((err) => setError(err.message)).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [id])

    const runAction = async (fn, successMessage) => {
        setBusy(true)
        setError('')
        try {
            await fn()
            setModal(null)
            if (successMessage) toast.success(successMessage)
            load()
        } catch (err) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setBusy(false)
        }
    }

    if (loading) return <AdminShell><p className='text-text-secondary text-[14px]'>Loading...</p></AdminShell>
    if (!data) return <AdminShell><p className='text-red-500 text-[14px]'>{error || 'Not found.'}</p></AdminShell>

    const canReview = ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(data.status)

    return (
        <AdminShell>
            <button onClick={() => navigate('/platform/admin/onboarding')} className='flex items-center gap-1.5 text-[13.5px] text-text-secondary hover:text-ink mb-5'>
                <ArrowLeft size={15} /> Back to onboarding review
            </button>

            <div className='flex items-start justify-between mb-8'>
                <div>
                    <h1 className='font-display text-[22px] font-bold text-ink mb-1.5'>{data.name}</h1>
                    <div className='flex items-center gap-2'>
                        <Badge>{data.type}</Badge>
                        <Badge variant={{ APPROVED: 'success', REJECTED: 'danger', CHANGES_REQUESTED: 'warning' }[data.status] || 'neutral'}>{data.status.replace(/_/g, ' ')}</Badge>
                    </div>
                </div>
                {canReview && (
                    <div className='flex gap-2'>
                        {hasPermission(actionPermissions.approveOnboarding) && (
                            <Button onClick={() => setModal('approve')} disabled={busy}>
                                <CheckCircle2 size={15} /> Approve
                            </Button>
                        )}
                        {hasPermission('ONBOARDING_REVIEW') && (
                            <Button
                                variant='secondary'
                                onClick={() => {
        const initial = {}
                                    for (const section of data.form.sections) {
                                        for (const field of section.fields) {
                                            initial[field.key] = { checked: false, message: '', sectionKey: section.key, label: field.label }
                                        }
                                    }
                                    setFieldChanges(initial)
                                    setGeneralNote('')
                                    setModal('changes')
                                }}
                                disabled={busy}
                            >
                                <MessageSquareWarning size={15} /> Request changes
                            </Button>
                        )}
                        {hasPermission(actionPermissions.rejectOnboarding) && (
                            <Button variant='danger' onClick={() => setModal('reject')} disabled={busy}>
                                <XCircle size={15} /> Reject
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {error && <p className='text-[13.5px] text-red-500 mb-4'>{error}</p>}

            <div className='grid lg:grid-cols-[1fr_280px] gap-6'>
                <div className='space-y-6'>
                    {data.form.sections.map((section) => (
                        <Card key={section.key} className='p-6'>
                            <h3 className='font-display text-[15.5px] font-bold text-ink mb-4'>{section.title}</h3>
                            <div className='grid sm:grid-cols-2 gap-x-4 gap-y-6'>
                                {section.fields.map((field) => {
                                    const isFile = ['FILE', 'IMAGE', 'MULTI_FILE'].includes(field.type)
                                    const fieldFiles = isFile
                                        ? data.files?.filter((f) => f.fieldKey === field.key) || []
                                        : []
                                    const nonFileValue = isFile ? null : data.data?.[field.key]
                                    return (
                                        <div key={field.key} className={isFile ? 'sm:col-span-2' : ''}>
                                            <p className='text-[12px] text-text-secondary mb-1'>{field.label}</p>
                                            {isFile ? (
                                                fieldFiles.length > 0 ? (
                                                    <div className="grid sm:grid-cols-2 gap-3 mt-1">
                                                        {fieldFiles.map((fileObj) => {
                                                            const fileUrl = `${GatewayUrl}/api/v1/onboardings/${id}/files/${fileObj.fileId}/view`
                                                            const isImg = fileObj.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileObj.originalName)
                                                            return (
                                                                <div key={fileObj.fileId} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between gap-3 group hover:bg-gray-100/60 transition-all">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        {isImg ? (
                                                                            <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden bg-white shrink-0 flex items-center justify-center shadow-sm">
                                                                                <img
                                                                                    src={fileUrl}
                                                                                    alt={fileObj.originalName}
                                                                                    className="w-full h-full object-cover"
                                                                                    onError={(e) => {
                                                                                        e.target.style.display = 'none'
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-12 h-12 rounded-lg bg-red-50 text-accent flex items-center justify-center shrink-0 border border-red-100/50">
                                                                                <FileText size={22} />
                                                                            </div>
                                                                        )}
                                                                        <div className="min-w-0">
                                                                            <p className="text-[13px] font-semibold text-gray-900 truncate" title={fileObj.originalName}>
                                                                                {fileObj.originalName}
                                                                            </p>
                                                                            <p className="text-[11px] text-gray-500">
                                                                                {fileObj.size ? `${(fileObj.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size'}
                                                                                {fileObj.mimeType && ` • ${fileObj.mimeType.split('/')[1]?.toUpperCase()}`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <a
                                                                        href={fileUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="px-3 py-1.5 text-[12px] font-semibold text-accent hover:text-accent-dark bg-white border border-gray-200 hover:border-gray-300 rounded-lg shadow-sm transition-all shrink-0"
                                                                    >
                                                                        View
                                                                    </a>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className='text-[13.5px] text-gray-400 italic mt-1'>No file uploaded</p>
                                                )
                                            ) : (
                                                <p className='text-[13.5px] text-ink'>
                                                    {Array.isArray(nonFileValue)
                                                        ? nonFileValue.join(', ')
                                                        : (nonFileValue && typeof nonFileValue === 'object' ? Object.values(nonFileValue).filter(Boolean).join(', ') : (nonFileValue ?? '—'))}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    ))}
                </div>

                <div className='space-y-6'>
                    <Card className='p-5'>
                        <h4 className='text-[12.5px] font-semibold uppercase tracking-wide text-text-secondary mb-3'>Contact</h4>
                        <p className='text-[13.5px] text-ink mb-1'>{data.contact?.name}</p>
                        <p className='text-[13px] text-text-secondary mb-1'>{data.contact?.email}</p>
                        <p className='text-[13px] text-text-secondary'>{data.contact?.phone}</p>
                    </Card>
                    {data.reviewItems?.length > 0 && (
                        <Card className='p-5'>
                            <h4 className='text-[12.5px] font-semibold uppercase tracking-wide text-text-secondary mb-3'>Open review items</h4>
                            <div className='space-y-2'>
                                {data.reviewItems.map((item) => (
                                    <div key={item.id} className='text-[13px] text-ink bg-amber-50 border border-amber-200 rounded-lg p-2.5'>
                                        {item.fieldKey && <span className='font-medium'>{item.fieldKey}: </span>}{item.message}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            <ConfirmModal
                open={modal === 'approve'}
                onClose={() => setModal(null)}
                title='Approve this onboarding?'
                confirmLabel='Approve'
                onConfirm={() => runAction(() => approveOnboarding(id), 'Onboarding approved.')}
            >
                This creates the client record and, once contact details are on file, issues their first login. This can't be undone from here.
            </ConfirmModal>

            <Modal open={modal === 'reject'} onClose={() => setModal(null)} title='Reject this onboarding'>
                <Textarea label='Reason (visible in the audit trail)' value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                <div className='flex justify-end gap-2 mt-5'>
                    <Button variant='secondary' onClick={() => setModal(null)}>Cancel</Button>
                    <Button variant='danger' disabled={busy} onClick={() => runAction(() => rejectOnboarding(id, reason), 'Onboarding rejected.')}>Reject</Button>
                </div>
            </Modal>

            <Modal open={modal === 'changes'} onClose={() => setModal(null)} title='Request changes' size='lg'>
                <p className='text-[13px] text-text-secondary mb-4'>
                    Check each field that needs correcting and say what's wrong. The applicant gets one email listing everything you flag here.
                </p>
                <div className='space-y-5 max-h-[50vh] overflow-y-auto pr-1'>
                    {data.form.sections.map((section) => (
                        <div key={section.key}>
                            <h4 className='text-[12px] font-semibold uppercase tracking-wide text-text-secondary mb-2'>{section.title}</h4>
                            <div className='space-y-2'>
                                {section.fields.map((field) => {
                                    const state = fieldChanges[field.key] || { checked: false, message: '' }
                                    return (
                                        <div key={field.key} className={`rounded-xl border transition-colors ${state.checked ? 'border-accent/40 bg-accent/[0.03]' : 'border-line'}`}>
                                            <label className='flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer'>
                                                <input
                                                    type='checkbox'
                                                    checked={state.checked}
                                                    onChange={(e) => setFieldChanges((prev) => ({ ...prev, [field.key]: { ...prev[field.key], checked: e.target.checked } }))}
                                                    className='w-4 h-4 rounded border-line accent-accent shrink-0'
                                                />
                                                <span className='text-[13.5px] text-ink font-medium'>{field.label}</span>
                                            </label>
                                            {state.checked && (
                                                <div className='px-3.5 pb-3.5'>
                                                    <input
                                                        autoFocus
                                                        placeholder={`What needs to change about "${field.label}"?`}
                                                        value={state.message}
                                                        onChange={(e) => setFieldChanges((prev) => ({ ...prev, [field.key]: { ...prev[field.key], message: e.target.value } }))}
                                                        className='w-full bg-card border border-line rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent/60'
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                    <div>
                        <h4 className='text-[12px] font-semibold uppercase tracking-wide text-text-secondary mb-2'>General note (optional)</h4>
                        <Textarea
                            placeholder='Anything not tied to a specific field...'
                            value={generalNote}
                            onChange={(e) => setGeneralNote(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>
                <div className='flex justify-end gap-2 mt-5 pt-4 border-t border-line'>
                    <Button variant='secondary' onClick={() => setModal(null)}>Cancel</Button>
                    <Button
                        disabled={busy || !(Object.values(fieldChanges).some((f) => f.checked && f.message.trim()) || generalNote.trim())}
                        onClick={() => {
                            const items = Object.entries(fieldChanges)
                                .filter(([, f]) => f.checked && f.message.trim())
                                .map(([fieldKey, f]) => ({ fieldKey, sectionKey: f.sectionKey, label: f.label, message: f.message.trim() }))
                            if (generalNote.trim()) items.push({ fieldKey: null, sectionKey: null, label: null, message: generalNote.trim() })
                            runAction(() => requestOnboardingChanges(id, items), 'Change request emailed to applicant.')
                        }}
                    >
                        Send to applicant
                    </Button>
                </div>
            </Modal>
        </AdminShell>
    )
}

export default OnboardingReviewDetail
