import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ShieldCheck, X } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import Button from '../Button'
import ConfirmModal from '../ui/ConfirmModal'
import Pagination from '../ui/Pagination'
import { useToast } from '../ui/Toast'
import { ErrorState } from './oaUi'
import { formatDateTime } from './oaFormat'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * People who registered through the open link. They stay here until the organizer approves them: nothing is emailed
 * and they cannot sign in before then. Approving emails the invitation (when the round is published); rejecting keeps
 * them out. A rejected person can still be approved later.
 */
export default function RegistrationQueue({ assessment: a }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [tab, setTab] = useState('PENDING')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [picked, setPicked] = useState(() => new Set())
    const [confirm, setConfirm] = useState(null)       // { decision, ids }
    const published = a.status === 'PUBLISHED' && a.phase !== 'ENDED'
    const waiting = a.stats?.pending || 0
    const open = Boolean(a.registration?.enabled)

    const list = useQuery({ queryKey: ['oa', 'assessment', a.id, 'students', { approval: tab, page, pageSize }], queryFn: () => oaApi.listStudents(a.id, { approval: tab, page, pageSize }), placeholderData: (p) => p, enabled: waiting > 0 || open || tab === 'REJECTED' })
    const decide = useMutation({
        mutationFn: ({ decision, ids }) => oaApi.decideStudents(a.id, { decision, studentIds: ids }),
        onSuccess: (r) => {
            queryClient.invalidateQueries({ queryKey: ['oa'] })
            setConfirm(null); setPicked(new Set())
            if (r.decision === 'REJECT') toast.success(`${plural(r.decided, 'registration')} rejected.`)
            else if (r.invited) toast.success(r.invited.failed?.length ? `${r.decided} approved. ${r.invited.sent} emailed, ${r.invited.failed.length} could not be emailed (copy their codes from the list).` : `${plural(r.decided, 'candidate')} approved and emailed their access code.`)
            else toast.success(`${plural(r.decided, 'candidate')} approved. They are emailed when you publish the round and send invitations.`)
        },
        onError: (err) => { setConfirm(null); toast.error(err.message) },
    })

    if (waiting === 0 && !open && tab === 'PENDING') return null
    const items = list.data?.items || []
    const allOnPage = items.length > 0 && items.every((s) => picked.has(s.id))
    const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
    const toggleAll = () => setPicked((p) => { const n = new Set(p); items.forEach((s) => (allOnPage ? n.delete(s.id) : n.add(s.id))); return n })
    const chosen = [...picked]

    return (
        <section className='mb-5 bg-card border border-line rounded-2xl overflow-hidden' aria-label='Registrations waiting for approval'>
            <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-line'>
                <div className='flex items-center gap-3 min-w-0'>
                    <span className='w-10 h-10 shrink-0 rounded-xl bg-[var(--color-warning-soft)] text-[var(--color-warning)] flex items-center justify-center' aria-hidden='true'><ShieldCheck size={18} /></span>
                    <div className='min-w-0'>
                        <h3 className='text-[15px] font-bold text-ink'>{waiting > 0 ? `${plural(waiting, 'registration')} waiting for your approval` : 'Registrations from the open link'}</h3>
                        <p className='text-[12.5px] text-text-secondary'>{waiting > 0 ? 'Nothing is emailed until you approve. Approved candidates get their access code by email.' : 'People who register themselves appear here for you to approve.'}</p>
                    </div>
                </div>
                <div role='tablist' aria-label='Registration list' className='flex gap-1'>
                    {[['PENDING', 'Waiting'], ['REJECTED', 'Rejected']].map(([value, label]) => (
                        <button key={value} role='tab' aria-selected={tab === value} onClick={() => { setTab(value); setPage(1); setPicked(new Set()) }}
                            className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold ${tab === value ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>{label}</button>
                    ))}
                </div>
            </div>

            {chosen.length > 0 && (
                <div className='flex flex-wrap items-center gap-2 px-5 py-2.5 bg-surface-muted border-b border-line' role='toolbar' aria-label='Actions for the selected registrations'>
                    <span className='text-[13px] font-semibold text-ink mr-1'>{chosen.length} selected</span>
                    <Button size='xs' disabled={decide.isPending} onClick={() => setConfirm({ decision: 'APPROVE', ids: chosen })}><Check size={13} /> Approve{published ? ' & email' : ''}</Button>
                    {tab === 'PENDING' && <Button size='xs' variant='secondary' disabled={decide.isPending} onClick={() => setConfirm({ decision: 'REJECT', ids: chosen })}><X size={13} /> Reject</Button>}
                    <button className='text-[12.5px] font-semibold text-text-secondary hover:text-ink ml-auto' onClick={() => setPicked(new Set())}>Clear selection</button>
                </div>
            )}

            {list.isError ? <ErrorState title='Could not load registrations' message={list.error.message} onRetry={list.refetch} /> : items.length === 0 ? (
                <p className='px-5 py-6 text-[13.5px] text-text-secondary'>{list.isLoading ? 'Loading…' : tab === 'PENDING' ? 'No one is waiting. New registrations will show up here.' : 'No rejected registrations.'}</p>
            ) : (
                <div className='overflow-x-auto'>
                    <table className='w-full text-[13.5px] min-w-[640px]'>
                        <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'>
                            <tr>
                                <th className='px-5 py-2.5 w-10'><input type='checkbox' aria-label='Select everyone on this page' checked={allOnPage} onChange={toggleAll} className='w-4 h-4 accent-[var(--color-accent)]' /></th>
                                <th className='px-3 py-2.5'>Candidate</th><th className='px-3 py-2.5'>Phone</th><th className='px-3 py-2.5'>Registered</th><th className='px-3 py-2.5 text-right'>Decision</th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-line'>
                            {items.map((s) => (
                                <tr key={s.id} className='ui-row'>
                                    <td className='px-5 py-3'><input type='checkbox' aria-label={`Select ${s.name}`} checked={picked.has(s.id)} onChange={() => toggle(s.id)} className='w-4 h-4 accent-[var(--color-accent)]' /></td>
                                    <td className='px-3 py-3'><div className='font-semibold text-ink'>{s.name}</div><div className='text-[12px] text-text-secondary'>{s.email}{s.rollNumber ? ` · ${s.rollNumber}` : ''}</div></td>
                                    <td className='px-3 py-3'>{s.phone || '—'}</td>
                                    <td className='px-3 py-3 whitespace-nowrap text-text-secondary'>{s.approval?.registeredAt ? formatDateTime(s.approval.registeredAt) : '—'}</td>
                                    <td className='px-3 py-3 whitespace-nowrap text-right'>
                                        <Button size='xs' disabled={decide.isPending} onClick={() => setConfirm({ decision: 'APPROVE', ids: [s.id] })}><Check size={13} /> Approve</Button>
                                        {tab === 'PENDING' && <Button size='xs' variant='ghost' className='ml-1' disabled={decide.isPending} onClick={() => setConfirm({ decision: 'REJECT', ids: [s.id] })}><X size={13} /> Reject</Button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {list.data?.total > pageSize && <Pagination page={page} pageSize={pageSize} total={list.data.total} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />}

            <ConfirmModal open={Boolean(confirm)} onClose={() => !decide.isPending && setConfirm(null)} danger={confirm?.decision === 'REJECT'}
                title={confirm?.decision === 'REJECT' ? `Reject ${plural(confirm?.ids.length || 0, 'registration')}?` : `Approve ${plural(confirm?.ids.length || 0, 'candidate')}?`}
                confirmLabel={confirm?.decision === 'REJECT' ? 'Reject' : published ? 'Approve & email' : 'Approve'}
                onConfirm={() => decide.mutateAsync(confirm).catch(() => {})}>
                {confirm?.decision === 'REJECT'
                    ? 'They will not be able to sit this round and no email is sent. You can still approve a rejected registration later.'
                    : published ? 'Each approved candidate is emailed their personal access code and the link to the test right away.' : 'They join the candidate list. Because this round is not published yet, they are emailed with everyone else when you publish and send invitations.'}
            </ConfirmModal>
        </section>
    )
}
