import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronRight, Download, Info, SlidersHorizontal } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import { Badge, Button, EmptyState, Modal, SearchInput, Skeleton, useToast } from '../../components/ui'
import { downloadBillingCsv, getBillingSummary, saveBillingRates } from '../../api/billingApi'
import { useQueryClient } from '@tanstack/react-query'
import BillingOrgDrawer from './BillingOrgDrawer'
import RateForm from './RateForm'
import { KIND, PERIOD_PRESETS, formatDay, inr, istToday, monthLabel, num, presetRange, shownKinds, usesLabel } from './billingFormat'

const STATUS_TONE = { ACTIVE: 'success', SUSPENDED: 'warning', REJECTED: 'danger', PENDING: 'neutral' }

function Stat({ label, value, hint, tone = 'text-ink' }) {
    return (
        <div className='px-4 py-4 min-w-0'>
            <dt className='text-[12px] font-semibold text-text-secondary'>{label}</dt>
            <dd className={`font-display text-[26px] leading-tight font-bold tabular-nums ${tone}`}>{value}</dd>
            {hint && <p className='text-[11.5px] text-text-secondary mt-0.5'>{hint}</p>}
        </div>
    )
}

// Six months of billable candidates, so a drop or a jump is visible without opening a spreadsheet.
function Trend({ trend }) {
    const max = Math.max(1, ...trend.map((m) => m.candidates))
    return (
        <section aria-label='Last six months' className='border border-line rounded-2xl bg-card px-5 py-4'>
            <h2 className='text-[13px] font-bold text-ink mb-3'>Candidates emailed, last six months <span className='font-normal text-text-secondary'>(amounts at today's rates, before GST)</span></h2>
            <ol className='grid grid-cols-6 gap-2 sm:gap-4 items-end'>
                {trend.map((m, i) => (
                    <li key={m.month} className='flex flex-col items-center min-w-0'>
                        <span className='text-[12px] font-bold text-ink tabular-nums'>{num(m.candidates)}</span>
                        <div className='w-full max-w-[56px] h-24 flex items-end mt-1'>
                            <div className={`w-full rounded-t-lg ${i === trend.length - 1 ? 'bg-accent' : 'bg-accent/35'}`} style={{ height: `${Math.max(m.candidates ? 6 : 2, (m.candidates / max) * 100)}%` }} title={`${monthLabel(m.month)}: ${m.candidates} candidates, ${m.invites} invitations`} />
                        </div>
                        <span className='text-[11.5px] text-text-secondary mt-1.5'>{monthLabel(m.month)}</span>
                        <span className='text-[11px] text-text-secondary tabular-nums'>{inr(m.amountExGst)}</span>
                    </li>
                ))}
            </ol>
        </section>
    )
}

function SortHead({ label, field, sort, onSort, align = 'right' }) {
    const active = sort.field === field
    return (
        <th scope='col' aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-3 ${align === 'right' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
            <button type='button' onClick={() => onSort(field)} className={`inline-flex items-center gap-1 font-semibold hover:text-ink ${active ? 'text-ink' : 'text-text-secondary'}`}>
                {label}{active && (sort.dir === 'asc' ? <ArrowUp size={12} aria-hidden='true' /> : <ArrowDown size={12} aria-hidden='true' />)}
            </button>
        </th>
    )
}

/** The super admin's billing view: what every client owes for candidates who gave the interview, with the funnel behind it. */
export default function BillingPage() {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [params, setParams] = useSearchParams()
    const preset = params.get('preset') || (params.get('from') ? 'custom' : 'thisMonth')
    const range = preset === 'custom' ? { from: params.get('from') || presetRange('thisMonth').from, to: params.get('to') || istToday() } : presetRange(preset)
    const product = params.get('product') || ''
    const idle = params.get('idle') === '1'
    const orgKey = params.get('org') || ''
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState({ field: 'billable', dir: 'desc' })
    const [rates, setRates] = useState(false)
    const [rateError, setRateError] = useState('')
    const [explain, setExplain] = useState(false)

    const update = (patch) => setParams((prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
        return next
    }, { replace: true })

    const summary = useQuery({ queryKey: ['billing', 'summary', range.from, range.to, product, idle], queryFn: () => getBillingSummary({ ...range, product, includeIdle: idle ? '1' : '' }), placeholderData: keepPreviousData })
    const exportAll = useMutation({ mutationFn: () => downloadBillingCsv('export', { ...range, product, includeIdle: idle ? '1' : '' }), onError: (err) => toast.error(err.message) })
    const saveDefaults = useMutation({
        mutationFn: (body) => saveBillingRates('DEFAULT', body),
        onSuccess: () => { setRateError(''); setRates(false); queryClient.invalidateQueries({ queryKey: ['billing'] }); toast.success('Default rates saved.') },
        onError: (err) => { setRateError(err.message); toast.error(err.message) },
    })

    const data = summary.data
    const rows = useMemo(() => {
        const term = search.trim().toLowerCase()
        const key = { name: (o) => o.name.toLowerCase(), registered: (o) => o.registered, gave: (o) => o.gaveOfRegistered, conversion: (o) => o.conversionPercent, invites: (o) => o.invites, billable: (o) => o.billableUnits, amount: (o) => o.amountExGst, total: (o) => o.total }[sort.field]
        const list = (data?.organizations || []).filter((o) => !term || `${o.name} ${o.email} ${o.contactName}`.toLowerCase().includes(term))
        return [...list].sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * (sort.dir === 'asc' ? 1 : -1))
    }, [data, search, sort])
    const onSort = (field) => setSort((s) => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: field === 'name' ? 'asc' : 'desc' }))
    const t = data?.totals

    return (
        <AdminShell>
            <div className='max-w-[1280px] mx-auto'>
                <header className='flex flex-wrap items-end justify-between gap-3 mb-5'>
                    <div>
                        <h1 className='font-display text-[26px] font-bold text-ink'>Billing</h1>
                        <p className='text-[14px] text-text-secondary mt-0.5'>Billing across every client, by drive and by candidate. A candidate is billed when their invitation email is sent.</p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        <Button size='sm' variant='secondary' onClick={() => { setRateError(''); setRates(true) }}><SlidersHorizontal size={14} /> Default rates</Button>
                        <Button size='sm' disabled={exportAll.isPending || !data} onClick={() => exportAll.mutate()}><Download size={14} /> {exportAll.isPending ? 'Preparing…' : 'Export all clients (CSV)'}</Button>
                    </div>
                </header>

                <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4'>
                    <div role='tablist' aria-label='Period' className='flex flex-wrap gap-1'>
                        {PERIOD_PRESETS.map((p) => (
                            <button key={p.id} role='tab' aria-selected={preset === p.id} onClick={() => update({ preset: p.id === 'thisMonth' ? '' : p.id, from: '', to: '' })}
                                className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${preset === p.id ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>{p.label}</button>
                        ))}
                        <button role='tab' aria-selected={preset === 'custom'} onClick={() => update({ preset: 'custom', from: range.from, to: range.to })}
                            className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${preset === 'custom' ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>Custom</button>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                        {preset === 'custom' && (
                            <div className='flex items-center gap-1.5 text-[13px]'>
                                <label className='sr-only' htmlFor='bill-from'>From</label><input id='bill-from' type='date' max={range.to} value={range.from} onChange={(e) => e.target.value && update({ preset: 'custom', from: e.target.value })} className='bg-card border border-line rounded-lg px-2.5 py-1.5 text-[13px]' />
                                <span className='text-text-secondary'>to</span>
                                <label className='sr-only' htmlFor='bill-to'>To</label><input id='bill-to' type='date' min={range.from} max={istToday()} value={range.to} onChange={(e) => e.target.value && update({ preset: 'custom', to: e.target.value })} className='bg-card border border-line rounded-lg px-2.5 py-1.5 text-[13px]' />
                            </div>
                        )}
                    </div>
                </div>
                <p className='text-[12.5px] text-text-secondary mb-3'>{formatDay(`${range.from}T00:00:00+05:30`)} to {formatDay(`${range.to}T00:00:00+05:30`)} (Indian time)
                    <button type='button' onClick={() => setExplain((v) => !v)} aria-expanded={explain} className='ml-3 inline-flex items-center gap-1 font-semibold text-accent hover:underline'><Info size={13} aria-hidden='true' /> How billing is counted</button></p>
                {explain && (
                    <div className='mb-4 rounded-2xl border border-line bg-surface-muted/60 px-5 py-4 text-[13px] text-ink space-y-1.5' role='note'>
                        <p><b>Emails sent</b>: invitation emails that went out to candidates in this period. This is what is billed: a candidate is charged once their email is sent, whether or not they sit it.</p>
                        <p><b>Billable</b>: the unique candidates emailed in this period. Someone invited to two rounds is billed once, unless a client is set to bill per round, when every round counts.</p>
                        <p><b>Registered</b> and <b>gave the interview</b> are shown for your information. Candidates who only registered through the open link, and are never emailed, are not billed.</p>
                    </div>
                )}

                {summary.isError ? (
                    <div role='alert' className='border border-line rounded-2xl bg-card px-6 py-10 text-center'>
                        <p className='text-[15px] font-bold text-ink'>Could not load billing</p>
                        <p className='text-[13px] text-text-secondary mt-1 mb-4'>{summary.error.message}</p>
                        <Button size='sm' variant='secondary' onClick={() => summary.refetch()}>Try again</Button>
                    </div>
                ) : summary.isLoading ? (
                    <div className='space-y-4' aria-busy='true' aria-label='Loading billing'><Skeleton className='h-36 w-full rounded-2xl' /><Skeleton className='h-28 w-full rounded-2xl' /><Skeleton className='h-72 w-full rounded-2xl' /></div>
                ) : (
                    <div className={`space-y-5 transition-opacity ${summary.isFetching ? 'opacity-70' : ''}`}>
                        <section aria-label='Totals' className='border border-line rounded-2xl bg-card overflow-hidden'>
                            <dl className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-line md:divide-x gap-y-px'>
                                <Stat label='Registered' value={num(t.registered)} hint={`${num(t.organizations)} client${t.organizations === 1 ? '' : 's'} with activity`} />
                                <Stat label='Emails sent' value={num(t.invites)} hint='invitations in this period' tone='text-accent' />
                                <Stat label='Billable candidates' value={num(t.billableCandidates)} hint='emailed at least once' tone='text-accent' />
                                <Stat label='Gave the interview' value={num(t.gaveOfRegistered)} hint='of those registered (not billed on)' tone='text-[var(--color-success)]' />
                                <Stat label='Still to interview' value={num(t.pending + t.startedNotFinished)} hint={`${num(t.startedNotFinished)} started, not finished`} />
                                <Stat label='Missed' value={num(t.missed)} hint='round closed first' tone={t.missed ? 'text-[var(--color-danger)]' : 'text-ink'} />
                            </dl>
                            <div className='grid sm:grid-cols-3 bg-ink text-white divide-white/15 sm:divide-x'>
                                <div className='px-5 py-3.5'><p className='text-[12px] text-white/70'>Amount before GST</p><p className='font-display text-[24px] font-bold tabular-nums'>{inr(t.amountExGst)}</p><p className='text-[11.5px] text-white/60'>{[t.comboAmount > 0 && `Test + AI ${inr(t.comboAmount)}`, t.oaAmount > 0 && `Online tests ${inr(t.oaAmount)}`, t.aiAmount > 0 && `AI ${inr(t.aiAmount)}`].filter(Boolean).join(' · ') || 'Nothing to bill yet'}</p></div>
                                <div className='px-5 py-3.5'><p className='text-[12px] text-white/70'>GST</p><p className='font-display text-[24px] font-bold tabular-nums'>{inr(t.gstAmount)}</p></div>
                                <div className='px-5 py-3.5'><p className='text-[12px] text-white/70'>Total to invoice</p><p className='font-display text-[28px] font-bold tabular-nums'>{inr(t.total)}</p></div>
                            </div>
                        </section>

                        {t.ratesMissing > 0 && (
                            <div role='alert' className='flex flex-wrap items-center gap-3 rounded-xl bg-[var(--color-warning-soft)] text-[var(--color-warning)] px-4 py-3 text-[13px]'>
                                <AlertTriangle size={16} className='shrink-0' aria-hidden='true' />
                                <span><b>{t.ratesMissing} client{t.ratesMissing === 1 ? ' has' : 's have'} billable candidates but no rate.</b> Their amount shows as ₹0 until you set one.</span>
                                <button type='button' onClick={() => { setRateError(''); setRates(true) }} className='font-semibold underline'>Set default rates</button>
                            </div>
                        )}

                        <Trend trend={data.trend} />

                        <section aria-label='Clients'>
                            <div className='flex flex-wrap items-center justify-between gap-3 mb-3'>
                                <SearchInput value={search} onChange={(e) => setSearch(e.target.value.slice(0, 80))} placeholder='Search clients' className='sm:w-72' />
                                <label className='inline-flex items-center gap-2 text-[13px] text-ink cursor-pointer'><input type='checkbox' checked={idle} onChange={(e) => update({ idle: e.target.checked ? '1' : '' })} className='w-4 h-4 accent-[var(--color-accent)]' /> Include clients with no activity</label>
                            </div>
                            <div className='border border-line rounded-2xl bg-card overflow-x-auto'>
                                {rows.length === 0 ? (
                                    <EmptyState compact title={search ? 'No clients match' : 'No activity in this period'} description={search ? 'Try a different name.' : 'No candidates registered or gave an interview between these dates. Try another period.'} />
                                ) : (
                                    <table className='w-full text-[13.5px] min-w-[900px]'>
                                        <thead className='bg-surface-muted text-[12px] sticky top-0'>
                                            <tr>
                                                <SortHead label='Client' field='name' sort={sort} onSort={onSort} align='left' />
                                                <SortHead label='Registered' field='registered' sort={sort} onSort={onSort} />
                                                <SortHead label='Emails sent' field='invites' sort={sort} onSort={onSort} />
                                                <SortHead label='Billable' field='billable' sort={sort} onSort={onSort} />
                                                <th scope='col' className='px-3 py-3 text-right font-semibold text-text-secondary whitespace-nowrap'>Rate</th>
                                                <SortHead label='Amount' field='amount' sort={sort} onSort={onSort} />
                                                <SortHead label='With GST' field='total' sort={sort} onSort={onSort} />
                                                <th className='px-2 py-3 w-8'><span className='sr-only'>Open</span></th>
                                            </tr>
                                        </thead>
                                        <tbody className='divide-y divide-line'>
                                            {rows.map((o) => (
                                                <tr key={o.key} className='ui-row group cursor-pointer' onClick={() => update({ org: o.key })}>
                                                    <td className='px-4 py-3 max-w-[280px]'>
                                                        <button type='button' onClick={(e) => { e.stopPropagation(); update({ org: o.key }) }} className='font-semibold text-ink hover:text-accent text-left break-words'>{o.name}</button>
                                                        <div className='flex flex-wrap items-center gap-1.5 mt-0.5'><Badge variant='neutral'>{KIND[o.kind] || o.kind}</Badge>{usesLabel(o.uses) && <Badge variant='brand' className='normal-case'>{usesLabel(o.uses)}</Badge>}{o.status !== 'ACTIVE' && <Badge variant={STATUS_TONE[o.status] || 'neutral'}>{o.status}</Badge>}{o.hasCustomRate && <span className='text-[11px] text-text-secondary'>custom rate</span>}</div>
                                                    </td>
                                                    <td className='px-3 py-3 text-right tabular-nums'>{num(o.registered)}{o.awaitingApproval > 0 && <span className='block text-[11px] text-text-secondary' title='Registered through the open link and not yet approved'>+{o.awaitingApproval} awaiting</span>}</td>
                                                    <td className='px-3 py-3 text-right tabular-nums'>{num(o.invites)}</td>
                                                    <td className='px-3 py-3 text-right tabular-nums font-semibold'>{num(o.billableUnits)}<span className='block text-[11px] font-normal text-text-secondary'>{o.unit === 'INTERVIEW' ? 'rounds' : 'candidates'}</span></td>
                                                    <td className='px-3 py-3 text-right tabular-nums text-[12.5px]'>{o.rateMissing ? <span className='text-[var(--color-warning)] font-semibold'>No rate</span> : <>{shownKinds(o.uses).combo && <div>Test + AI {inr(o.comboRate)}</div>}{shownKinds(o.uses).oa && <div>Test {inr(o.oaRate)}</div>}{shownKinds(o.uses).ai && <div>AI {inr(o.aiRate)}</div>}</>}</td>
                                                    <td className='px-3 py-3 text-right tabular-nums'>{inr(o.amountExGst)}</td>
                                                    <td className='px-3 py-3 text-right tabular-nums font-bold text-ink'>{inr(o.total)}</td>
                                                    <td className='px-2 py-3 text-text-secondary'><ChevronRight size={16} className='transition-transform group-hover:translate-x-0.5 group-hover:text-accent' aria-hidden='true' /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className='bg-surface-muted font-bold text-ink'>
                                                <td className='px-4 py-3'>Total ({rows.length}{search ? ' shown' : ''})</td>
                                                <td className='px-3 py-3 text-right tabular-nums'>{num(rows.reduce((s, o) => s + o.registered, 0))}</td>
                                                <td className='px-3 py-3 text-right tabular-nums'>{num(rows.reduce((s, o) => s + o.invites, 0))}</td>
                                                <td className='px-3 py-3 text-right tabular-nums'>{num(rows.reduce((s, o) => s + o.billableUnits, 0))}</td>
                                                <td />
                                                <td className='px-3 py-3 text-right tabular-nums'>{inr(rows.reduce((s, o) => s + o.amountExGst, 0))}</td>
                                                <td className='px-3 py-3 text-right tabular-nums'>{inr(rows.reduce((s, o) => s + o.total, 0))}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                            <p className='text-[12px] text-text-secondary mt-2'>Select a client to see its invoice summary, change its rates, and download the line-by-line annexure.</p>
                        </section>
                    </div>
                )}
            </div>

            <BillingOrgDrawer orgKey={orgKey} period={range} product={product} onClose={() => update({ org: '' })} />
            <Modal open={rates} onClose={() => !saveDefaults.isPending && setRates(false)} title='Default rates' size='lg'>
                <p className='text-[13px] text-text-secondary mb-4'>These apply to every client that has no rate of its own. A client can be given its own rates from its billing panel.</p>
                {data && <RateForm isDefault values={data.defaults} defaults={data.defaults} saving={saveDefaults.isPending} error={rateError} onSave={(body) => saveDefaults.mutate(body)} />}
            </Modal>
        </AdminShell>
    )
}
