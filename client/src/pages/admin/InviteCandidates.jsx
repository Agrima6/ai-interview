import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Send, RefreshCw } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Button from '../../components/Button'
import Dropdown from '../../components/Dropdown'
import AdminNav from './AdminNav'
import { Input, Card, Badge, PageHeader, EmptyState, Skeleton, ErrorText } from './adminUi'
import { listInvites, createInvite, listInterviewTemplates, resendInvite } from '../../utils/conductApi'

const emptyCandidate = () => ({ name: '', email: '' })

function InviteCandidates() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const organizationId = searchParams.get('organizationId') || undefined

    const [templates, setTemplates] = useState([])
    const [invites, setInvites] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [templateId, setTemplateId] = useState('')
    const [candidates, setCandidates] = useState([emptyCandidate()])
    const [sending, setSending] = useState(false)
    const [sendError, setSendError] = useState('')
    const [sendResults, setSendResults] = useState(null)
    const [resendingId, setResendingId] = useState(null)

    const load = async () => {
        setLoading(true)
        setError('')
        try {
            const [t, i] = await Promise.all([listInterviewTemplates(organizationId), listInvites(organizationId)])
            setTemplates(t.filter((tpl) => tpl.isActive !== false))
            setInvites(i)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load invites.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [organizationId])

    const handleResend = async (id) => {
        setResendingId(id)
        try {
            await resendInvite(id, organizationId)
        } catch {
            // error is persisted on the invite itself (lastEmailError) and shown inline after reload
        } finally {
            setResendingId(null)
            load()
        }
    }

    const updateCandidateAt = (i, next) => setCandidates((cs) => cs.map((c, idx) => (idx === i ? next : c)))
    const removeCandidateAt = (i) => setCandidates((cs) => cs.filter((_, idx) => idx !== i))

    const handleSend = async (e) => {
        e.preventDefault()
        if (!templateId) { setSendError('Choose an interview template.'); return }
        const validCandidates = candidates.filter((c) => c.email.trim())
        if (validCandidates.length === 0) { setSendError('Add at least one candidate email.'); return }

        setSending(true)
        setSendError('')
        setSendResults(null)
        const results = []
        for (const c of validCandidates) {
            try {
                await createInvite({ templateId, candidateEmail: c.email.trim(), candidateName: c.name.trim() || undefined }, organizationId)
                results.push({ email: c.email, ok: true })
            } catch (err) {
                results.push({ email: c.email, ok: false, message: err.response?.data?.message || 'Failed to send.' })
            }
        }
        setSendResults(results)
        setSending(false)
        if (results.every((r) => r.ok)) {
            setCandidates([emptyCandidate()])
        }
        load()
    }

    return (
        <div className='min-h-screen bg-bg flex flex-col'>
            <Navbar />
            <div className='flex-1 bg-noise'>
                <div className='max-w-[1280px] mx-auto px-6 py-16'>
                    <PageHeader
                        title="Invite Candidates"
                        subtitle="Send interview invites and track candidate progress"
                        onBack={() => navigate('/admin')}
                    />

                    <AdminNav />

                    {loading ? (
                        <div className='space-y-4'>
                            <Skeleton className='h-48' />
                            <Skeleton className='h-64' />
                        </div>
                    ) : error ? (
                        <p className='text-red-500 text-[14px]'>{error}</p>
                    ) : (
                        <div className='space-y-8'>
                            <Card className='p-6'>
                                <h3 className='text-[15px] font-semibold text-ink mb-4'>Send New Invites</h3>

                                {templates.length === 0 ? (
                                    <p className='text-[13.5px] text-text-secondary'>
                                        No active interview templates yet. Create one in the Templates tab first.
                                    </p>
                                ) : (
                                    <form onSubmit={handleSend} className='space-y-4'>
                                        <Dropdown value={templateId} onChange={setTemplateId}
                                            options={templates.map((t) => ({ value: t._id, label: t.title }))}
                                            placeholder="Select interview template" />

                                        <div className='space-y-2'>
                                            {candidates.map((c, i) => (
                                                <div key={i} className='flex items-center gap-2'>
                                                    <Input placeholder="Candidate name (optional)" value={c.name}
                                                        onChange={(e) => updateCandidateAt(i, { ...c, name: e.target.value })} className='flex-1' />
                                                    <Input type="email" placeholder="Candidate email" value={c.email}
                                                        onChange={(e) => updateCandidateAt(i, { ...c, email: e.target.value })} className='flex-1' />
                                                    {candidates.length > 1 && (
                                                        <button type="button" onClick={() => removeCandidateAt(i)} className='text-text-secondary hover:text-red-500 shrink-0'>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <button type="button" onClick={() => setCandidates((cs) => [...cs, emptyCandidate()])}
                                            className='flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline'>
                                            <Plus size={14} /> Add another candidate
                                        </button>

                                        <ErrorText>{sendError}</ErrorText>

                                        {sendResults && (
                                            <div className='space-y-1'>
                                                {sendResults.map((r, i) => (
                                                    <p key={i} className={`text-[12.5px] ${r.ok ? 'text-success' : 'text-red-500'}`}>
                                                        {r.email}: {r.ok ? 'Invite sent' : r.message}
                                                    </p>
                                                ))}
                                            </div>
                                        )}

                                        <Button type="submit" disabled={sending} className='!px-6'>
                                            {sending ? 'Sending...' : (<><Send size={15} /> Send Invite{candidates.filter((c) => c.email.trim()).length > 1 ? 's' : ''}</>)}
                                        </Button>
                                    </form>
                                )}
                            </Card>

                            <div>
                                <div className='flex items-center justify-between mb-4'>
                                    <h3 className='text-[15px] font-semibold text-ink'>Sent Invites</h3>
                                    <button onClick={load} className='flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-accent transition-colors'>
                                        <RefreshCw size={13} /> Refresh
                                    </button>
                                </div>

                                {invites.length === 0 ? (
                                    <EmptyState icon={Send} title="No invites sent yet" subtitle="Invites you send will show up here with live status." />
                                ) : (
                                    <Card className='p-6 overflow-x-auto'>
                                        <table className='w-full min-w-[720px]'>
                                            <thead>
                                                <tr className='border-b border-line text-left'>
                                                    <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Candidate</th>
                                                    <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Template</th>
                                                    <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Status</th>
                                                    <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Sent</th>
                                                    <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Expires</th>
                                                    <th className='pb-3 text-[12px] font-medium text-text-secondary uppercase tracking-wide'></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invites.map((inv) => (
                                                    <tr key={inv._id} className='border-b border-line last:border-0'>
                                                        <td className='py-3 pr-4'>
                                                            <p className='text-[14px] font-medium text-ink'>{inv.candidateName || '—'}</p>
                                                            <p className='text-[12px] text-text-secondary'>{inv.candidateEmail}</p>
                                                        </td>
                                                        <td className='py-3 pr-4 text-[13.5px] text-ink'>{inv.templateId?.title || '—'}</td>
                                                        <td className='py-3 pr-4'>
                                                            <Badge tone={inv.status}>{inv.status}</Badge>
                                                            {inv.lastEmailError && (
                                                                <p className='text-[11.5px] text-red-500 mt-1 max-w-[220px]'>{inv.lastEmailError}</p>
                                                            )}
                                                        </td>
                                                        <td className='py-3 pr-4 text-[12.5px] text-text-secondary'>{inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : '—'}</td>
                                                        <td className='py-3 pr-4 text-[12.5px] text-text-secondary'>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                                                        <td className='py-3 text-right'>
                                                            {inv.status !== 'completed' && (
                                                                <button onClick={() => handleResend(inv._id)} disabled={resendingId === inv._id}
                                                                    className='flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline disabled:opacity-50 whitespace-nowrap'>
                                                                    <RefreshCw size={12} className={resendingId === inv._id ? 'animate-spin' : ''} />
                                                                    {resendingId === inv._id ? 'Sending...' : 'Resend'}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default InviteCandidates
