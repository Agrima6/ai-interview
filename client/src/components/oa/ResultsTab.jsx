import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, FlagTriangleRight, Trophy } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import Badge from '../ui/Badge'
import Button from '../Button'
import EmptyState from '../ui/EmptyState'
import Pagination from '../ui/Pagination'
import SearchInput from '../ui/SearchInput'
import { useToast } from '../ui/Toast'
import AttemptDrawer from './AttemptDrawer'
import AiInvitePanel from './AiInvitePanel'
import { AttemptStatus, ErrorState, TableSkeleton } from './oaUi'
import { formatDay, formatDuration, formatTime, inputClass } from './oaFormat'

const STATUSES = [['', 'All statuses'], ['SUBMITTED', 'Submitted'], ['AUTO_SUBMITTED', 'Time up'], ['TERMINATED', 'Ended by proctor'], ['IN_PROGRESS', 'In progress'], ['NOT_STARTED', 'Not started']]

// `onNextRound` is given by the drive page: it opens "Add a round" with the qualifiers of this round preselected.
export default function ResultsTab({ assessment: a, onNextRound }) {
    const toast = useToast()
    const [params, setParams] = useSearchParams()
    const get = (k) => params.get(k) || ''
    const [search, setSearch] = useState('')
    const q = useDebouncedValue(search)
    const filters = { search: q, status: get('rstatus'), result: get('rresult'), flagged: get('rflag'), minPercent: get('rmin') }
    const page = Number(get('rpage')) || 1
    const pageSize = Number(get('rsize')) || 25
    const [open, setOpen] = useState(null)
    const [exporting, setExporting] = useState(false)
    const slotted = a.schedule?.mode === 'SLOTS'

    const update = (patch) => setParams((p) => { const n = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); n.delete('rpage'); return n }, { replace: true })

    const results = useQuery({ queryKey: ['oa', 'assessment', a.id, 'results', filters, page, pageSize], queryFn: () => oaApi.results(a.id, { ...filters, page, pageSize }), placeholderData: (p) => p })
    const s = results.data?.summary
    const items = results.data?.items || []
    const activeFilters = Object.values(filters).filter(Boolean).length

    const exportCsv = async () => {
        setExporting(true)
        try { await oaApi.exportResults(a.id, filters); toast.success(activeFilters ? 'Downloaded the filtered results.' : 'Downloaded all results.') } catch (err) { toast.error(err.message) } finally { setExporting(false) }
    }

    return (
        <>
            <AiInvitePanel assessment={a} />
            {s && (
                <dl className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-card border border-line rounded-2xl divide-x divide-y lg:divide-y-0 divide-line mb-5'>
                    {[['Invited', s.invited], ['Finished', s.finished], ['Passed', s.passed], ['Average', s.average === null ? '—' : `${s.average}%`], ['Highest', s.highest === null ? '—' : `${s.highest}%`], ['To grade', s.pendingReview]].map(([label, value]) => (
                        <div key={label} className='px-4 py-3.5'><dt className='text-[12px] font-semibold text-text-secondary'>{label}</dt><dd className='text-[21px] font-display font-bold text-ink tabular-nums'>{value}</dd></div>
                    ))}
                </dl>
            )}
            {s?.pendingReview > 0 && <p role='status' className='mb-4 text-[13px] bg-[var(--color-warning-soft)] text-[var(--color-warning)] rounded-xl px-4 py-2.5'>{s.pendingReview} attempt{s.pendingReview === 1 ? ' has' : 's have'} long answers or code waiting for your marks. Ranks are provisional until they are graded.</p>}

            <div className='flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4'>
                <div className='flex flex-wrap items-center gap-2'>
                    <SearchInput value={search} onChange={(e) => { setSearch(e.target.value.replace(/[^\p{L}\p{M}\d\s.@_'/+-]/gu, '').slice(0, 80)); setParams((p) => { const n = new URLSearchParams(p); n.delete('rpage'); return n }, { replace: true }) }} placeholder='Search name, email or roll no.' className='w-full sm:w-64' />
                    <select aria-label='Status' className={`${inputClass} !w-auto`} value={filters.status} onChange={(e) => update({ rstatus: e.target.value })}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                    <select aria-label='Result' className={`${inputClass} !w-auto`} value={filters.result} onChange={(e) => update({ rresult: e.target.value })}><option value=''>Pass and fail</option><option value='PASSED'>Passed</option><option value='FAILED'>Not passed</option></select>
                    <input inputMode='numeric' aria-label='Minimum percent' placeholder='Min %' maxLength={3} className={`${inputClass} !w-24`} value={filters.minPercent} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 3); update({ rmin: v && Number(v) > 100 ? '100' : v }) }} />
                    <label className='flex items-center gap-1.5 text-[13px] text-ink px-2'><input type='checkbox' className='accent-[var(--color-accent)]' checked={filters.flagged === 'true'} onChange={(e) => update({ rflag: e.target.checked ? 'true' : '' })} /> Flagged only</label>
                    {activeFilters > 0 && <button className='text-[13px] font-semibold text-accent' onClick={() => { setSearch(''); setParams((p) => { const n = new URLSearchParams(p); ['rstatus', 'rresult', 'rflag', 'rmin', 'rpage'].forEach((k) => n.delete(k)); return n }, { replace: true }) }}>Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}</button>}
                </div>
                <div className='flex gap-2'>
                    <Button size='sm' variant='secondary' disabled={exporting} onClick={exportCsv}><Download size={14} /> {exporting ? 'Preparing…' : activeFilters ? 'Export filtered' : 'Export CSV'}</Button>
                    {onNextRound && <Button size='sm' onClick={onNextRound}><Trophy size={14} /> Move qualifiers to next round</Button>}
                </div>
            </div>

            <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                {results.isError ? <ErrorState title='Could not load results' message={results.error.message} onRetry={results.refetch} /> : results.isLoading ? <TableSkeleton cols={7} /> : items.length === 0 ? (
                    <EmptyState icon={Trophy} compact title={activeFilters ? 'No one matches these filters' : 'No results yet'} description={activeFilters ? 'Loosen a filter to see more.' : 'Results appear here as candidates finish.'} />
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-[13.5px] min-w-[900px]'>
                            <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary sticky top-0'><tr><th className='px-4 py-3 w-16'>Rank</th><th className='px-4 py-3'>Candidate</th><th className='px-4 py-3'>Status</th>{slotted && <th className='px-4 py-3'>Slot</th>}<th className='px-4 py-3 text-right'>Score</th><th className='px-4 py-3 text-right'>%</th><th className='px-4 py-3'>Result</th><th className='px-4 py-3 text-right'>Flags</th><th className='px-4 py-3 text-right'>Time</th></tr></thead>
                            <tbody className='divide-y divide-line'>
                                {items.map((r) => (
                                    <tr key={r.studentId} className={`hover:bg-black/[0.02] ${r.attemptId ? 'cursor-pointer' : ''}`} onClick={() => r.attemptId && setOpen(r.attemptId)}>
                                        <td className='px-4 py-3 font-bold tabular-nums'>{r.rank ?? '—'}</td>
                                        <td className='px-4 py-3'>
                                            {r.attemptId ? <button className='font-semibold text-ink hover:text-accent text-left' onClick={(e) => { e.stopPropagation(); setOpen(r.attemptId) }}>{r.name}</button> : <span className='font-semibold text-ink'>{r.name}</span>}
                                            <div className='text-[12px] text-text-secondary'>{r.rollNumber || r.email}</div>
                                        </td>
                                        <td className='px-4 py-3'><AttemptStatus status={r.status} />{r.adminDecision && <div className='mt-1'><Badge variant={r.adminDecision === 'DISQUALIFIED' ? 'danger' : 'info'}>{r.adminDecision === 'DISQUALIFIED' ? 'Disqualified' : 'Cleared'}</Badge></div>}</td>
                                        {slotted && <td className='px-4 py-3 whitespace-nowrap text-[13px]'>{r.slotStartAt ? `${formatDay(r.slotStartAt, a.schedule.timezone)}, ${formatTime(r.slotStartAt, a.schedule.timezone)}` : <span className='text-text-secondary'>—</span>}</td>}
                                        <td className='px-4 py-3 text-right tabular-nums'>{r.score === null ? '—' : `${r.score}/${r.maxScore}`}{r.gradingStatus === 'PENDING_REVIEW' && <span className='block text-[11px] text-[var(--color-warning)] font-semibold'>to grade</span>}{r.aiInvite && <span className={`block text-[11px] font-semibold ${r.aiInvite === 'FAILED' ? 'text-[var(--color-danger)]' : 'text-text-secondary'}`}>{{ SENT: 'AI interview invited', ALREADY: 'Already on AI interview', FAILED: 'AI invite failed', SENDING: 'Inviting…' }[r.aiInvite]}</span>}</td>
                                        <td className='px-4 py-3 text-right tabular-nums font-semibold'>{r.percent === null ? '—' : `${r.percent}%`}</td>
                                        <td className='px-4 py-3'>{r.passed === null ? <span className='text-text-secondary'>—</span> : <Badge variant={r.passed ? 'success' : 'danger'}>{r.passed ? 'Passed' : 'Not passed'}</Badge>}</td>
                                        <td className='px-4 py-3 text-right'>{r.violationCount > 0 ? <span className='inline-flex items-center gap-1 font-semibold text-[var(--color-danger)]'><FlagTriangleRight size={13} />{r.violationCount}</span> : <span className='text-text-secondary'>0</span>}</td>
                                        <td className='px-4 py-3 text-right tabular-nums text-text-secondary'>{formatDuration(r.timeTakenSec)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {results.data?.total > 0 && <Pagination page={page} pageSize={pageSize} total={results.data.total} onPageChange={(p) => setParams((x) => { const n = new URLSearchParams(x); p > 1 ? n.set('rpage', String(p)) : n.delete('rpage'); return n }, { replace: true })} onPageSizeChange={(sz) => update({ rsize: String(sz) })} />}

            <AttemptDrawer key={open || 'closed'} assessmentId={a.id} attemptId={open} onClose={() => setOpen(null)} />
        </>
    )
}
