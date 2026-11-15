import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import Button from '../../components/Button'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { AssessmentStatus, ErrorState, PageHeader, PhaseBadge, TableSkeleton } from '../../components/oa/oaUi'
import { formatDateTime, inputClass } from '../../components/oa/oaFormat'

const STATUS_TABS = [['', 'Active'], ['DRAFT', 'Drafts'], ['PUBLISHED', 'Published'], ['ARCHIVED', 'Archived']]

export default function OaAssessmentsPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const queryClient = useQueryClient()
    const [params, setParams] = useSearchParams()
    const status = params.get('status') || ''
    const page = Number(params.get('page')) || 1
    const pageSize = Number(params.get('pageSize')) || 25
    const [search, setSearch] = useState('')
    const q = useDebouncedValue(search)
    const [creating, setCreating] = useState(params.get('new') === '1')
    const [title, setTitle] = useState('')
    const [titleError, setTitleError] = useState('')

    const update = (patch) => setParams((p) => { const next = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k))); return next }, { replace: true })

    const list = useQuery({ queryKey: ['oa', 'assessments', { status, q, page, pageSize }], queryFn: () => oaApi.listAssessments({ status, search: q, page, pageSize }), placeholderData: (prev) => prev })

    const create = useMutation({
        mutationFn: () => oaApi.createAssessment({ title }),
        onSuccess: (a) => { queryClient.invalidateQueries({ queryKey: ['oa'] }); navigate(`/oa/admin/assessments/${a.id}`) },
        onError: (err) => { setTitleError(err.fields?.title || err.message); toast.error(err.message) },
    })

    const items = list.data?.items || []

    return (
        <>
            <PageHeader title='Assessments' subtitle='Every test you run: build it, schedule it, and read the results.'
                actions={<Button size='sm' onClick={() => { setTitle(''); setTitleError(''); setCreating(true) }}><Plus size={15} /> New assessment</Button>} />

            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4'>
                <div role='tablist' aria-label='Filter by status' className='flex gap-1 overflow-x-auto'>
                    {STATUS_TABS.map(([value, label]) => (
                        <button key={label} role='tab' aria-selected={status === value} onClick={() => update({ status: value, page: '' })}
                            className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${status === value ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>{label}</button>
                    ))}
                </div>
                <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search assessments' className='lg:w-72' />
            </div>

            <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                {list.isError ? <ErrorState title='Could not load assessments' message={list.error.message} onRetry={list.refetch} /> : list.isLoading ? <TableSkeleton cols={5} /> : items.length === 0 ? (
                    <EmptyState icon={ClipboardList} title={q || status ? 'No assessments match' : 'No assessments yet'}
                        description={q || status ? 'Try a different search or status.' : 'Create your first assessment, add questions, upload students and schedule it.'}
                        actionLabel={q || status ? undefined : 'New assessment'} onAction={() => setCreating(true)} />
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-[13.5px] min-w-[760px]'>
                            <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'>
                                <tr><th className='px-4 py-3'>Assessment</th><th className='px-4 py-3'>Status</th><th className='px-4 py-3'>Starts</th><th className='px-4 py-3 text-right'>Questions</th><th className='px-4 py-3 text-right'>Students</th><th className='px-4 py-3 text-right'>Finished</th></tr>
                            </thead>
                            <tbody className='divide-y divide-line'>
                                {items.map((a) => (
                                    <tr key={a.id} className='hover:bg-black/[0.02]'>
                                        <td className='px-4 py-3'>
                                            <Link to={`/oa/admin/assessments/${a.id}`} className='font-semibold text-ink hover:text-accent'>{a.title}</Link>
                                            {a.roundLabel && <span className='ml-2 text-[11.5px] text-text-secondary'>{a.roundLabel}</span>}
                                            <div className='text-[12px] text-text-secondary'>Created {formatDateTime(a.createdAt)}</div>
                                        </td>
                                        <td className='px-4 py-3'><div className='flex flex-wrap gap-1.5'><AssessmentStatus status={a.status} />{a.status === 'PUBLISHED' && <PhaseBadge phase={a.phase} />}</div></td>
                                        <td className='px-4 py-3 whitespace-nowrap'>{a.schedule?.startAt ? formatDateTime(a.schedule.startAt, a.schedule.timezone) : <span className='text-text-secondary'>Not scheduled</span>}</td>
                                        <td className='px-4 py-3 text-right tabular-nums'>{a.questionCount}</td>
                                        <td className='px-4 py-3 text-right tabular-nums'>{a.stats.students}</td>
                                        <td className='px-4 py-3 text-right tabular-nums'>{a.stats.finished}</td>
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

            <Modal open={creating} onClose={() => setCreating(false)} title='New assessment' size='sm'
                footer={<><Button variant='secondary' size='sm' onClick={() => setCreating(false)}>Cancel</Button><Button size='sm' disabled={create.isPending || title.trim().length < 3} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create'}</Button></>}>
                <form onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 3 && !create.isPending) create.mutate() }}>
                    <label htmlFor='oa-title' className='block text-[13.5px] font-semibold text-ink mb-2'>Name of the test</label>
                    <input id='oa-title' autoFocus className={inputClass} value={title} onChange={(e) => { setTitle(e.target.value); setTitleError('') }} placeholder='e.g. Campus Drive 2026 · Round 1' maxLength={140} />
                    {titleError && <p className='text-[12px] text-red-500 mt-2'>{titleError}</p>}
                    <p className='text-[12.5px] text-text-secondary mt-3'>You will add sections, questions, students and the schedule next.</p>
                </form>
            </Modal>
        </>
    )
}
