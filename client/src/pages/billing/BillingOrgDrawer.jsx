import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Check, Download, Mail, Phone } from 'lucide-react'
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
    useEffect(() => { const id = setTimeout(() => { setQ(search); setPage(1) }, 350); return () => clearTimeout(id) }, [search])

    const detail = useQuery({ queryKey: ['billing', source.ns, 'org', orgKey, period.from, period.to, product], queryFn: () => source.getOrganization(orgKey, { ...period, product }) })
    const lines = useQuery({ queryKey: ['billing', source.ns, 'lines', orgKey, period.from, period.to, product, q, outcome, billableOnly, page, pageSize], queryFn: () => source.listLines(orgKey, { ...period, product, search: q, outcome, billable: billableOnly ? '1' : '', page, pageSize }), placeholderData: keepPreviousData })
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
                <section aria-label='By drive or test'>
                    <h3 className='text-[14px] font-bold text-ink mb-2'>By drive or test</h3>
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
                </section>
            )}

            <section aria-label='Candidates'>
                <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
                    <div><h3 className='text-[14px] font-bold text-ink'>Every candidate</h3><p className='text-[12.5px] text-text-secondary'>The lines behind the invoice. "Billed" adds up to the billable total above.</p></div>
                    <Button size='sm' variant='secondary' disabled={download.isPending} onClick={() => download.mutate()}><Download size={14} /> {download.isPending ? 'Preparing…' : 'Download annexure (CSV)'}</Button>
                </div>
                <div className='flex flex-wrap items-center gap-2 mb-3'>
                    <SearchInput value={search} onChange={(e) => setSearch(e.target.value.slice(0, 80))} placeholder='Search name, email or drive' className='sm:w-64' />
                    <div className='w-52'><Select aria-label='Filter by status' value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1) }} options={[{ value: '', label: 'All statuses' }, ...Object.entries(OUTCOME).map(([value, [, label]]) => ({ value, label }))]} /></div>
                    <label className='inline-flex items-center gap-2 text-[13px] text-ink cursor-pointer'><input type='checkbox' checked={billableOnly} onChange={(e) => { setBillableOnly(e.target.checked); setPage(1) }} className='w-4 h-4 accent-[var(--color-accent)]' /> Billed only</label>
                </div>
                <div className='border border-line rounded-2xl overflow-x-auto'>
                    <table className='w-full text-[13px] min-w-[760px]'>
                        <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'><tr><th className='px-4 py-2.5'>Candidate</th><th className='px-3 py-2.5'>Drive / test</th><th className='px-3 py-2.5'>Registered</th><th className='px-3 py-2.5'>Interviewed</th><th className='px-3 py-2.5'>Status</th><th className='px-3 py-2.5 text-right'>Score</th><th className='px-3 py-2.5 text-right'>Billed</th></tr></thead>
                        <tbody className='divide-y divide-line'>
                            {lines.isError && <tr><td colSpan={7} className='px-4 py-6 text-[var(--color-danger)]'>{lines.error.message}</td></tr>}
                            {lines.isLoading && <tr><td colSpan={7} className='px-4 py-6'><Skeleton className='h-6 w-full' /></td></tr>}
                            {lines.data?.items.length === 0 && <tr><td colSpan={7} className='px-4 py-8 text-center text-text-secondary'>No candidates match.</td></tr>}
                            {lines.data?.items.map((l, i) => (
                                <tr key={`${l.email}-${l.source}-${i}`}>
                                    <td className='px-4 py-2.5'><div className='font-medium text-ink'>{l.name || '—'}</div><div className='text-[11.5px] text-text-secondary break-all'>{l.email}</div></td>
                                    <td className='px-3 py-2.5'><div className='break-words'>{l.source}</div><div className='text-[11.5px] text-text-secondary'>{l.part ? <><span className='font-semibold text-ink'>{l.part}</span> · part of a combined drive</> : PRODUCT[l.product]}</div></td>
                                    <td className='px-3 py-2.5 whitespace-nowrap text-text-secondary'>{formatDay(l.registeredAt)}</td>
                                    <td className='px-3 py-2.5 whitespace-nowrap'>{l.interviewedAt ? formatWhen(l.interviewedAt) : '—'}{l.interviewsInPeriod > 1 && <span className='block text-[11.5px] text-text-secondary'>{l.interviewsInPeriod} rounds</span>}</td>
                                    <td className='px-3 py-2.5'><Badge variant={OUTCOME[l.outcome][0]} className='normal-case'>{OUTCOME[l.outcome][1]}</Badge></td>
                                    <td className='px-3 py-2.5 text-right tabular-nums'>{l.score ?? '—'}</td>
                                    <td className='px-3 py-2.5 text-right tabular-nums'>{l.units > 0 ? <span className='inline-flex items-center gap-1 font-semibold text-[var(--color-success)]'><Check size={13} aria-hidden='true' />{l.units}</span> : <span className='text-text-secondary'>—</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
