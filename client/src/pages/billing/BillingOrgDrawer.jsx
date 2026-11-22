import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronRight, Download, Mail, Phone } from 'lucide-react'
import { Badge, Button, Drawer, Pagination, SearchInput, Select, Skeleton, useToast } from '../../components/ui'
import { downloadBillingCsv, getBillingOrganization, listBillingLines, saveBillingRates } from '../../api/billingApi'

// Where the panel reads from. The platform owner reads any client; an organization reads only itself.
const ADMIN_SOURCE = { ns: 'admin', getOrganization: getBillingOrganization, listLines: listBillingLines, download: (key, params) => downloadBillingCsv(`organizations/${key}/export`, params), save: saveBillingRates }
import RateForm from './RateForm'
import { KIND, OUTCOME, PRODUCT, UNIT_LABEL, formatDay, formatWhen, inr, num, shownKinds, usesLabel } from './billingFormat'

const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`
const STATUS_TONE = { ACTIVE: 'success', SUSPENDED: 'warning', REJECTED: 'danger', PENDING: 'neutral' }

// The funnel of everyone registered in the period: how many sat it, are still to, or missed it.
function Funnel({ s }) {
    const total = s.registered || 0
    const seg = (n, cls, label) => (total && n ? <span className={`${cls} h-full`} style={{ width: `${(n / total) * 100}%` }} title={`${label}: ${n}`} /> : null)
    return (
        <div>
            <div className='flex h-2.5 rounded-full overflow-hidden bg-line' role='img' aria-label={`Of ${total} registered: ${s.gave} gave the interview, ${s.pending} not yet, ${s.started} started, ${s.missed} missed`}>
                {seg(s.gave, 'bg-[var(--color-success)]', 'Gave the interview')}{seg(s.started, 'bg-[var(--color-warning)]', 'Started, not finished')}{seg(s.pending, 'bg-[var(--color-neutral)]/40', 'Not yet')}{seg(s.missed, 'bg-[var(--color-danger)]', 'Missed')}
            </div>
            <dl className='grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 mt-3 text-[12.5px]'>
                {[['Registered', s.registered, 'text-ink'], ['Gave the interview', s.gave, 'text-[var(--color-success)]'], ['Not yet', s.pending, 'text-text-secondary'], ['Started, not finished', s.started, 'text-[var(--color-warning)]'], ['Missed', s.missed, 'text-[var(--color-danger)]']].map(([label, value, tone]) => (
                    <div key={label}><dt className='text-text-secondary'>{label}</dt><dd className={`text-[18px] font-bold tabular-nums ${tone}`}>{num(value)}</dd></div>
                ))}
            </dl>
        </div>
    )
}

export function OrgPanel({ orgKey, period, product, source = ADMIN_SOURCE, readOnly = false }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState(''); const [q, setQ] = useState('')
    const [outcome, setOutcome] = useState(''); const [billableOnly, setBillableOnly] = useState(false)
    const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(25)
    const [saveError, setSaveError] = useState('')
    const [open, setOpen] = useState(() => new Set())
    const toggle = (id) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
    useEffect(() => { const id = setTimeout(() => { setQ(search); setPage(1) }, 350); return () => clearTimeout(id) }, [search])

    const detail = useQuery({ queryKey: ['billing', source.ns, 'org', orgKey, period.from, period.to, product], queryFn: () => source.getOrganization(orgKey, { ...period, product }) })
    const lines = useQuery({ queryKey: ['billing', source.ns, 'lines', orgKey, period.from, period.to, product, q, outcome, billableOnly, page, pageSize], queryFn: () => source.listLines(orgKey, { ...period, product, view: 'people', search: q, outcome, billable: billableOnly ? '1' : '', page, pageSize }), placeholderData: keepPreviousData })
    const save = useMutation({
        mutationFn: (body) => source.save(orgKey, body),
        onSuccess: () => { setSaveError(''); queryClient.invalidateQueries({ queryKey: ['billing'] }); toast.success('Rates saved. The figures are updated.') },
        onError: (err) => { setSaveError(err.message); toast.error(err.message) },
    })
    const download = useMutation({ mutationFn: () => source.download(orgKey, { ...period, product }), onError: (err) => toast.error(err.message) })

    if (detail.isError) return <p role='alert' className='text-[14px] text-[var(--color-danger)]'>{detail.error.message}</p>
    if (detail.isLoading) return <div className='space-y-4' aria-busy='true'><Skeleton className='h-20 w-full rounded-2xl' /><Skeleton className='h-48 w-full rounded-2xl' /><Skeleton className='h-64 w-full rounded-2xl' /></div>
    const o = detail.data.organization; const r = detail.data.rates
    const unitWord = o.unit === 'INTERVIEW' ? ['interview round', 'interview rounds'] : ['candidate', 'candidates']
    const comboUnits = o.combo?.candidates || 0
    // Only what this client created: no empty AI or test rows for a client that runs combined drives, and the other way round.
    const kinds = shownKinds(o.uses)
    const rows = [
        ...(kinds.combo || comboUnits > 0 ? [['Online test + AI interview', comboUnits, o.comboRate, o.comboAmount]] : []),
        ...(kinds.oa ? [['Online test', o.oaBilledUnits ?? o.oa.billableUnits, o.oaRate, o.oaAmount]] : []),
        ...(kinds.ai ? [['AI interview', o.aiBilledUnits ?? o.ai.billableUnits, o.aiRate, o.aiAmount]] : []),
    ]

    return (
        <div className='space-y-7'>
            <header>
                <div className='flex flex-wrap items-center gap-2'>
                    <h2 className='font-display text-[22px] font-bold text-ink break-words'>{o.name}</h2>
                    <Badge variant='neutral'>{KIND[o.kind] || o.kind}</Badge><Badge variant={STATUS_TONE[o.status] || 'neutral'}>{o.status}</Badge>{usesLabel(o.uses) && <Badge variant='brand' className='normal-case'>{usesLabel(o.uses)}</Badge>}
                </div>
                <p className='text-[13px] text-text-secondary mt-1 flex flex-wrap items-center gap-x-4 gap-y-1'>
                    {o.contactName && <span>{o.contactName}</span>}
                    {o.email && <span className='inline-flex items-center gap-1'><Mail size={13} aria-hidden='true' /> {o.email}</span>}
                    {o.phone && <span className='inline-flex items-center gap-1'><Phone size={13} aria-hidden='true' /> {o.phone}</span>}
                    {o.since && <span>Client since {formatDay(o.since)}</span>}
                </p>
                <p className='text-[12.5px] text-text-secondary mt-1'>Period: {formatDay(`${period.from}T00:00:00+05:30`)} to {formatDay(`${period.to}T00:00:00+05:30`)}</p>
            </header>

            <section aria-label='Invoice summary'>
                <h3 className='text-[14px] font-bold text-ink mb-2'>{readOnly ? 'Your charges' : 'What to bill'}</h3>
                <div className='border border-line rounded-2xl overflow-hidden'>
                    <table className='w-full text-[13.5px]'>
                        <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'><tr><th className='px-4 py-2.5'>Item</th><th className='px-4 py-2.5 text-right'>Billable</th><th className='px-4 py-2.5 text-right'>Rate</th><th className='px-4 py-2.5 text-right'>Amount</th></tr></thead>
                        <tbody className='divide-y divide-line'>
                            {rows.map(([label, units, rate, amount]) => (
                                <tr key={label}><td className='px-4 py-2.5 font-medium text-ink'>{label}</td><td className='px-4 py-2.5 text-right tabular-nums'>{plural(units, unitWord[0], unitWord[1])}</td><td className='px-4 py-2.5 text-right tabular-nums'>{rate ? inr(rate) : <span className='text-[var(--color-warning)]'>No rate</span>}</td><td className='px-4 py-2.5 text-right tabular-nums'>{inr(amount)}</td></tr>
                            ))}
                            <tr className='bg-surface-muted/50'><td className='px-4 py-2.5 text-text-secondary' colSpan={3}>Subtotal</td><td className='px-4 py-2.5 text-right tabular-nums'>{inr(o.amountExGst)}</td></tr>
                            <tr><td className='px-4 py-2.5 text-text-secondary' colSpan={3}>GST {o.gstPercent}%</td><td className='px-4 py-2.5 text-right tabular-nums'>{inr(o.gstAmount)}</td></tr>
                            <tr className='bg-ink text-white'><td className='px-4 py-3 font-bold' colSpan={3}>{readOnly ? 'Total payable' : 'Total to invoice'}</td><td className='px-4 py-3 text-right font-bold text-[16px] tabular-nums'>{inr(o.total)}</td></tr>
                        </tbody>
                    </table>
                </div>
                <p className='text-[12px] text-text-secondary mt-2'>Billed {UNIT_LABEL[o.unit]}. {o.interviews > o.billableCandidates && o.unit !== 'INTERVIEW' ? `${num(o.billableCandidates)} people sat ${num(o.interviews)} interview rounds between them, so each person is billed once.` : `${num(o.interviews)} interview${o.interviews === 1 ? '' : 's'} given in this period.`}</p>
                {o.rateMissing && <p role='alert' className='text-[13px] text-[var(--color-warning)] mt-2'>{readOnly ? 'Pricing for part of this usage has not been set yet. Your account manager will confirm it.' : 'No rate is set for part of this usage. Set one below.'}</p>}
            </section>

            <section aria-label='Registered candidates'>
                <h3 className='text-[14px] font-bold text-ink mb-1'>Of the candidates registered in this period</h3>
                <p className='text-[12.5px] text-text-secondary mb-3'>{num(o.conversionPercent)}% have given the interview so far. Awaiting approval (not counted): {num(o.awaitingApproval)}.</p>
                <Funnel s={{ registered: o.registered, gave: o.gaveOfRegistered, pending: o.pending, started: o.startedNotFinished, missed: o.missed }} />
            </section>

            {!readOnly && <section aria-label='Rate card'>
                <h3 className='text-[14px] font-bold text-ink mb-1'>Rates for this client</h3>
                <p className='text-[12.5px] text-text-secondary mb-3'>Leave a box empty to use your default. Changes apply to every period, so figures you have already sent should be saved as an export first.</p>
                <RateForm uses={o.uses} key={`${r.custom.aiRate}-${r.custom.oaRate}-${r.custom.comboRate}-${r.custom.gstPercent}-${r.custom.unit}-${r.notes}`} values={{ ...r.custom, notes: r.notes }} defaults={r.defaults} saving={save.isPending} error={saveError} onSave={(body) => save.mutate(body)} />
            </section>}

            {detail.data.sources.length > 0 && (
                <details aria-label='By drive or test' className='group'>
                    <summary className='text-[14px] font-bold text-ink mb-2 cursor-pointer'>Totals by drive or test</summary>
                    <div className='border border-line rounded-2xl overflow-x-auto'>
                        <table className='w-full text-[13px] min-w-[560px]'>
                            <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'><tr><th className='px-4 py-2.5'>Drive / test</th><th className='px-3 py-2.5 text-right'>Registered</th><th className='px-3 py-2.5 text-right'>Gave</th><th className='px-3 py-2.5 text-right'>Not yet</th><th className='px-3 py-2.5 text-right'>Missed</th><th className='px-3 py-2.5 text-right'>Interviews</th></tr></thead>
                            <tbody className='divide-y divide-line'>
                                {detail.data.sources.map((s) => (
                                    <tr key={`${s.product}-${s.sourceId}`}><td className='px-4 py-2.5'><div className='font-medium text-ink break-words'>{s.title}</div><div className='text-[11.5px] text-text-secondary'>{s.product === 'PACKAGE' ? 'Online test, then AI interview' : PRODUCT[s.product]}</div></td><td className='px-3 py-2.5 text-right tabular-nums'>{num(s.registered)}</td><td className='px-3 py-2.5 text-right tabular-nums text-[var(--color-success)] font-semibold'>{num(s.gave)}</td><td className='px-3 py-2.5 text-right tabular-nums'>{num(s.pending + s.started)}</td><td className='px-3 py-2.5 text-right tabular-nums'>{num(s.missed)}</td><td className='px-3 py-2.5 text-right tabular-nums'>{num(s.interviews)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}

            <section aria-label='Candidates'>
                <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
                    <div><h3 className='text-[14px] font-bold text-ink'>Candidates</h3><p className='text-[12.5px] text-text-secondary'>One row per candidate. Click a candidate to see the drives and tests they took.</p></div>
                    <Button size='sm' variant='secondary' disabled={download.isPending} onClick={() => download.mutate()}><Download size={14} /> {download.isPending ? 'Preparing…' : 'Download annexure (CSV)'}</Button>
                </div>
                <div className='flex flex-wrap items-center gap-2 mb-3'>
                    <SearchInput value={search} onChange={(e) => setSearch(e.target.value.slice(0, 80))} placeholder='Search name, email or drive' className='sm:w-64' />
                    <div className='w-52'><Select aria-label='Filter by status' value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1) }} options={[{ value: '', label: 'All statuses' }, ...Object.entries(OUTCOME).map(([value, [, label]]) => ({ value, label }))]} /></div>
                    <label className='inline-flex items-center gap-2 text-[13px] text-ink cursor-pointer'><input type='checkbox' checked={billableOnly} onChange={(e) => { setBillableOnly(e.target.checked); setPage(1) }} className='w-4 h-4 accent-[var(--color-accent)]' /> Billed only</label>
                </div>
                <div className='border border-line rounded-2xl overflow-hidden divide-y divide-line'>
                    {lines.isError && <p role='alert' className='px-4 py-6 text-[var(--color-danger)]'>{lines.error.message}</p>}
                    {lines.isLoading && <div className='p-4'><Skeleton className='h-6 w-full' /></div>}
                    {lines.data?.items.length === 0 && <p className='px-4 py-8 text-center text-text-secondary text-[13px]'>No candidates match.</p>}
                    {lines.data?.items.map((c) => {
                        const id = c.email || c.name
                        const isOpen = open.has(id)
                        return (
                            <div key={id}>
                                <button type='button' onClick={() => toggle(id)} aria-expanded={isOpen} className='w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'>
                                    {isOpen ? <ChevronDown size={16} aria-hidden='true' className='shrink-0 text-text-secondary' /> : <ChevronRight size={16} aria-hidden='true' className='shrink-0 text-text-secondary' />}
                                    <span className='min-w-0 flex-1'>
                                        <span className='block font-medium text-ink text-[13.5px] truncate'>{c.name || '—'}</span>
                                        <span className='block text-[12px] text-text-secondary truncate'>{c.email}</span>
                                    </span>
                                    <span className='hidden sm:flex flex-wrap gap-1.5 justify-end max-w-[40%]'>
                                        {c.items.map((l, i) => <Badge key={i} variant={OUTCOME[l.outcome][0]} className='normal-case'>{l.part || PRODUCT[l.product] || 'Drive'}: {OUTCOME[l.outcome][1]}</Badge>)}
                                    </span>
                                    <span className='w-16 text-right shrink-0'>{c.units > 0 ? <span className='inline-flex items-center gap-1 font-semibold text-[var(--color-success)] text-[13px]'><Check size={13} aria-hidden='true' />{c.units} billed</span> : <span className='text-text-secondary text-[12px]'>Not billed</span>}</span>
                                </button>
                                {isOpen && (
                                    <div className='bg-surface-muted/40 px-4 pb-3 pt-1 sm:pl-11'>
                                        <p className='text-[12px] text-text-secondary mb-2'>{c.phone ? `${c.phone} · ` : ''}Last activity {formatWhen(c.lastAt)}</p>
                                        <ul className='space-y-2'>
                                            {c.items.map((l, i) => (
                                                <li key={i} className='bg-card border border-line rounded-xl px-3 py-2.5 text-[12.5px] grid gap-x-4 gap-y-1 sm:grid-cols-[1fr_auto]'>
                                                    <div className='min-w-0'>
                                                        <div className='font-semibold text-ink break-words'>{l.source}</div>
                                                        <div className='text-text-secondary'>{l.part ? `${l.part} · part of a combined drive` : PRODUCT[l.product]}</div>
                                                    </div>
                                                    <div className='sm:text-right'><Badge variant={OUTCOME[l.outcome][0]} className='normal-case'>{OUTCOME[l.outcome][1]}</Badge></div>
                                                    <div className='text-text-secondary sm:col-span-2 flex flex-wrap gap-x-5 gap-y-0.5'>
                                                        <span>Registered {formatDay(l.registeredAt)}</span>
                                                        <span>Interviewed {l.interviewedAt ? formatWhen(l.interviewedAt) : '—'}{l.interviewsInPeriod > 1 ? ` (${l.interviewsInPeriod} rounds)` : ''}</span>
                                                        <span>Score {l.score ?? '—'}</span>
                                                        <span>Billed {l.units > 0 ? l.units : '—'}</span>
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
                {lines.data?.total > 0 && <Pagination page={page} pageSize={pageSize} total={lines.data.total} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />}
            </section>
        </div>
    )
}

/** One client's billing in a side panel: what to invoice, the funnel, its rates, and every candidate behind the number. */
export default function BillingOrgDrawer({ orgKey, period, product, onClose }) {
    return (
        <Drawer open={Boolean(orgKey)} onClose={onClose} title='Client billing' widthClassName='max-w-4xl'>
            {orgKey && <OrgPanel key={orgKey} orgKey={orgKey} period={period} product={product} />}
        </Drawer>
    )
}
