import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, MessageSquareWarning, FileText } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import { Card, Badge, Button, Modal, Textarea } from '../../components/ui'
import { usePermission } from '../../hooks/useAuth.jsx'
import { actionPermissions } from '../../permissions/actionPermissions'
import { getOnboardingForReview, approveOnboarding, rejectOnboarding, requestOnboardingChanges } from '../../api/onboardingApi'

function OnboardingReviewDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const hasPermission = usePermission()
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [modal, setModal] = useState(null) // 'reject' | 'changes' | null
    const [reason, setReason] = useState('')
    const [changeItems, setChangeItems] = useState([{ fieldKey: '', message: '' }])

    const load = () => {
        setLoading(true)
        getOnboardingForReview(id).then(setData).catch((err) => setError(err.message)).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [id])

    const runAction = async (fn) => {
        setBusy(true)
        setError('')
        try {
            await fn()
            setModal(null)
            load()
        } catch (err) {
            setError(err.message)
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
                            <Button onClick={() => runAction(() => approveOnboarding(id))} disabled={busy}>
                                <CheckCircle2 size={15} /> Approve
                            </Button>
                        )}
                        {hasPermission('ONBOARDING_REVIEW') && (
                            <Button variant='secondary' onClick={() => setModal('changes')} disabled={busy}>
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
                            <div className='grid sm:grid-cols-2 gap-4'>
                                {section.fields.map((field) => {
                                    const isFile = ['FILE', 'IMAGE', 'MULTI_FILE'].includes(field.type)
                                    const value = isFile
                                        ? data.files?.find((f) => f.fieldKey === field.key)?.originalName
                                        : data.data?.[field.key]
                                    return (
                                        <div key={field.key}>
                                            <p className='text-[12px] text-text-secondary mb-0.5'>{field.label}</p>
                                            {isFile && value ? (
                                                <p className='text-[13.5px] text-ink flex items-center gap-1.5'><FileText size={13} className='text-accent' />{value}</p>
                                            ) : (
                                                <p className='text-[13.5px] text-ink'>
                                                    {Array.isArray(value)
                                                        ? value.join(', ')
                                                        : (value && typeof value === 'object' ? Object.values(value).filter(Boolean).join(', ') : (value ?? '—'))}
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

            <Modal open={modal === 'reject'} onClose={() => setModal(null)} title='Reject this onboarding'>
                <Textarea label='Reason (visible in the audit trail)' value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                <div className='flex justify-end gap-2 mt-5'>
                    <Button variant='secondary' onClick={() => setModal(null)}>Cancel</Button>
                    <Button variant='danger' disabled={busy} onClick={() => runAction(() => rejectOnboarding(id, reason))}>Reject</Button>
                </div>
            </Modal>

            <Modal open={modal === 'changes'} onClose={() => setModal(null)} title='Request changes'>
                <div className='space-y-3'>
                    {changeItems.map((item, i) => (
                        <div key={i} className='grid grid-cols-[1fr_2fr] gap-2'>
                            <input
                                placeholder='Field key (optional)'
                                value={item.fieldKey}
                                onChange={(e) => setChangeItems((items) => items.map((it, idx) => idx === i ? { ...it, fieldKey: e.target.value } : it))}
                                className='bg-card border border-line rounded-xl px-3 py-2 text-[13px] text-ink outline-none focus:border-accent/60'
                            />
                            <input
                                placeholder='What needs to change?'
                                value={item.message}
                                onChange={(e) => setChangeItems((items) => items.map((it, idx) => idx === i ? { ...it, message: e.target.value } : it))}
                                className='bg-card border border-line rounded-xl px-3 py-2 text-[13px] text-ink outline-none focus:border-accent/60'
                            />
                        </div>
                    ))}
                    <button type='button' onClick={() => setChangeItems((items) => [...items, { fieldKey: '', message: '' }])} className='text-[12.5px] text-accent hover:underline'>
                        + Add another item
                    </button>
                </div>
                <div className='flex justify-end gap-2 mt-5'>
                    <Button variant='secondary' onClick={() => setModal(null)}>Cancel</Button>
                    <Button disabled={busy} onClick={() => runAction(() => requestOnboardingChanges(id, changeItems.filter((i) => i.message.trim())))}>
                        Send to applicant
                    </Button>
                </div>
            </Modal>
        </AdminShell>
    )
}

export default OnboardingReviewDetail
