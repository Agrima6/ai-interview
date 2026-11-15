import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ClipboardCheck, MessageSquareWarning, PauseCircle, PlayCircle, X } from 'lucide-react'
import { apiGetList, apiPost } from '../../api/client'
import AdminShell from '../../components/layout/AdminShell'
import Badge from '../../components/ui/Badge'
import Button from '../../components/Button'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import { useToast } from '../../components/ui/Toast'
import { ErrorState, TableSkeleton } from '../../components/oa/oaUi'
import { formatDate, inputClass } from '../../components/oa/oaFormat'

const STATUS = {
    PENDING: ['warning', 'Waiting for review'], CHANGES_REQUESTED: ['info', 'Changes requested'], ACTIVE: ['success', 'Active'],
    REJECTED: ['danger', 'Rejected'], SUSPENDED: ['neutral', 'Suspended'],
}
const TABS = [['PENDING', 'To review'], ['ACTIVE', 'Active'], ['CHANGES_REQUESTED', 'Changes requested'], ['REJECTED', 'Rejected'], ['SUSPENDED', 'Suspended'], ['', 'All']]
const ACTION_TEXT = {
    approve: ['Approve this organization?', 'They can sign in and run assessments straight away, and we email them.', 'Approve', false],
    reject: ['Reject this registration?', 'They will be told it was not approved. Say why.', 'Reject', true],
    'request-changes': ['Ask for changes?', 'They are emailed what to fix and can register again with the corrections.', 'Send request', false],
    suspend: ['Suspend this account?', 'They are signed out of Online Assessment at once. Tests already running keep their data.', 'Suspend', true],
    reactivate: ['Reactivate this account?', 'They can sign in again.', 'Reactivate', false],
}

// The checker side of maker-checker: a platform admin reviews each Online Assessment registration (the maker is the
// applicant) before it can sign in.
export default function OaApprovalsPage() {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [status, setStatus] = useState('PENDING')
    const [search, setSearch] = useState('')
    const [q, setQ] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [action, setAction] = useState(null)       // { account, kind }
    const [note, setNote] = useState('')
    useEffect(() => { const id = setTimeout(() => { setQ(search); setPage(1) }, 350); return () => clearTimeout(id) }, [search])

    const list = useQuery({ queryKey: ['oa-approvals', { status, q, page, pageSize }], queryFn: () => apiGetList('/api/v1/oa/platform/accounts', { status, search: q, page, pageSize }), placeholderData: (p) => p })
    const decide = useMutation({
        mutationFn: ({ account, kind }) => apiPost(`/api/v1/oa/platform/accounts/${account.id}/${kind}`, { note }),
        onSuccess: (_, { kind }) => { queryClient.invalidateQueries({ queryKey: ['oa-approvals'] }); setAction(null); setNote(''); toast.success({ approve: 'Approved. They have been emailed.', reject: 'Rejected.', 'request-changes': 'Sent back for changes.', suspend: 'Suspended.', reactivate: 'Reactivated.' }[kind]) },
        onError: (err) => toast.error(err.message),
    })

    const items = list.data?.items || []
    const needsNote = action && ['reject', 'request-changes'].includes(action.kind)
    const [title, text, label, danger] = action ? ACTION_TEXT[action.kind] : []
    const pending = list.data?.pendingCount

    return (
        <AdminShell>
            <div className='mb-6'>
                <h1 className='font-display text-[24px] font-bold text-ink'>Online Assessment approvals</h1>
                <p className='text-[14px] text-text-secondary mt-1'>Review each organization before it can run assessments{pending ? ` · ${pending} waiting` : ''}.</p>
            </div>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4'>
                <div role='tablist' aria-label='Filter by status' className='flex gap-1 overflow-x-auto'>
                    {TABS.map(([value, name]) => (
                        <button key={name} role='tab' aria-selected={status === value} onClick={() => { setStatus(value); setPage(1) }}
                            className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap ${status === value ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>{name}</button>
                    ))}
                </div>
                <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search organization, name or email' className='lg:w-80' />
            </div>

            <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                {list.isError ? <ErrorState title='Could not load registrations' message={list.error.message} onRetry={list.refetch} /> : list.isLoading ? <TableSkeleton cols={4} /> : items.length === 0 ? (
                    <EmptyState icon={ClipboardCheck} title={status === 'PENDING' ? 'Nothing to review' : 'No registrations here'} description={status === 'PENDING' ? 'New Online Assessment registrations appear here for your approval.' : 'Try another status or search.'} />
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-[13.5px] min-w-[560px]'>
                            <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'><tr><th className='px-4 py-3'>Organization</th><th className='px-4 py-3'>Contact</th><th className='px-4 py-3'>Applied</th><th className='px-4 py-3'>Status</th><th className='px-4 py-3 text-right'>Actions</th></tr></thead>
                            <tbody className='divide-y divide-line'>
                                {items.map((a) => (
                                    <tr key={a.id} className='align-top'>
                                        <td className='px-4 py-3'><div className='font-semibold text-ink'>{a.orgName}</div>{a.purpose && <div className='text-[12px] text-text-secondary max-w-xs'>{a.purpose}</div>}</td>
                                        <td className='px-4 py-3'><div>{a.contactName}</div><div className='text-[12px] text-text-secondary'>{a.email}{a.phone ? ` · ${a.phone}` : ''}</div></td>
                                        <td className='px-4 py-3 whitespace-nowrap'>{formatDate(a.createdAt)}</td>
                                        <td className='px-4 py-3'><Badge variant={STATUS[a.status][0]}>{STATUS[a.status][1]}</Badge>{a.review?.note && <div className='text-[12px] text-text-secondary mt-1 max-w-[220px]'>{a.review.note}</div>}</td>
                                        <td className='px-4 py-3'>
                                            <div className='flex flex-col items-stretch sm:items-end gap-1.5 min-w-[130px]'>
                                                {a.status === 'PENDING' && <>
                                                    <Button size='xs' onClick={() => setAction({ account: a, kind: 'approve' })}><Check size={13} /> Approve</Button>
                                                    <Button size='xs' variant='secondary' onClick={() => setAction({ account: a, kind: 'request-changes' })}><MessageSquareWarning size={13} /> Ask for changes</Button>
                                                    <Button size='xs' variant='ghost' onClick={() => setAction({ account: a, kind: 'reject' })}><X size={13} /> Reject</Button>
                                                </>}
                                                {a.status === 'CHANGES_REQUESTED' && <Button size='xs' variant='ghost' onClick={() => setAction({ account: a, kind: 'reject' })}><X size={13} /> Reject</Button>}
                                                {a.status === 'ACTIVE' && <Button size='xs' variant='ghost' onClick={() => setAction({ account: a, kind: 'suspend' })}><PauseCircle size={13} /> Suspend</Button>}
                                                {a.status === 'SUSPENDED' && <Button size='xs' variant='secondary' onClick={() => setAction({ account: a, kind: 'reactivate' })}><PlayCircle size={13} /> Reactivate</Button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {list.data?.total > 0 && <Pagination page={page} pageSize={pageSize} total={list.data.total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} />}

            <Modal open={Boolean(action)} onClose={() => !decide.isPending && setAction(null)} title={title} size='sm'
                footer={<><Button variant='secondary' size='sm' disabled={decide.isPending} onClick={() => setAction(null)}>Cancel</Button>
                    <Button size='sm' variant={danger ? 'danger' : 'primary'} disabled={decide.isPending || (needsNote && !note.trim())} onClick={() => decide.mutate(action)}>{decide.isPending ? 'Working…' : label}</Button></>}>
                <p className='text-[14px] text-ink mb-1'><b>{action?.account.orgName}</b> · {action?.account.email}</p>
                <p className='text-[13.5px] text-text-secondary'>{text}</p>
                {needsNote && <label className='block mt-4'><span className='text-[12.5px] font-semibold text-ink'>{action.kind === 'reject' ? 'Reason' : 'What needs to change'}</span><textarea rows={3} autoFocus className={`${inputClass} mt-1.5`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></label>}
            </Modal>
        </AdminShell>
    )
}
