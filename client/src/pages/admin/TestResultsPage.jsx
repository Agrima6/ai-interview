import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, ShieldAlert } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import AttemptDrawer from '../../components/oa/AttemptDrawer'
import { AttemptStatus } from '../../components/oa/oaUi'
import { Badge, EmptyState, Pagination, SearchInput, Select, Skeleton } from '../../components/ui'
import { adminResultsApi } from '../../api/adminResultsApi'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { formatDuration } from '../../components/oa/oaFormat'
import { num } from '../billing/billingFormat'

const VERDICT = {
    NORMAL: ['success', 'Looks normal', CheckCircle2],
    WATCH: ['warning', 'Worth a look', AlertTriangle],
    CONCERN: ['danger', 'Needs checking', ShieldAlert],
    TOO_FEW: ['neutral', 'Too few candidates to judge', AlertTriangle],
}
const NOTE_TONE = { ok: 'text-[var(--color-success)]', watch: 'text-[var(--color-warning)]', concern: 'text-[var(--color-danger)]' }
const GRADING = { PENDING_REVIEW: ['warning', 'Needs marking'], COMPLETE: ['success', 'Marked'], NOT_GRADED: ['neutral', 'Not graded'] }
const RESULTS = [['', 'All results'], ['PASSED', 'Passed'], ['FAILED', 'Not passed']]
const STATUSES = [['', 'All statuses'], ['SUBMITTED', 'Submitted'], ['AUTO_SUBMITTED', 'Time up'], ['TERMINATED', 'Ended by proctor'], ['IN_PROGRESS', 'In progress'], ['NOT_STARTED', 'Not started']]

function Stat({ label, value, hint, tone = 'text-ink' }) {
    return <div className='px-4 py-3 min-w-0'><dt className='text-[12px] font-semibold text-text-secondary'>{label}</dt><dd className={`font-display text-[22px] leading-tight font-bold tabular-nums ${tone}`}>{value}</dd>{hint && <p className='text-[11.5px] text-text-secondary'>{hint}</p>}</div>
}

function SortHead({ label, field, sort, onSort, align = 'left' }) {
    const on = sort.by === field
    return (
        <th scope='col' aria-sort={on ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-3 whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}>
            <button type='button' onClick={() => onSort(field)} className={`inline-flex items-center gap-1 font-semibold hover:text-ink ${on ? 'text-ink' : 'text-text-secondary'}`}>{label}{on && (sort.order === 'asc' ? <ArrowUp size={12} aria-hidden='true' /> : <ArrowDown size={12} aria-hidden='true' />)}</button>
        </th>
    )
}

// ---------- Results ----------

function ResultsPanel({ test, params, update, onOpen }) {
    const [search, setSearch] = useState(params.get('q') || '')
    const q = useDebouncedValue(search)
    const sort = { by: params.get('by') || 'percent', order: params.get('order') || 'desc' }
    const filters = { search: q, status: params.get('status') || '', result: params.get('result') || '', flagged: params.get('flag') || '', minPercent: params.get('min') || '' }
    const page = Number(params.get('page')) || 1
    const pageSize = Number(params.get('size')) || 25
    const list = useQuery({ queryKey: ['admin', 'test-results', test, filters, sort, page, pageSize], queryFn: () => adminResultsApi.results(test, { ...filters, sortBy: sort.by, order: sort.order, page, pageSize }), placeholderData: keepPreviousData })
    const s = list.data?.meta?.summary
    const items = list.data?.items || []
    const onSort = (field) => update({ by: field, order: sort.by === field && sort.order === 'desc' ? 'asc' : 'desc', page: '' })
    return (
        <>
            {s && (
                <dl className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-card border border-line rounded-2xl divide-x divide-y lg:divide-y-0 divide-line mb-4'>
                    <Stat label='Invited' value={num(s.invited)} hint={`${num(s.notStarted)} not started`} />
                    <Stat label='Finished' value={num(s.finished)} hint={`${num(s.terminated)} ended by proctor`} />
                    <Stat label='Passed' value={num(s.passed)} hint={`pass mark ${s.passPercent}%`} tone='text-[var(--color-success)]' />
                    <Stat label='Average' value={s.average === null ? '—' : `${s.average}%`} />
                    <Stat label='Highest' value={s.highest === null ? '—' : `${s.highest}%`} />
                    <Stat label='Needs marking' value={num(s.pendingReview)} hint='written / coding answers' tone={s.pendingReview ? 'text-[var(--color-warning)]' : 'text-ink'} />
                </dl>
            )}
            {s?.pendingReview > 0 && <p role='note' className='mb-4 rounded-xl bg-[var(--color-warning-soft)] text-[var(--color-warning)] px-4 py-2.5 text-[13px]'>{num(s.pendingReview)} candidate{s.pendingReview === 1 ? ' has' : 's have'} written or coding answers that are not marked yet, so those scores count only the auto-marked part and will change.</p>}
            <div className='flex flex-wrap items-center gap-2 mb-3'>
                <SearchInput value={search} onChange={(e) => { setSearch(e.target.value.slice(0, 80)); update({ page: '' }) }} placeholder='Search name or email' className='sm:w-64' />
                <div className='w-40'><Select aria-label='Result' value={filters.result} onChange={(e) => update({ result: e.target.value, page: '' })} options={RESULTS.map(([value, label]) => ({ value, label }))} /></div>
                <div className='w-44'><Select aria-label='Status' value={filters.status} onChange={(e) => update({ status: e.target.value, page: '' })} options={STATUSES.map(([value, label]) => ({ value, label }))} /></div>
                <label className='inline-flex items-center gap-2 text-[13px] text-ink'>Score at least
                    <input inputMode='numeric' aria-label='Minimum score percent' value={filters.minPercent} onChange={(e) => update({ min: e.target.value.replace(/[^\d]/g, '').slice(0, 3), page: '' })} className='w-16 bg-card border-[1.5px] border-line rounded-lg px-2.5 py-1.5 text-[13px] tabular-nums' placeholder='0' />%</label>
                <label className='inline-flex items-center gap-2 text-[13px] text-ink cursor-pointer'><input type='checkbox' className='w-4 h-4 accent-[var(--color-accent)]' checked={filters.flagged === 'true'} onChange={(e) => update({ flag: e.target.checked ? 'true' : '', page: '' })} /> With warnings</label>
            </div>
            <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                {list.isError ? <p role='alert' className='px-5 py-8 text-center text-[var(--color-danger)]'>{list.error.message}</p>
                    : list.isLoading ? <div className='p-5 space-y-3' aria-busy='true'>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className='h-12 w-full rounded-xl' />)}</div>
                        : items.length === 0 ? <EmptyState compact icon={ClipboardList} title='No candidates match' description='Try clearing a filter.' />
                            : (
                                <div className='overflow-x-auto'>
                                    <table className='w-full text-[13.5px] min-w-[860px]'>
                                        <thead className='bg-surface-muted text-[12px]'>
                                            <tr><SortHead label='Rank' field='rank' sort={sort} onSort={onSort} /><SortHead label='Candidate' field='name' sort={sort} onSort={onSort} /><SortHead label='Score' field='percent' sort={sort} onSort={onSort} /><th className='px-3 py-3 text-left font-semibold text-text-secondary'>Result</th><SortHead label='Warnings' field='violationCount' sort={sort} onSort={onSort} align='right' /><th className='px-3 py-3 text-right font-semibold text-text-secondary'>Time</th><th className='px-3 py-3 text-left font-semibold text-text-secondary'>Marking</th><th className='px-2 py-3 w-8'><span className='sr-only'>Open</span></th></tr>
                                        </thead>
                                        <tbody className='divide-y divide-line'>
                                            {items.map((r) => (
                                                <tr key={r.studentId} className={`group ${r.attemptId ? 'cursor-pointer hover:bg-surface-muted/60' : ''}`} onClick={() => r.attemptId && onOpen(r.attemptId)}>
                                                    <td className='px-3 py-3 tabular-nums text-text-secondary'>{r.rank ?? '—'}</td>
                                                    <td className='px-3 py-3'><button type='button' disabled={!r.attemptId} onClick={(e) => { e.stopPropagation(); onOpen(r.attemptId) }} className='font-semibold text-ink hover:text-accent text-left disabled:hover:text-ink'>{r.name}</button><div className='text-[12px] text-text-secondary break-all'>{r.email}</div><AttemptStatus status={r.status} /></td>
                                                    <td className='px-3 py-3 min-w-[140px]'>{r.percent === null ? <span className='text-text-secondary'>—</span> : <><span className='font-bold tabular-nums'>{r.percent}%</span><span className='text-[12px] text-text-secondary tabular-nums'> {r.score}/{r.maxScore}</span><div className='h-1.5 rounded-full bg-line overflow-hidden mt-1' aria-hidden='true'><div className={`h-full ${r.passed ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]/70'}`} style={{ width: `${Math.min(100, r.percent)}%` }} /></div></>}</td>
                                                    <td className='px-3 py-3'>{r.passed === null ? <span className='text-text-secondary'>—</span> : <Badge variant={r.passed ? 'success' : 'danger'}>{r.passed ? 'Passed' : 'Not passed'}</Badge>}{r.adminDecision === 'DISQUALIFIED' && <Badge variant='danger' className='ml-1'>Disqualified</Badge>}</td>
                                                    <td className='px-3 py-3 text-right tabular-nums'>{r.violationCount ? <span className={r.violationCount >= 3 ? 'text-[var(--color-danger)] font-semibold' : ''}>{r.violationCount}</span> : <span className='text-text-secondary'>0</span>}</td>
                                                    <td className='px-3 py-3 text-right tabular-nums text-text-secondary whitespace-nowrap'>{r.timeTakenSec === null ? '—' : formatDuration(r.timeTakenSec)}</td>
                                                    <td className='px-3 py-3'>{r.gradingStatus ? <Badge variant={(GRADING[r.gradingStatus] || ['neutral'])[0]}>{(GRADING[r.gradingStatus] || ['neutral', r.gradingStatus])[1]}</Badge> : <span className='text-text-secondary'>—</span>}</td>
                                                    <td className='px-2 py-3 text-text-secondary'>{r.attemptId && <ChevronRight size={16} className='transition-transform group-hover:translate-x-0.5 group-hover:text-accent' aria-hidden='true' />}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
            </div>
            {list.data && list.data.total > 0 && <Pagination page={page} pageSize={pageSize} total={list.data.total} onPageChange={(p) => update({ page: p > 1 ? String(p) : '' }, true)} onPageSizeChange={(n) => update({ size: String(n), page: '' })} />}
        </>
    )
}

// ---------- Paper ----------

function PaperPanel({ test }) {
    const q = useQuery({ queryKey: ['admin', 'test-paper', test], queryFn: () => adminResultsApi.paper(test) })
    const [open, setOpen] = useState(() => new Set())
    if (q.isLoading) return <div className='space-y-3'><Skeleton className='h-24 w-full rounded-2xl' /><Skeleton className='h-48 w-full rounded-2xl' /></div>
    if (q.isError) return <p role='alert' className='text-[var(--color-danger)]'>{q.error.message}</p>
    const p = q.data
    const toggle = (id) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
    return (
        <>
            <dl className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-card border border-line rounded-2xl divide-x divide-y lg:divide-y-0 divide-line mb-4'>
                <Stat label='Questions' value={num(p.totalQuestions)} hint={`${p.sections.length} section${p.sections.length === 1 ? '' : 's'}`} />
                <Stat label='Total marks' value={num(p.totalMarks)} />
                <Stat label='Time allowed' value={p.durationMinutes ? `${p.durationMinutes} min` : '—'} />
                <Stat label='Pass mark' value={`${p.passPercent}%`} />
                <Stat label='Marked automatically' value={`${p.autoMarked.questions} Q`} hint={`${p.autoMarked.marks} marks`} />
                <Stat label='Needs a person' value={`${p.needsReview.questions} Q`} hint={`${p.needsReview.marks} marks`} tone={p.needsReview.questions ? 'text-[var(--color-warning)]' : 'text-ink'} />
            </dl>
            <p className='text-[12.5px] text-text-secondary mb-4'>{p.negativeMarking ? 'Wrong answers lose marks (negative marking is on). ' : 'No negative marking. '}Questions are {p.shuffle.questions ? 'shuffled' : 'in a fixed order'} and options are {p.shuffle.options ? 'shuffled' : 'in a fixed order'} for each candidate. {p.proctoring.level ? `Proctoring: ${String(p.proctoring.level).toLowerCase()}${p.proctoring.camera ? ', camera on' : ''}${p.proctoring.screenShare ? ', screen shared' : ''}${p.proctoring.maxViolations ? `, ended after ${p.proctoring.maxViolations} warnings` : ''}.` : ''}</p>
            <div className='space-y-3'>
                {p.sections.map((s) => (
                    <section key={s.id} className='bg-card border border-line rounded-2xl overflow-hidden'>
                        <button type='button' onClick={() => toggle(s.id)} aria-expanded={open.has(s.id)} className='w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left hover:bg-surface-muted/60'>
                            {open.has(s.id) ? <ChevronDown size={16} aria-hidden='true' className='text-text-secondary' /> : <ChevronRight size={16} aria-hidden='true' className='text-text-secondary' />}
                            <span className='font-bold text-ink text-[14px]'>Section {s.number}{s.title ? ` · ${s.title}` : ''}</span>
                            <span className='text-[12.5px] text-text-secondary'>{s.questionCount} question{s.questionCount === 1 ? '' : 's'} · {s.marks} marks</span>
                            <span className='flex flex-wrap gap-1.5 ml-auto'>{s.types.map((t) => <Badge key={t.type} variant='neutral'>{t.count} {t.label}</Badge>)}</span>
                        </button>
                        {open.has(s.id) && (
                            <ol className='divide-y divide-line border-t border-line'>
                                {s.questions.map((qq, i) => (
                                    <li key={qq.id} className='flex items-start gap-3 px-5 py-3'>
                                        <span className='w-6 text-[12.5px] text-text-secondary pt-0.5 tabular-nums'>{i + 1}</span>
                                        <div className='min-w-0 flex-1'><p className='text-[13.5px] text-ink break-words'>{qq.text}</p><div className='flex flex-wrap gap-1.5 mt-1.5'><Badge variant='brand'>{qq.label}</Badge><Badge variant='neutral'>{qq.marks} mark{qq.marks === 1 ? '' : 's'}</Badge>{qq.negativeMarks > 0 && <Badge variant='danger'>−{qq.negativeMarks} if wrong</Badge>}<Badge variant='neutral'>{String(qq.difficulty || '').toLowerCase()}</Badge>{qq.source !== 'MANUAL' && <Badge variant='info'>{qq.source === 'AI' ? 'AI drafted' : 'Uploaded'}</Badge>}</div></div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                ))}
            </div>
        </>
    )
}

// ---------- Score check ----------

function InsightsPanel({ test }) {
    const q = useQuery({ queryKey: ['admin', 'test-insights', test], queryFn: () => adminResultsApi.insights(test) })
    if (q.isLoading) return <div className='space-y-3'><Skeleton className='h-20 w-full rounded-2xl' /><Skeleton className='h-48 w-full rounded-2xl' /></div>
    if (q.isError) return <p role='alert' className='text-[var(--color-danger)]'>{q.error.message}</p>
    const d = q.data; const [tone, label, Icon] = VERDICT[d.verdict] || VERDICT.TOO_FEW
    const max = Math.max(1, ...d.spread.buckets.map((b) => b.count))
    const toneClass = { success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]', warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]', danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]', neutral: 'bg-surface-muted text-text-secondary' }[tone]
    return (
        <div className='space-y-5'>
            <section className={`rounded-2xl px-5 py-4 ${toneClass}`}>
                <h2 className='flex items-center gap-2 text-[16px] font-bold'><Icon size={18} aria-hidden='true' /> {label}</h2>
                <p className='text-[12.5px] opacity-80 mt-0.5'>Based on {d.basedOn.attempts} finished candidate{d.basedOn.attempts === 1 ? '' : 's'}. This is a prompt to look closer, never proof that anyone cheated.</p>
            </section>
            <ul className='space-y-2'>
                {d.notes.map((n, i) => <li key={i} className={`flex gap-2.5 bg-card border border-line rounded-xl px-4 py-3 text-[13.5px] text-ink`}><span className={`mt-0.5 shrink-0 ${NOTE_TONE[n.level]}`}>{n.level === 'ok' ? <CheckCircle2 size={16} aria-hidden='true' /> : <AlertTriangle size={16} aria-hidden='true' />}</span><span>{n.text}</span></li>)}
            </ul>

            <section className='bg-card border border-line rounded-2xl p-5'>
                <h3 className='text-[14px] font-bold text-ink mb-3'>How the scores are spread</h3>
                <div className='flex items-end gap-1.5 h-32' role='img' aria-label={`Scores by ten-point band: ${d.spread.buckets.map((b) => `${b.from} to ${b.to}: ${b.count}`).join(', ')}`}>
                    {d.spread.buckets.map((b) => (
                        <div key={b.from} className='flex-1 flex flex-col items-center justify-end h-full min-w-0'>
                            <span className='text-[11px] font-semibold tabular-nums text-ink'>{b.count || ''}</span>
                            <div className='w-full rounded-t-md bg-accent/70' style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count ? 4 : 0 }} />
                            <span className='text-[10.5px] text-text-secondary mt-1'>{b.from}</span>
                        </div>
                    ))}
                </div>
                <p className='text-[11.5px] text-text-secondary mt-1'>Score band (percent). A normal group makes a hill; a tall single bar means many identical scores.</p>
                <dl className='grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-[13px]'>
                    {[['Average', d.spread.average === null ? '—' : `${d.spread.average}%`], ['Median', d.spread.median === null ? '—' : `${d.spread.median}%`], ['Lowest', d.spread.lowest === null ? '—' : `${d.spread.lowest}%`], ['Highest', d.spread.highest === null ? '—' : `${d.spread.highest}%`], ['Passed', `${d.spread.passed} of ${d.spread.count}`]].map(([k, v]) => <div key={k}><dt className='text-text-secondary'>{k}</dt><dd className='font-bold tabular-nums text-[16px]'>{v}</dd></div>)}
                </dl>
                {d.repeatedScores.length > 0 && <p className='text-[12.5px] text-text-secondary mt-3'>Repeated scores: {d.repeatedScores.slice(0, 5).map((r) => `${r.percent}% × ${r.count}`).join(', ')}.</p>}
            </section>

            {d.similarAnswers.length > 0 && (
                <section className='bg-card border border-line rounded-2xl overflow-hidden'>
                    <h3 className='text-[14px] font-bold text-ink px-5 pt-4'>Candidates with very similar answers</h3>
                    <p className='text-[12.5px] text-text-secondary px-5 mb-2'>Same multiple-choice answers on at least 90% of questions, including several of the same wrong answers.</p>
                    <div className='overflow-x-auto'><table className='w-full text-[13px] min-w-[560px]'><thead className='bg-surface-muted text-left text-[12px] text-text-secondary'><tr><th className='px-5 py-2'>Candidates</th><th className='px-3 py-2 text-right'>Same answers</th><th className='px-3 py-2 text-right'>Same wrong answers</th></tr></thead>
                        <tbody className='divide-y divide-line'>{d.similarAnswers.map((s, i) => <tr key={i}><td className='px-5 py-2'>{s.a} and {s.b}</td><td className='px-3 py-2 text-right tabular-nums'>{s.identical} of {s.questions} ({s.share}%)</td><td className='px-3 py-2 text-right tabular-nums font-semibold text-[var(--color-danger)]'>{s.identicalWrong}</td></tr>)}</tbody></table></div>
                </section>
            )}

            <section className='bg-card border border-line rounded-2xl overflow-hidden'>
                <h3 className='text-[14px] font-bold text-ink px-5 pt-4'>How each question went</h3>
                <p className='text-[12.5px] text-text-secondary px-5 mb-2'>Share of candidates who got full marks. 0% (nobody) or 100% (everybody) on a question deserves a look.</p>
                <div className='overflow-x-auto'><table className='w-full text-[13px] min-w-[640px]'><thead className='bg-surface-muted text-left text-[12px] text-text-secondary'><tr><th className='px-5 py-2'>Question</th><th className='px-3 py-2'>Type</th><th className='px-3 py-2 text-right'>Answered</th><th className='px-3 py-2 text-right'>Full marks</th><th className='px-3 py-2 text-right'>Average marks</th></tr></thead>
                    <tbody className='divide-y divide-line'>{d.questions.map((qq, i) => <tr key={qq.id}><td className='px-5 py-2 max-w-[340px]'><span className='text-text-secondary tabular-nums mr-2'>{i + 1}</span><span className='break-words'>{qq.text}</span></td><td className='px-3 py-2 text-text-secondary whitespace-nowrap'>{qq.label}</td><td className='px-3 py-2 text-right tabular-nums'>{qq.answerRate === null ? '—' : `${qq.answerRate}%`}</td><td className={`px-3 py-2 text-right tabular-nums font-semibold ${qq.fullMarksRate === 0 && ['MCQ', 'MSQ'].includes(qq.type) ? 'text-[var(--color-danger)]' : qq.fullMarksRate === 100 ? 'text-[var(--color-warning)]' : ''}`}>{qq.fullMarksRate === null ? '—' : `${qq.fullMarksRate}%`}</td><td className='px-3 py-2 text-right tabular-nums'>{qq.averageMarks === null ? '—' : `${qq.averageMarks} / ${qq.marks}`}</td></tr>)}</tbody></table></div>
            </section>

            <section className='grid sm:grid-cols-2 gap-4'>
                <div className='bg-card border border-line rounded-2xl p-5 text-[13px]'>
                    <h3 className='text-[14px] font-bold text-ink mb-2'>Time taken</h3>
                    <p className='text-text-secondary'>Allowed {d.timing.allowedMinutes ?? '—'} min. Average {d.timing.averageMinutes ?? '—'} min, median {d.timing.medianMinutes ?? '—'}, quickest {d.timing.fastest ?? '—'}, longest {d.timing.slowest ?? '—'}.</p>
                </div>
                <div className='bg-card border border-line rounded-2xl p-5 text-[13px]'>
                    <h3 className='text-[14px] font-bold text-ink mb-2'>Proctoring</h3>
                    <p className='text-text-secondary'>{d.proctoring.flagged} candidate{d.proctoring.flagged === 1 ? '' : 's'} had warnings ({d.proctoring.totalWarnings} in total); {d.proctoring.endedByProctor} {d.proctoring.endedByProctor === 1 ? 'was' : 'were'} ended automatically.{d.sharedNetwork.length > 0 && ` ${d.sharedNetwork.reduce((s, x) => s + x.count, 0)} sat from shared network addresses.`}</p>
                </div>
            </section>
        </div>
    )
}

// ---------- the page ----------

/** The platform owner's view of any organization's online tests: results you can sort and filter, the paper's layout, and a check of the scores. */
export default function TestResultsPage() {
    const [params, setParams] = useSearchParams()
    const org = params.get('org') || ''
    const test = params.get('test') || ''
    const tab = params.get('tab') || 'results'
    const [open, setOpen] = useState(null)
    const update = (patch, keepPage = false) => setParams((p) => { const next = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k))); if (!keepPage && !('page' in patch)) next.delete('page'); return next }, { replace: true })

    const orgs = useQuery({ queryKey: ['admin', 'results-orgs'], queryFn: adminResultsApi.organizations })
    const tests = useQuery({ queryKey: ['admin', 'results-tests', org], queryFn: () => adminResultsApi.tests(org), enabled: Boolean(org) })
    const current = (tests.data || []).find((t) => t.id === test)
    const insights = useQuery({ queryKey: ['admin', 'test-insights', test], queryFn: () => adminResultsApi.insights(test), enabled: Boolean(test), staleTime: 60 * 1000 })
    const verdict = insights.data ? VERDICT[insights.data.verdict] : null
    const testLabel = (t) => `${t.drive ? `${t.drive} · ` : ''}Round ${t.roundNumber}${t.roundLabel ? ` (${t.roundLabel})` : ''}: ${t.title} — ${t.finished}/${t.invited} finished`

    return (
        <AdminShell>
            <div className='max-w-[1280px] mx-auto'>
                <header className='mb-5'>
                    <h1 className='font-display text-[26px] font-bold text-ink'>Test results</h1>
                    <p className='text-[14px] text-text-secondary mt-0.5'>Any organization's online tests: scores you can sort and filter, each candidate's detailed answers, how the paper was made, and a check on whether the scores look normal.</p>
                </header>

                <div className='grid sm:grid-cols-2 gap-3 mb-5'>
                    <div><label htmlFor='res-org' className='block text-[12.5px] font-semibold text-ink mb-1.5'>Organization</label>
                        <Select id='res-org' value={org} onChange={(e) => setParams(e.target.value ? { org: e.target.value } : {}, { replace: true })} placeholder={orgs.isLoading ? 'Loading…' : 'Choose an organization'} options={(orgs.data || []).map((o) => ({ value: o.key, label: `${o.name} (${o.finished} finished)` }))} /></div>
                    <div><label htmlFor='res-test' className='block text-[12.5px] font-semibold text-ink mb-1.5'>Test</label>
                        <Select id='res-test' value={test} disabled={!org} onChange={(e) => setParams({ org, ...(e.target.value ? { test: e.target.value } : {}) }, { replace: true })} placeholder={!org ? 'Choose an organization first' : tests.isLoading ? 'Loading…' : (tests.data || []).length ? 'Choose a test' : 'No tests'} options={(tests.data || []).map((t) => ({ value: t.id, label: testLabel(t) }))} /></div>
                </div>

                {orgs.isError && <p role='alert' className='text-[var(--color-danger)] mb-4'>{orgs.error.message}</p>}
                {!test ? (
                    <div className='bg-card border border-line rounded-2xl'><EmptyState icon={ClipboardList} title={org ? 'Choose a test' : 'Choose an organization'} description={org ? 'Pick one of its tests to see the results.' : 'Pick an organization, then one of its tests.'} /></div>
                ) : (
                    <>
                        {current && <p className='text-[13px] text-text-secondary mb-3'>{current.invited} invited · {current.started} started · {current.finished} finished{current.averagePercent !== null ? ` · average ${current.averagePercent}%` : ''}</p>}
                        <div role='tablist' aria-label='View' className='flex gap-1 border-b border-line mb-4'>
                            {[['results', 'Results'], ['paper', 'The paper'], ['check', 'Score check']].map(([id, label]) => (
                                <button key={id} role='tab' aria-selected={tab === id} onClick={() => update({ tab: id === 'results' ? '' : id }, true)} className={`px-4 py-2 text-[13.5px] font-semibold border-b-2 -mb-px inline-flex items-center gap-2 ${tab === id ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-ink'}`}>
                                    {label}{id === 'check' && verdict && <Badge variant={verdict[0]}>{verdict[1]}</Badge>}
                                </button>
                            ))}
                        </div>
                        {tab === 'results' && <ResultsPanel test={test} params={params} update={update} onOpen={setOpen} />}
                        {tab === 'paper' && <PaperPanel test={test} />}
                        {tab === 'check' && <InsightsPanel test={test} />}
                    </>
                )}
                <AttemptDrawer assessmentId={test} attemptId={open} onClose={() => setOpen(null)} api={adminResultsApi} readOnly />
            </div>
        </AdminShell>
    )
}
