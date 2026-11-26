import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import { Badge, Button, EmptyState, Pagination, SearchInput, Skeleton } from '../../components/ui'
import { listDeletedDrives } from '../../api/adminDrivesApi'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { formatWhen, num } from '../billing/billingFormat'

const KIND = { AI: 'AI interview', MULTI: 'Round-wise drive' }

/** Every drive an organization has deleted. They are hidden from the organization (which can restore them), never from the platform. */
export default function DeletedDrivesPage() {
    const [params, setParams] = useSearchParams()
    const page = Number(params.get('page')) || 1
    const pageSize = Number(params.get('pageSize')) || 25
    const [search, setSearch] = useState(params.get('search') || '')
    const q = useDebouncedValue(search)
    const update = (patch) => setParams((p) => { const next = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k))); return next }, { replace: true })
    const list = useQuery({ queryKey: ['admin', 'deleted-drives', { q, page, pageSize }], queryFn: () => listDeletedDrives({ search: q, page, pageSize }), placeholderData: keepPreviousData })
    const items = list.data?.items || []

    return (
        <AdminShell>
            <div className='max-w-[1180px] mx-auto'>
                <header className='mb-5'>
                    <h1 className='font-display text-[26px] font-bold text-ink'>Deleted drives</h1>
                    <p className='text-[14px] text-text-secondary mt-0.5'>Drives that organizations have deleted. They are hidden from the organization, which can restore them. Candidates and the invitations already billed are kept.</p>
                </header>
                <div className='mb-3'><SearchInput value={search} onChange={(e) => { setSearch(e.target.value.slice(0, 80)); if (page > 1) update({ page: '' }) }} placeholder='Search drive, organization or who deleted it' className='sm:w-80' /></div>
                <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                    {list.isError ? (
                        <div role='alert' className='px-6 py-10 text-center'><p className='text-[15px] font-bold text-ink'>Could not load deleted drives</p><p className='text-[13px] text-text-secondary mt-1 mb-4'>{list.error.message}</p><Button size='sm' variant='secondary' onClick={() => list.refetch()}>Try again</Button></div>
                    ) : list.isLoading ? (
                        <div className='p-5 space-y-3' aria-busy='true'>{[0, 1, 2].map((i) => <Skeleton key={i} className='h-12 w-full rounded-xl' />)}</div>
                    ) : items.length === 0 ? (
                        <EmptyState icon={Trash2} title={search ? 'No deleted drives match' : 'No deleted drives'} description={search ? 'Try a different search.' : 'When an organization deletes a drive it appears here.'} />
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full text-[13.5px] min-w-[860px]'>
                                <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'>
                                    <tr><th className='px-4 py-3'>Drive</th><th className='px-4 py-3'>Organization</th><th className='px-4 py-3'>Deleted</th><th className='px-4 py-3'>Deleted by</th><th className='px-4 py-3 text-right'>Candidates</th><th className='px-4 py-3 text-right'>Invitations sent</th></tr>
                                </thead>
                                <tbody className='divide-y divide-line'>
                                    {items.map((d) => (
                                        <tr key={`${d.kind}-${d.id}`}>
                                            <td className='px-4 py-3 max-w-[300px]'><div className='font-semibold text-ink break-words'>{d.title}</div><Badge variant='neutral'>{KIND[d.kind] || d.kind}</Badge></td>
                                            <td className='px-4 py-3'>{d.organization}</td>
                                            <td className='px-4 py-3 whitespace-nowrap text-text-secondary'>{formatWhen(d.deletedAt)}</td>
                                            <td className='px-4 py-3 text-text-secondary break-all'>{d.deletedBy || '—'}</td>
                                            <td className='px-4 py-3 text-right tabular-nums'>{num(d.candidates)}</td>
                                            <td className='px-4 py-3 text-right tabular-nums'>{num(d.invitationsSent)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {list.data && list.data.total > 0 && <Pagination page={page} pageSize={pageSize} total={list.data.total} onPageChange={(p) => update({ page: p > 1 ? String(p) : '' })} onPageSizeChange={(s) => update({ pageSize: String(s), page: '' })} />}
            </div>
        </AdminShell>
    )
}
