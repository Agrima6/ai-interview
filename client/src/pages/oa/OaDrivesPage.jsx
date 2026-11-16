import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, ChevronRight, ClipboardCheck, Layers, Plus } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import Button from '../../components/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { ErrorState, PageHeader, TableSkeleton } from '../../components/oa/oaUi'
import { formatDate, formatDateTime } from '../../components/oa/oaFormat'
import { TextField } from '../../components/oa/oaFields'
import { FILTERS, LIMITS, lengthError } from '../../components/oa/oaRules'

const STATUS_TABS = [['', 'Active'], ['ARCHIVED', 'Archived']]

// One chip per round, so the whole drive reads at a glance: number, kind and where it stands.
function RoundChip({ round }) {
    const live = ['OPEN', 'CLOSED_TO_ENTRY'].includes(round.phase)
    const tone = round.status === 'ARCHIVED' ? 'border-[var(--color-danger)]/30 text-[var(--color-danger)]'
        : live || round.status === 'PUBLISHED' ? 'border-[var(--color-success)]/40 text-[var(--color-success)] bg-[var(--color-success-soft)]'
            : 'border-line text-text-secondary bg-surface-muted'
    const Icon = round.kind === 'AI_INTERVIEW' ? Bot : ClipboardCheck
    const state = round.kind === 'AI_INTERVIEW' ? 'AI interview' : round.status === 'DRAFT' ? 'Draft' : round.status === 'ARCHIVED' ? 'Archived' : live ? 'Live' : round.phase === 'ENDED' ? 'Ended' : 'Published'
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap ${tone}`} title={`Round ${round.roundNumber}${round.name ? ` · ${round.name}` : ''}: ${state}`}>
            <Icon size={12} aria-hidden='true' /> R{round.roundNumber} · {state}
        </span>
    )
}

export default function OaDrivesPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const queryClient = useQueryClient()
    const [params, setParams] = useSearchParams()
    const status = params.get('status') === 'ARCHIVED' ? 'ARCHIVED' : ''
    const page = Number(params.get('page')) || 1
    const pageSize = Number(params.get('pageSize')) || 10
    const [search, setSearch] = useState('')
    const q = useDebouncedValue(search)
    const [creating, setCreating] = useState(params.get('new') === '1')
    const [title, setTitle] = useState('')
    const [titleError, setTitleError] = useState('')

    const update = (patch) => setParams((p) => { const next = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k))); return next }, { replace: true })

    const list = useQuery({ queryKey: ['oa', 'drives', { status, q, page, pageSize }], queryFn: () => oaApi.listDrives({ status, search: q, page, pageSize }), placeholderData: (prev) => prev })

    const create = useMutation({
        mutationFn: () => oaApi.createDrive({ title: title.trim() }),
        onSuccess: (d) => { queryClient.invalidateQueries({ queryKey: ['oa'] }); toast.success('Drive created. Start with step 1: add questions.'); navigate(`/oa/admin/drives/${d.id}`) },
        onError: (err) => { setTitleError(err.fields?.title || err.message); toast.error(err.message) },
    })
    const nameProblem = lengthError(title, { ...LIMITS.title, label: 'The name' })
    const openCreate = () => { setTitle(''); setTitleError(''); setCreating(true) }
    const closeCreate = () => { setCreating(false); if (params.get('new')) update({ new: '' }) }

    const items = list.data?.items || []
    const filtered = Boolean(q || status)

    return (
        <>
            <PageHeader title='Drives' subtitle='One drive per hiring campaign. Each drive runs round by round: Round 1, Round 2 and so on.'
                actions={<Button size='sm' className='oa-press' onClick={openCreate}><Plus size={15} /> New drive</Button>} />

            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4'>
                <div role='tablist' aria-label='Filter by status' className='flex gap-1'>
                    {STATUS_TABS.map(([value, label]) => (
                        <button key={label} role='tab' aria-selected={status === value} onClick={() => update({ status: value, page: '' })}
                            className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${status === value ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>{label}</button>
                    ))}
                </div>
                <SearchInput value={search} onChange={(e) => { setSearch(FILTERS.title(e.target.value).slice(0, 80)); if (page > 1) update({ page: '' }) }} placeholder='Search drives' className='sm:w-72' />
            </div>

            <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                {list.isError ? <ErrorState title='Could not load your drives' message={list.error.message} onRetry={list.refetch} /> : list.isLoading ? <TableSkeleton cols={5} /> : items.length === 0 ? (
                    <EmptyState icon={Layers} title={filtered ? 'No drives match' : 'No drives yet'}
                        description={filtered ? 'Try a different search, or look under the other status.' : 'A drive holds everything for one hiring campaign: the rounds, the questions, the candidates and the results.'}
                        actionLabel={filtered ? undefined : 'Create your first drive'} onAction={openCreate} />
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-[13.5px] min-w-[760px]'>
                            <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'>
                                <tr><th className='px-4 py-3'>Drive</th><th className='px-4 py-3'>Status</th><th className='px-4 py-3'>Rounds</th><th className='px-4 py-3 text-right'>Candidates</th><th className='px-4 py-3'>Last updated</th><th className='px-2 py-3 w-8'><span className='sr-only'>Open</span></th></tr>
                            </thead>
                            <tbody className='divide-y divide-line'>
                                {items.map((d, i) => (
                                    <tr key={d.id} className='ui-row group cursor-pointer oa-rise' style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                                        onClick={(e) => { if (!e.target.closest('a')) navigate(`/oa/admin/drives/${d.id}`) }}>
                                        <td className='px-4 py-3 max-w-[320px]'>
                                            <Link to={`/oa/admin/drives/${d.id}`} className='font-semibold text-ink hover:text-accent break-words'>{d.title}</Link>
                                            <div className='text-[12px] text-text-secondary' title={formatDateTime(d.createdAt)}>Created {formatDate(d.createdAt)}</div>
                                        </td>
                                        <td className='px-4 py-3'><Badge variant={d.status === 'ARCHIVED' ? 'danger' : 'success'}>{d.status === 'ARCHIVED' ? 'Archived' : 'Active'}</Badge></td>
                                        <td className='px-4 py-3'><div className='flex flex-wrap gap-1.5'>{d.rounds.map((r) => <RoundChip key={r.id} round={r} />)}</div></td>
                                        <td className='px-4 py-3 text-right tabular-nums'>{d.candidates}</td>
                                        <td className='px-4 py-3 whitespace-nowrap text-text-secondary' title={formatDateTime(d.updatedAt)}>{formatDate(d.updatedAt)}</td>
                                        <td className='px-2 py-3 text-text-secondary'><ChevronRight size={16} className='transition-transform group-hover:translate-x-0.5 group-hover:text-accent' aria-hidden='true' /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {list.data && list.data.total > 0 && (
                <Pagination page={page} pageSize={pageSize} total={list.data.total} onPageChange={(p) => update({ page: p > 1 ? String(p) : '' })} onPageSizeChange={(s) => update({ pageSize: String(s), page: '' })} />
            )}

            <Modal open={creating} onClose={closeCreate} title='New drive' size='sm'
                footer={<><Button variant='secondary' size='sm' onClick={closeCreate}>Cancel</Button><Button size='sm' disabled={create.isPending || Boolean(nameProblem)} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create drive'}</Button></>}>
                <form onSubmit={(e) => { e.preventDefault(); if (!nameProblem && !create.isPending) create.mutate() }}>
                    <TextField autoFocus label='Name of the drive' filter={FILTERS.title} value={title} onChange={(v) => { setTitle(v); setTitleError('') }} max={LIMITS.title.max} error={titleError || (title ? nameProblem : '')} placeholder='e.g. Campus Hiring 2026' />
                    <p className='text-[12.5px] text-text-secondary mt-3'>Round 1 is created for you. Next you add questions, then candidates, then the schedule.</p>
                </form>
            </Modal>
        </>
    )
}
