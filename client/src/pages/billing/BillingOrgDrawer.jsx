import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Download, Mail, MailCheck, Phone } from 'lucide-react'
import { Badge, Button, Drawer, Pagination, SearchInput, Select, Skeleton, useToast } from '../../components/ui'
import { downloadBillingCsv, getBillingOrganization, listBillingLines, saveBillingRates } from '../../api/billingApi'

// Where the panel reads from. The platform owner reads any client; an organization reads only itself.
const ADMIN_SOURCE = { ns: 'admin', getOrganization: getBillingOrganization, listLines: listBillingLines, download: (key, params) => downloadBillingCsv(`organizations/${key}/export`, params), save: saveBillingRates }
import RateForm from './RateForm'
import { KIND, MAIL, OUTCOME, PRODUCT, UNIT_LABEL, formatDay, formatWhen, inr, num, shownKinds, usesLabel } from './billingFormat'

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

const DRIVE_TYPE = { PACKAGE: 'Test + AI interview', AI_INTERVIEW: 'AI interview', ONLINE_ASSESSMENT: 'Online test' }
const GRID_DRIVE = 'md:grid-cols-[minmax(0,2.4fr)_90px_90px_90px_110px]'
const GRID_PEOPLE = 'md:grid-cols-[minmax(0,2.2fr)_70px_110px_110px_70px_100px]'

/** Whether the invitation email went out and was opened: a plain, view-only status. */
function MailBadge({ mail, invited = true }) {
    if (!invited) return <span className='text-text-secondary'>—</span>
    const [tone, label] = MAIL[mail?.status] || ['info', 'Sent']
    return <Badge variant={tone} className='normal-case' title={mail?.openedAt ? `Opened ${formatWhen(mail.openedAt)}` : mail ? 'Not opened yet' : 'Open status is not available'}>{label}</Badge>
}

/** One drive: what it costs, with its rounds when opened. */
function DriveRow({ d, unit, open, onToggle }) {
    return (
        <div>
            <button type='button' onClick={onToggle} aria-expanded={open} className={`w-full grid grid-cols-[minmax(0,1fr)_auto] ${GRID_DRIVE} items-center gap-x-3 gap-y-0.5 px-4 py-3 text-left hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
                <span className='flex items-center gap-2 min-w-0'>
                    {open ? <ChevronDown size={16} aria-hidden='true' className='shrink-0 text-text-secondary' /> : <ChevronRight size={16} aria-hidden='true' className='shrink-0 text-text-secondary' />}
                    <span className='min-w-0'><span className='block font-medium text-ink text-[13.5px] break-words'>{d.title}</span><span className='block text-[12px] text-text-secondary'>{DRIVE_TYPE[d.product] || d.product}{d.rounds.length > 1 ? ` · ${d.rounds.length} rounds` : ''}</span></span>
                </span>
                <span className='md:hidden text-right text-[13px] font-semibold tabular-nums'>{inr(d.amountExGst)}</span>
                <span className='hidden md:block text-right tabular-nums text-[13px]'>{num(d.billableCandidates)}</span>
                <span className='hidden md:block text-right tabular-nums text-[13px]'>{num(d.invites)}</span>
                <span className='hidden md:block text-right tabular-nums text-[13px] text-[var(--color-success)]'>{num(d.gave)}</span>
                <span className='hidden md:block text-right tabular-nums text-[13.5px] font-semibold'>{inr(d.amountExGst)}</span>
            </button>
            {open && (
                <div className='bg-surface-muted/40 px-4 pb-3 pt-1 sm:pl-11'>
                    <p className='text-[12px] text-text-secondary mb-2'>{num(d.registered)} registered · {num(d.gave)} gave it · {num(d.pending + d.started)} not yet · {num(d.missed)} missed</p>
                    {d.rounds.length === 0 ? <p className='text-[12.5px] text-text-secondary'>No invitations sent in this period.</p> : (
                        <ul className='space-y-1.5'>
                            {d.rounds.map((r) => (
                                <li key={r.round} className='bg-card border border-line rounded-xl px-3 py-2 text-[12.5px] flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5'>
                                    <span className='font-semibold text-ink'>{r.title}</span>
                                    <span className='text-text-secondary'>{plural(r.candidates, 'candidate', 'candidates')} emailed</span>
                                    <span className='tabular-nums font-semibold'>{r.amountExGst === null ? <span className='font-normal text-text-secondary'>billed once for the drive</span> : inr(r.amountExGst)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {unit !== 'INTERVIEW' && d.rounds.length > 1 && <p className='text-[11.5px] text-text-secondary mt-2'>A candidate is billed once for the drive, however many rounds they are invited to.</p>}
                </div>
            )}
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
    const [view, setView] = useState('drives')
    const [open, setOpen] = useState(() => new Set())
    const toggle = (id) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
    useEffect(() => { const id = setTimeout(() => { setQ(search); setPage(1) }, 350); return () => clearTimeout(id) }, [search])

    const detail = useQuery({ queryKey: ['billing', source.ns, 'org', orgKey, period.from, period.to, product], queryFn: () => source.getOrganization(orgKey, { ...period, product }) })
    const lines = useQuery({ queryKey: ['billing', source.ns, 'lines', orgKey, period.from, period.to, product, q, outcome, billableOnly, page, pageSize], queryFn: () => source.listLines(orgKey, { ...period, product, view: 'people', search: q, outcome, billable: billableOnly ? '1' : '', page, pageSize }), placeholderData: keepPreviousData, enabled: view === 'candidates' })
    const save = useMutation({
        mutationFn: (body) => source.save(orgKey, body),
        onSuccess: () => { setSaveError(''); queryClient.invalidateQueries({ queryKey: ['billing'] }); toast.success('Rates saved. The figures are updated.') },
        onError: (err) => { setSaveError(err.message); toast.error(err.message) },
    })
    const download = useMutation({ mutationFn: () => source.download(orgKey, { ...period, product, view: view === 'drives' ? 'drives' : 'candidates' }), onError: (err) => toast.error(err.message) })

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
                <p className='text-[12px] text-text-secondary mt-2'>Billed {UNIT_LABEL[o.unit]}, when the invitation email is sent. {o.unit !== 'INTERVIEW' && o.invites > o.billableCandidates ? `${num(o.billableCandidates)} people were emailed ${num(o.invites)} times between them, so each person is billed once.` : `${plural(o.invites, 'invitation', 'invitations')} sent in this period.`}</p>
                {o.rateMissing && <p role='alert' className='text-[13px] text-[var(--color-warning)] mt-2'>{readOnly ? 'Pricing for part of this usage has not been set yet. Your account manager will confirm it.' : 'No rate is set for part of this usage. Set one below.'}</p>}
            </section>

            <details aria-label='Registered candidates' className='group'>
                <summary className='text-[14px] font-bold text-ink mb-1 cursor-pointer'>What happened after the invitation</summary>
                <p className='text-[12.5px] text-text-secondary mb-3'>Not billed on, only for your information: {num(o.conversionPercent)}% of the candidates registered in this period have given the interview so far. Awaiting approval (not counted): {num(o.awaitingApproval)}.</p>
                <Funnel s={{ registered: o.registered, gave: o.gaveOfRegistered, pending: o.pending, started: o.startedNotFinished, missed: o.missed }} />
            </details>

            {!readOnly && <section aria-label='Rate card'>
                <h3 className='text-[14px] font-bold text-ink mb-1'>Rates for this client</h3>
                <p className='text-[12.5px] text-text-secondary mb-3'>Leave a box empty to use your default. Changes apply to every period, so figures you have already sent should be saved as an export first.</p>
                <RateForm uses={o.uses} key={`${r.custom.aiRate}-${r.custom.oaRate}-${r.custom.comboRate}-${r.custom.gstPercent}-${r.custom.unit}-${r.notes}`} values={{ ...r.custom, notes: r.notes }} defaults={r.defaults} saving={save.isPending} error={saveError} onSave={(body) => save.mutate(body)} />
            </section>}

            <section aria-label='Billing detail'>
                <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
                    <div role='tablist' aria-label='View' className='inline-flex p-1 rounded-xl bg-surface-muted'>
                        {[['drives', 'By drive'], ['candidates', 'By candidate']].map(([id, label]) => (
                            <button key={id} role='tab' aria-selected={view === id} onClick={() => setView(id)} className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${view === id ? 'bg-card text-ink shadow-sm' : 'text-text-secondary hover:text-ink'}`}>{label}</button>
                        ))}
                    </div>
                    <Button size='sm' variant='secondary' disabled={download.isPending} onClick={() => download.mutate()}><Download size={14} /> {download.isPending ? 'Preparing…' : view === 'drives' ? 'Download drive-wise (CSV)' : 'Download candidate-wise (CSV)'}</Button>
                </div>

                {view === 'drives' ? (
                    <>
                        <p className='text-[12.5px] text-text-secondary mb-3'>What each drive costs. Click a drive to see its rounds. {o.unit === 'INTERVIEW' ? 'Billing is per round: every round a candidate is invited to is charged.' : 'Each candidate is billed once for a drive, however many rounds they are invited to.'}</p>
                        <div className='border border-line rounded-2xl overflow-hidden'>
                            <div className={`hidden md:grid ${GRID_DRIVE} gap-3 px-4 py-2.5 bg-surface-muted text-[12px] font-semibold text-text-secondary`} aria-hidden='true'>
                                <span className='pl-7'>Drive</span><span className='text-right'>Candidates</span><span className='text-right'>Emails sent</span><span className='text-right'>Gave it</span><span className='text-right'>Amount</span>
                            </div>
                            <div className='divide-y divide-line'>
                                {detail.data.sources.length === 0 && <p className='px-4 py-8 text-center text-text-secondary text-[13px]'>No invitations were sent in this period.</p>}
                                {detail.data.sources.map((d) => <DriveRow key={`${d.product}-${d.sourceId}`} d={d} unit={o.unit} open={open.has(`d:${d.product}-${d.sourceId}`)} onToggle={() => toggle(`d:${d.product}-${d.sourceId}`)} />)}
                            </div>
                            {detail.data.sources.length > 0 && <div className={`grid grid-cols-[minmax(0,1fr)_auto] ${GRID_DRIVE} gap-3 px-4 py-3 bg-surface-muted/60 text-[13px] font-bold`}><span className='md:pl-7'>Total (excl. GST)</span><span className='hidden md:block text-right tabular-nums'>{num(o.billableCandidates)}</span><span className='hidden md:block text-right tabular-nums'>{num(o.invites)}</span><span className='hidden md:block' /><span className='text-right tabular-nums'>{inr(o.amountExGst)}</span></div>}
                        </div>
                    </>
                ) : (
                    <>
                        <p className='text-[12.5px] text-text-secondary mb-3'>Every candidate who was emailed. Click a candidate to see which drives and rounds they were invited to, and whether they opened the email.</p>
                        <div className='flex flex-wrap items-center gap-2 mb-3'>
                            <SearchInput value={search} onChange={(e) => setSearch(e.target.value.slice(0, 80))} placeholder='Search name, email or drive' className='sm:w-64' />
                            <div className='w-52'><Select aria-label='Filter by status' value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1) }} options={[{ value: '', label: 'All statuses' }, ...Object.entries(OUTCOME).map(([value, [, label]]) => ({ value, label }))]} /></div>
                            <label className='inline-flex items-center gap-2 text-[13px] text-ink cursor-pointer'><input type='checkbox' checked={billableOnly} onChange={(e) => { setBillableOnly(e.target.checked); setPage(1) }} className='w-4 h-4 accent-[var(--color-accent)]' /> Billed only</label>
                        </div>
                        <div className='border border-line rounded-2xl overflow-hidden'>
                            <div className={`hidden md:grid ${GRID_PEOPLE} gap-3 px-4 py-2.5 bg-surface-muted text-[12px] font-semibold text-text-secondary`} aria-hidden='true'>
                                <span className='pl-7'>Candidate</span><span className='text-right'>Drives</span><span>Invited on</span><span>Email</span><span className='text-right'>Billed</span><span className='text-right'>Amount</span>
                            </div>
                            <div className='divide-y divide-line'>
                                {lines.isError && <p role='alert' className='px-4 py-6 text-[var(--color-danger)]'>{lines.error.message}</p>}
                                {lines.isLoading && <div className='p-4'><Skeleton className='h-6 w-full' /></div>}
                                {lines.data?.items.length === 0 && <p className='px-4 py-8 text-center text-text-secondary text-[13px]'>No candidates match.</p>}
                                {lines.data?.items.map((c) => {
                                    const id = `c:${c.email || c.name}`
                                    const isOpen = open.has(id)
                                    const drives = new Set(c.items.map((l) => l.source)).size
                                    const invitedItems = c.items.filter((l) => l.invitesInPeriod > 0)
                                    const opened = c.items.map((l) => l.mail?.openedAt).filter(Boolean).sort()[0]
                                    const mail = invitedItems.length ? (opened ? { status: 'OPENED', openedAt: opened } : invitedItems[0].mail) : null
                                    return (
                                        <div key={id}>
                                            <button type='button' onClick={() => toggle(id)} aria-expanded={isOpen} className={`w-full grid grid-cols-[minmax(0,1fr)_auto] ${GRID_PEOPLE} items-center gap-x-3 gap-y-0.5 px-4 py-3 text-left hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
                                                <span className='flex items-center gap-2 min-w-0'>
                                                    {isOpen ? <ChevronDown size={16} aria-hidden='true' className='shrink-0 text-text-secondary' /> : <ChevronRight size={16} aria-hidden='true' className='shrink-0 text-text-secondary' />}
                                                    <span className='min-w-0'><span className='block font-medium text-ink text-[13.5px] truncate'>{c.name || '—'}</span><span className='block text-[12px] text-text-secondary truncate'>{c.email}</span></span>
                                                </span>
                                                <span className='md:hidden text-right text-[13px] font-semibold tabular-nums'>{c.units > 0 ? inr(c.amountExGst) : '—'}</span>
                                                <span className='hidden md:block text-right tabular-nums text-[13px]'>{drives}</span>
                                                <span className='hidden md:block text-[12.5px] text-text-secondary'>{invitedItems.length ? formatDay(invitedItems.map((l) => l.invitedAt).filter(Boolean).sort()[0]) : '—'}</span>
                                                <span className='hidden md:block'><MailBadge mail={mail} invited={invitedItems.length > 0} /></span>
                                                <span className='hidden md:block text-right tabular-nums text-[13px]'>{c.units > 0 ? c.units : <span className='text-text-secondary'>—</span>}</span>
                                                <span className='hidden md:block text-right tabular-nums text-[13.5px] font-semibold'>{c.units > 0 ? inr(c.amountExGst) : <span className='font-normal text-text-secondary'>—</span>}</span>
                                            </button>
                                            {isOpen && (
                                                <div className='bg-surface-muted/40 px-4 pb-3 pt-1 sm:pl-11'>
                                                    <p className='text-[12px] text-text-secondary mb-2'>{c.phone ? `${c.phone} · ` : ''}Last activity {formatWhen(c.lastAt)}</p>
                                                    <ul className='space-y-2'>
                                                        {c.items.map((l, i) => (
                                                            <li key={i} className='bg-card border border-line rounded-xl px-3 py-2.5 text-[12.5px] grid gap-x-4 gap-y-1.5 sm:grid-cols-[1fr_auto]'>
                                                                <div className='min-w-0'>
                                                                    <div className='font-semibold text-ink break-words'>{l.source}</div>
                                                                    <div className='text-text-secondary'>{l.part ? `${l.part} · part of a combined drive` : PRODUCT[l.product]}</div>
                                                                </div>
                                                                <div className='sm:text-right'><Badge variant={OUTCOME[l.outcome][0]} className='normal-case'>{OUTCOME[l.outcome][1]}</Badge></div>
                                                                <div className='sm:col-span-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-text-secondary'>
                                                                    <span className='inline-flex items-center gap-1.5'><MailCheck size={13} aria-hidden='true' /> Email <MailBadge mail={l.mail} invited={l.invitedRounds.length > 0} />{l.mail?.openedAt ? <span>on {formatWhen(l.mail.openedAt)}</span> : null}</span>
                                                                    <span>Registered {formatDay(l.registeredAt)}</span>
                                                                    <span>Score {l.score ?? '—'}</span>
                                                                    <span>Billed {l.units > 0 ? l.units : '—'}</span>
                                                                </div>
                                                                {l.invitedRounds.length > 0 && (
                                                                    <div className='sm:col-span-2 flex flex-wrap gap-1.5'>
                                                                        {l.invitedRounds.map((r, k) => <Badge key={k} variant={r.inPeriod ? 'brand' : 'neutral'} className='normal-case'>{r.title} · emailed {formatDay(r.at)}</Badge>)}
                                                                    </div>
                                                                )}
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
                        {lines.data?.total > 0 && <Pagination page={page} pageSize={pageSize} total={lines.data.total} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />}
                    </>
                )}
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
