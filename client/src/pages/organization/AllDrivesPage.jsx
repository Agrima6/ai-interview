import React, { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Bot, ChevronRight, ClipboardCheck, Layers, Plus } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { Badge, Button, EmptyState, Pagination, SearchInput, Skeleton } from '../../components/ui'
import NewDriveModal from '../../components/oa/NewDriveModal'
import { listAllDrives } from '../../api/unifiedDrivesApi'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { formatDate } from '../../components/oa/oaFormat'

const KINDS = [['', 'All drives'], ['MULTI', 'Round-wise drives'], ['AI', 'AI interview only']]
const ROUND_TONE = {
    PUBLISHED: 'border-[var(--color-success)]/40 bg-[var(--color-success-soft)] text-[var(--color-success)]',
    ACTIVE: 'border-[var(--color-success)]/40 bg-[var(--color-success-soft)] text-[var(--color-success)]',
    ARCHIVED: 'border-[var(--color-danger)]/30 text-[var(--color-danger)]', CLOSED: 'border-[var(--color-danger)]/30 text-[var(--color-danger)]',
}
const STATE_LABEL = { DRAFT: 'Draft', PUBLISHED: 'Live', ACTIVE: 'Active', COMPLETED: 'Completed', CLOSED: 'Closed', ARCHIVED: 'Archived', PENDING: 'Not started' }

// One chip per round, so the whole drive reads at a glance: its order, what kind of round it is, and where it stands.
function RoundChip({ round }) {
    const Icon = round.kind === 'AI_INTERVIEW' ? Bot : ClipboardCheck
    const tone = ROUND_TONE[round.status] || 'border-line text-text-secondary bg-surface-muted'
    const state = round.status === 'PUBLISHED' && round.phase === 'ENDED' ? 'Ended' : STATE_LABEL[round.status] || round.status
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap ${tone}`} title={`Round ${round.number}: ${round.name} (${round.kind === 'AI_INTERVIEW' ? 'AI interview' : 'online test'}). ${state}. ${round.candidates} candidate${round.candidates === 1 ? '' : 's'}.`}>
            <Icon size={12} aria-hidden='true' /> R{round.number} · {round.kind === 'AI_INTERVIEW' ? 'AI' : 'Test'}
        </span>
    )
}

/** All the organization's drives in one place: round-wise drives (tests and AI interviews mixed) and classic AI interview drives. */
export default function AllDrivesPage() {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const prefix = pathname.startsWith('/platform/client') ? '/platform/client' : '/organization'
    const [params, setParams] = useSearchParams()
    const archived = params.get('archived') === '1'
    const kind = params.get('kind') || ''
    const page = Number(params.get('page')) || 1
    const pageSize = Number(params.get('pageSize')) || 25
    const [search, setSearch] = useState(params.get('search') || '')
    const q = useDebouncedValue(search)
    const [creating, setCreating] = useState(params.get('new') === '1')

    const update = (patch) => setParams((p) => { const next = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k))); return next }, { replace: true })
    const list = useQuery({ queryKey: ['unified-drives', { archived, kind, q, page, pageSize }], queryFn: () => listAllDrives({ archived: archived ? '1' : '', kind, search: q, page, pageSize }), placeholderData: keepPreviousData })
    const items = list.data?.items || []
    const openDrive = (d) => navigate(d.kind === 'MULTI' ? `${prefix}/drives/rounds/${d.id}` : `${prefix}/drives/${d.id}`)
    const closeNew = () => { setCreating(false); if (params.get('new')) update({ new: '' }) }

    return (
        <OrganizationLayout title='Drives' description='Every hiring drive in one place: online tests, AI interviews, or both as rounds of the same drive.' onSearch={(value) => setSearch(String(value || ''))}
            action={<Button size='sm' onClick={() => setCreating(true)}><Plus size={15} /> New drive</Button>}>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4'>
                <div className='flex flex-wrap items-center gap-3'>
                    <div role='tablist' aria-label='Status' className='flex gap-1'>
                        {[[false, 'Active'], [true, 'Archived']].map(([value, label]) => (
                            <button key={label} role='tab' aria-selected={archived === value} onClick={() => update({ archived: value ? '1' : '', page: '' })}
                                className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${archived === value ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>{label}</button>
                        ))}
                    </div>
                    <div role='group' aria-label='Type of drive' className='flex flex-wrap gap-1.5'>
                        {KINDS.map(([value, label]) => (
                            <button key={label} aria-pressed={kind === value} onClick={() => update({ kind: value, page: '' })}
                                className={`px-3 py-1.5 rounded-lg border text-[12.5px] font-semibold transition-colors ${kind === value ? 'border-accent bg-accent/[0.07] text-accent' : 'border-line text-text-secondary hover:border-accent/40'}`}>{label}</button>
                        ))}
                    </div>
                </div>
                <SearchInput value={search} onChange={(e) => { setSearch(e.target.value.slice(0, 80)); if (page > 1) update({ page: '' }) }} placeholder='Search drives' className='lg:w-72' />
            </div>

            <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                {list.isError ? (
                    <div role='alert' className='px-6 py-10 text-center'><p className='text-[15px] font-bold text-ink'>Could not load your drives</p><p className='text-[13px] text-text-secondary mt-1 mb-4'>{list.error.message}</p><Button size='sm' variant='secondary' onClick={() => list.refetch()}>Try again</Button></div>
                ) : list.isLoading ? (
                    <div className='p-5 space-y-3' aria-busy='true' aria-label='Loading drives'>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className='h-14 w-full rounded-xl' />)}</div>
                ) : items.length === 0 ? (
                    <EmptyState icon={Layers} title={search || kind || archived ? 'No drives match' : 'No drives yet'}
                        description={search || kind || archived ? 'Try a different search or filter.' : 'A drive holds one hiring campaign. Add rounds to it: online tests, AI interviews, or a mix.'}
                        actionLabel={search || kind || archived ? undefined : 'Create your first drive'} onAction={() => setCreating(true)} />
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-[13.5px] min-w-[820px]'>
                            <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'>
                                <tr><th className='px-4 py-3'>Drive</th><th className='px-4 py-3'>Rounds</th><th className='px-4 py-3 text-right'>Candidates</th><th className='px-4 py-3'>Status</th><th className='px-4 py-3'>Last updated</th><th className='px-2 py-3 w-8'><span className='sr-only'>Open</span></th></tr>
                            </thead>
                            <tbody className='divide-y divide-line'>
                                {items.map((d) => (
                                    <tr key={`${d.kind}-${d.id}`} className='ui-row group cursor-pointer' onClick={(e) => { if (!e.target.closest('a')) openDrive(d) }}>
                                        <td className='px-4 py-3 max-w-[320px]'>
                                            <Link to={d.kind === 'MULTI' ? `${prefix}/drives/rounds/${d.id}` : `${prefix}/drives/${d.id}`} className='font-semibold text-ink hover:text-accent break-words'>{d.title}</Link>
                                            <div className='text-[12px] text-text-secondary'>{d.kind === 'AI' && d.department ? `${d.department.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} · ` : ''}Created {formatDate(d.createdAt)}</div>
                                        </td>
                                        <td className='px-4 py-3'><div className='flex flex-wrap gap-1.5'>{d.rounds.map((r) => <RoundChip key={`${r.number}-${r.id || r.name}`} round={r} />)}{d.rounds.length === 0 && <span className='text-text-secondary'>No rounds yet</span>}</div></td>
                                        <td className='px-4 py-3 text-right tabular-nums'>{d.candidates}</td>
                                        <td className='px-4 py-3'><Badge variant={d.status === 'ARCHIVED' ? 'danger' : d.status === 'DRAFT' ? 'neutral' : 'success'}>{STATE_LABEL[d.status] || d.status}</Badge></td>
                                        <td className='px-4 py-3 whitespace-nowrap text-text-secondary'>{formatDate(d.updatedAt)}</td>
                                        <td className='px-2 py-3 text-text-secondary'><ChevronRight size={16} className='transition-transform group-hover:translate-x-0.5 group-hover:text-accent' aria-hidden='true' /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {list.data && list.data.total > 0 && <Pagination page={page} pageSize={pageSize} total={list.data.total} onPageChange={(p) => update({ page: p > 1 ? String(p) : '' })} onPageSizeChange={(s) => update({ pageSize: String(s), page: '' })} />}
            <p className='text-[12.5px] text-text-secondary mt-3'>Need the department, experience and date filters for AI interviews? <Link to={`${prefix}/interview-drives`} className='font-semibold text-accent hover:underline'>Open the detailed interview list</Link>.</p>

            <NewDriveModal open={creating} onClose={closeNew} onCreated={(d, o) => { closeNew(); navigate(`${prefix}/drives/rounds/${d.id}${o?.withAi ? '?ai=1' : ''}`) }} />
        </OrganizationLayout>
    )
}
