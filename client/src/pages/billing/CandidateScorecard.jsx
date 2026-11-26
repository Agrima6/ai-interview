import React, { useEffect, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ClipboardList, Mic, MailCheck, RotateCcw } from 'lucide-react'
import { Badge, Button, Pagination, SearchInput, Select, Skeleton } from '../../components/ui'
import AttemptDrawer from '../../components/oa/AttemptDrawer'
import CandidateDetailModal from '../../components/organization/CandidateDetailModal'
import { MAIL, OUTCOME, PRODUCT, formatDay, formatWhen, inr, num } from './billingFormat'

const GRID = 'md:grid-cols-[minmax(0,2.2fr)_110px_110px_120px_70px_100px]'
const MAIL_OPTIONS = [['', 'Any email'], ['EMAILED', 'Emailed'], ['OPENED', 'Opened'], ['NOT_OPENED', 'Sent, not opened'], ['FAILED', 'Failed'], ['NOT_EMAILED', 'Not emailed']]
const STAGE_OPTIONS = (what) => [['', `${what}: any`], ['GAVE', `${what}: gave it`], ['NOT_YET', `${what}: not yet`]]
const SORT_OPTIONS = [['recent', 'Latest activity'], ['testScore', 'Test score'], ['aiScore', 'AI interview score'], ['name', 'Name'], ['emails', 'Emails sent'], ['invited', 'Invited on'], ['amount', 'Amount']]

/** A score you can read at a glance: big, bold, with a bar. */
function Score({ value, status, label }) {
    if (value === null || value === undefined) {
        const text = status === 'NONE' ? 'n/a' : status === 'GAVE' ? 'pending' : status === 'STARTED' ? 'started' : status === 'MISSED' ? 'missed' : 'not yet'
        return <span className='text-[12.5px] text-text-secondary' aria-label={`${label}: ${text}`}>{text}</span>
    }
    const tone = value >= 60 ? 'bg-[var(--color-success)]' : value >= 40 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-danger)]'
    return (
        <span className='block' aria-label={`${label}: ${value}%`}>
            <span className='block text-[17px] leading-tight font-bold tabular-nums text-ink'>{Math.round(value * 10) / 10}<span className='text-[11px] font-semibold text-text-secondary'>%</span></span>
            <span className='block h-1.5 w-full max-w-[84px] rounded-full bg-line overflow-hidden mt-1' aria-hidden='true'><span className={`block h-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></span>
        </span>
    )
}

function MailBadge({ status, openedAt }) {
    if (status === 'NONE') return <span className='text-[12.5px] text-text-secondary'>Not emailed</span>
    const [tone, label] = MAIL[status] || ['info', 'Sent']
    return <Badge variant={tone} className='normal-case' title={openedAt ? `Opened ${formatWhen(openedAt)}` : 'Not opened yet'}>{label}</Badge>
}

function Chip({ label, value, hint, active, onClick, tone = 'text-ink' }) {
    return (
        <button type='button' onClick={onClick} aria-pressed={active} className={`text-left px-4 py-3 rounded-xl border-[1.5px] min-w-[120px] transition-colors ${active ? 'border-accent bg-accent/[0.06]' : 'border-line bg-card hover:border-accent/40'}`}>
            <span className='block text-[12px] font-semibold text-text-secondary'>{label}</span>
            <span className={`block font-display text-[22px] leading-tight font-bold tabular-nums ${tone}`}>{value}</span>
            {hint && <span className='block text-[11.5px] text-text-secondary'>{hint}</span>}
        </button>
    )
}

function SortHead({ label, field, sort, onSort, align = 'left' }) {
    const on = sort.by === field
    return (
        <button type='button' onClick={() => onSort(field)} aria-label={`Sort by ${label}`} className={`inline-flex items-center gap-1 font-semibold hover:text-ink ${on ? 'text-ink' : 'text-text-secondary'} ${align === 'right' ? 'justify-end w-full' : ''}`}>
            {label}{on && (sort.order === 'asc' ? <ArrowUp size={12} aria-hidden='true' /> : <ArrowDown size={12} aria-hidden='true' />)}
        </button>
    )
}

/** The written AI interview evaluation of one candidate (score, summary, strengths and gaps, each question). */
function AiReport({ source, target, onClose }) {
    const q = useQuery({ queryKey: ['billing', source.ns, 'ai-candidate', target?.driveId, target?.email], queryFn: () => source.aiCandidate(target.driveId, target.email), enabled: Boolean(target), retry: false })
    if (!target) return null
    if (q.isLoading) return null
    if (q.isError) return <p role='alert' className='fixed bottom-4 right-4 z-[var(--z-toast)] rounded-xl bg-card border border-line shadow-lg px-4 py-3 text-[13px] text-[var(--color-danger)]'>{q.error.message} <button type='button' className='ml-2 underline' onClick={onClose}>Close</button></p>
    return <CandidateDetailModal open onClose={onClose} candidate={q.data} onStatusChange={() => {}} viewOnly />
}

/**
 * Every candidate of one organization as a scorecard: their test score, their AI interview score and what happened to their invitation
 * email, with filters and sorting on all of it, and a way into the detailed score the organization itself sees.
 */
export default function CandidateScorecard({ orgKey, period, product, source }) {
    const [search, setSearch] = useState(''); const [q, setQ] = useState('')
    const [f, setF] = useState({ mail: '', test: '', ai: '', billable: false })
    const [sort, setSort] = useState({ by: 'recent', order: 'desc' })
    const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(25)
    const [open, setOpen] = useState(() => new Set())
    const [attempt, setAttempt] = useState(null)       // { testId, attemptId }
    const [ai, setAi] = useState(null)                 // { driveId, email }
    useEffect(() => { const id = setTimeout(() => { setQ(search); setPage(1) }, 350); return () => clearTimeout(id) }, [search])
    const toggle = (id) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
    const set = (patch) => { setF((x) => ({ ...x, ...patch })); setPage(1) }
    const onSort = (field) => { setSort((s) => ({ by: field, order: s.by === field && s.order === 'desc' ? 'asc' : 'desc' })); setPage(1) }

    const list = useQuery({
        queryKey: ['billing', source.ns, 'people', orgKey, period.from, period.to, product, q, f, sort, page, pageSize],
        queryFn: () => source.listLines(orgKey, { ...period, product, view: 'people', search: q, mail: f.mail, test: f.test, ai: f.ai, billable: f.billable ? '1' : '', sortBy: sort.by, order: sort.order, page, pageSize }),
        placeholderData: keepPreviousData,
    })
    const s = list.data?.meta?.summary
    const items = list.data?.items || []
    const filtered = Boolean(q || f.mail || f.test || f.ai || f.billable)
    const reset = () => { setSearch(''); setQ(''); setF({ mail: '', test: '', ai: '', billable: false }); setSort({ by: 'recent', order: 'desc' }); setPage(1) }
    const openTest = async (line) => { try { await source.prepareDetail?.() } catch { /* the drawer shows the error */ } setAttempt({ testId: line.testId, attemptId: line.attemptId }) }

    return (
        <>
            {s && (
                <div className='flex flex-wrap gap-2 mb-3' role='group' aria-label='Quick filters'>
                    <Chip label='Emails sent to' value={num(s.emailed)} hint='candidates' active={f.mail === 'EMAILED'} onClick={() => set({ mail: f.mail === 'EMAILED' ? '' : 'EMAILED' })} />
                    <Chip label='Opened the email' value={num(s.opened)} hint={s.emailed ? `${Math.round((s.opened / s.emailed) * 100)}% of emailed` : ''} tone='text-[var(--color-success)]' active={f.mail === 'OPENED'} onClick={() => set({ mail: f.mail === 'OPENED' ? '' : 'OPENED' })} />
                    <Chip label='Not opened' value={num(s.notOpened)} active={f.mail === 'NOT_OPENED'} onClick={() => set({ mail: f.mail === 'NOT_OPENED' ? '' : 'NOT_OPENED' })} />
                    {s.failed > 0 && <Chip label='Email failed' value={num(s.failed)} tone='text-[var(--color-danger)]' active={f.mail === 'FAILED'} onClick={() => set({ mail: f.mail === 'FAILED' ? '' : 'FAILED' })} />}
                    {s.hasTest > 0 && <Chip label='Gave the test' value={`${num(s.gaveTest)}/${num(s.hasTest)}`} hint={s.averageTest === null ? '' : `average ${s.averageTest}%`} tone='text-accent' active={f.test === 'GAVE'} onClick={() => set({ test: f.test === 'GAVE' ? '' : 'GAVE' })} />}
                    {s.hasAi > 0 && <Chip label='Gave the AI interview' value={`${num(s.gaveAi)}/${num(s.hasAi)}`} hint={s.averageAi === null ? '' : `average ${s.averageAi}%`} tone='text-accent' active={f.ai === 'GAVE'} onClick={() => set({ ai: f.ai === 'GAVE' ? '' : 'GAVE' })} />}
                </div>
            )}

            <div className='flex flex-wrap items-center gap-2 mb-3'>
                <SearchInput value={search} onChange={(e) => setSearch(e.target.value.slice(0, 80))} placeholder='Search name, email or drive' className='sm:w-60' />
                <div className='w-40'><Select aria-label='Email' value={f.mail} onChange={(e) => set({ mail: e.target.value })} options={MAIL_OPTIONS.map(([value, label]) => ({ value, label }))} /></div>
                <div className='w-40'><Select aria-label='Test' value={f.test} onChange={(e) => set({ test: e.target.value })} options={STAGE_OPTIONS('Test').map(([value, label]) => ({ value, label }))} /></div>
                <div className='w-44'><Select aria-label='AI interview' value={f.ai} onChange={(e) => set({ ai: e.target.value })} options={STAGE_OPTIONS('AI interview').map(([value, label]) => ({ value, label }))} /></div>
                <label className='inline-flex items-center gap-2 text-[13px] text-ink cursor-pointer'><input type='checkbox' checked={f.billable} onChange={(e) => set({ billable: e.target.checked })} className='w-4 h-4 accent-[var(--color-accent)]' /> Billed only</label>
            </div>
            <div className='flex flex-wrap items-center gap-2 mb-3'>
                <span className='text-[12.5px] font-semibold text-text-secondary'>Sort by</span>
                <div className='w-48'><Select aria-label='Sort by' value={sort.by} onChange={(e) => { setSort((x) => ({ ...x, by: e.target.value })); setPage(1) }} options={SORT_OPTIONS.map(([value, label]) => ({ value, label }))} /></div>
                <Button size='sm' variant='secondary' onClick={() => { setSort((x) => ({ ...x, order: x.order === 'desc' ? 'asc' : 'desc' })); setPage(1) }} aria-label={sort.order === 'desc' ? 'Highest first. Switch to lowest first' : 'Lowest first. Switch to highest first'}>{sort.order === 'desc' ? <><ArrowDown size={14} /> Highest first</> : <><ArrowUp size={14} /> Lowest first</>}</Button>
                {(filtered || sort.by !== 'recent') && <Button size='sm' variant='secondary' onClick={reset}><RotateCcw size={13} /> Reset</Button>}
                <span className='text-[12.5px] text-text-secondary ml-auto'>{list.data ? `Showing ${num(list.data.total)} of ${num(s?.people ?? list.data.total)} candidates` : ''}</span>
            </div>

            <div className='border border-line rounded-2xl overflow-hidden bg-card'>
                <div className={`hidden md:grid ${GRID} gap-3 px-4 py-2.5 bg-surface-muted text-[12px]`}>
                    <span className='pl-7'><SortHead label='Candidate' field='name' sort={sort} onSort={onSort} /></span>
                    <SortHead label='Test score' field='testScore' sort={sort} onSort={onSort} />
                    <SortHead label='AI interview' field='aiScore' sort={sort} onSort={onSort} />
                    <span className='font-semibold text-text-secondary'>Email</span>
                    <SortHead label='Emails' field='emails' sort={sort} onSort={onSort} align='right' />
                    <SortHead label='Amount' field='amount' sort={sort} onSort={onSort} align='right' />
                </div>
                <div className='divide-y divide-line'>
                    {list.isError && <p role='alert' className='px-4 py-6 text-[var(--color-danger)]'>{list.error.message}</p>}
                    {list.isLoading && <div className='p-4 space-y-3' aria-busy='true'>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className='h-14 w-full rounded-xl' />)}</div>}
                    {list.data?.items.length === 0 && <p className='px-4 py-8 text-center text-text-secondary text-[13px]'>{filtered ? 'No candidates match these filters.' : 'No candidates yet.'}</p>}
                    {items.map((c) => {
                        const id = `c:${c.email || c.name}`
                        const isOpen = open.has(id)
                        return (
                            <div key={id}>
                                <button type='button' onClick={() => toggle(id)} aria-expanded={isOpen} className={`w-full grid grid-cols-[minmax(0,1fr)_auto] ${GRID} items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
                                    <span className='flex items-center gap-2 min-w-0'>
                                        {isOpen ? <ChevronDown size={16} aria-hidden='true' className='shrink-0 text-text-secondary' /> : <ChevronRight size={16} aria-hidden='true' className='shrink-0 text-text-secondary' />}
                                        <span className='min-w-0'><span className='block font-semibold text-ink text-[14px] truncate'>{c.name || '—'}</span><span className='block text-[12px] text-text-secondary truncate'>{c.email}</span></span>
                                    </span>
                                    <span className='md:hidden flex items-center gap-3 justify-end'>
                                        {c.testStatus !== 'NONE' && <Score value={c.testScore} status={c.testStatus} label='Test score' />}
                                        {c.aiStatus !== 'NONE' && <Score value={c.aiScore} status={c.aiStatus} label='AI interview score' />}
                                    </span>
                                    <span className='hidden md:block'><Score value={c.testScore} status={c.testStatus} label='Test score' /></span>
                                    <span className='hidden md:block'><Score value={c.aiScore} status={c.aiStatus} label='AI interview score' /></span>
                                    <span className='hidden md:block'><MailBadge status={c.mailStatus} openedAt={c.openedAt} /></span>
                                    <span className='hidden md:block text-right tabular-nums text-[13.5px] font-semibold'>{c.emails || '—'}</span>
                                    <span className='hidden md:block text-right tabular-nums text-[14px] font-bold'>{c.units > 0 ? inr(c.amountExGst) : <span className='font-normal text-text-secondary'>—</span>}</span>
                                </button>
                                {isOpen && (
                                    <div className='bg-surface-muted/40 px-4 pb-3 pt-1 sm:pl-11'>
                                        <p className='text-[12px] text-text-secondary mb-2'>{c.phone ? `${c.phone} · ` : ''}{c.invitedAt ? `First emailed ${formatDay(c.invitedAt)} · ` : ''}Last activity {formatWhen(c.lastAt)}{c.units > 0 ? ` · Billed ${inr(c.amountExGst)} (excl. GST)` : ''}</p>
                                        <ul className='space-y-2'>
                                            {c.items.map((l, i) => (
                                                <li key={i} className='bg-card border border-line rounded-xl px-3.5 py-3 text-[12.5px]'>
                                                    <div className='flex flex-wrap items-start justify-between gap-2'>
                                                        <div className='min-w-0'>
                                                            <div className='font-semibold text-ink text-[13.5px] break-words'>{l.source}</div>
                                                            <div className='text-text-secondary'>{l.part ? `${l.part} · part of a combined drive` : PRODUCT[l.product]}</div>
                                                        </div>
                                                        <div className='flex flex-wrap items-center gap-2'>
                                                            {l.score !== null && l.score !== undefined && <span className='text-[16px] font-bold tabular-nums text-ink'>{l.score}%</span>}
                                                            <Badge variant={OUTCOME[l.outcome][0]} className='normal-case'>{OUTCOME[l.outcome][1]}</Badge>
                                                        </div>
                                                    </div>
                                                    <div className='flex flex-wrap items-center gap-x-5 gap-y-1 text-text-secondary mt-2'>
                                                        <span className='inline-flex items-center gap-1.5'><MailCheck size={13} aria-hidden='true' /> Email <MailBadge status={l.invitedRounds.length ? l.mail?.openedAt ? 'OPENED' : l.mail?.status || 'SENT' : 'NONE'} openedAt={l.mail?.openedAt} />{l.mail?.openedAt ? <span>on {formatWhen(l.mail.openedAt)}</span> : null}</span>
                                                        <span>Registered {formatDay(l.registeredAt)}</span>
                                                        <span>Billed {l.units > 0 ? l.units : '—'}</span>
                                                    </div>
                                                    {l.invitedRounds.length > 0 && <div className='flex flex-wrap gap-1.5 mt-2'>{l.invitedRounds.map((r, k) => <Badge key={k} variant={r.inPeriod ? 'brand' : 'neutral'} className='normal-case'>{r.title} · emailed {formatDay(r.at)}</Badge>)}</div>}
                                                    <div className='flex flex-wrap gap-2 mt-3'>
                                                        {l.testId && <Button size='sm' variant='secondary' disabled={!l.attemptId} onClick={() => openTest(l)}><ClipboardList size={14} /> {l.attemptId ? 'View detailed score' : 'Has not sat the test'}</Button>}
                                                        {l.aiDriveId && <Button size='sm' variant='secondary' disabled={!['GAVE', 'STARTED_NOT_FINISHED'].includes(l.outcome)} onClick={() => setAi({ driveId: l.aiDriveId, email: c.email })}><Mic size={14} /> {['GAVE', 'STARTED_NOT_FINISHED'].includes(l.outcome) ? 'View AI interview report' : 'No AI interview yet'}</Button>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
            {list.data?.total > 0 && <Pagination page={page} pageSize={pageSize} total={list.data.total} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />}

            <AttemptDrawer assessmentId={attempt?.testId} attemptId={attempt?.attemptId} onClose={() => setAttempt(null)} api={source.detailApi} readOnly />
            <AiReport source={source} target={ai} onClose={() => setAi(null)} />
        </>
    )
}
