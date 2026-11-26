import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Megaphone, Pencil, Square, Trash2 } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import { AnnouncementStrip } from '../../components/AnnouncementBanner'
import { Badge, Button, ConfirmModal, EmptyState, Input, Pagination, Select, Skeleton, Textarea, useToast } from '../../components/ui'
import { createAnnouncement, deleteAnnouncement, listAnnouncements, stopAnnouncement, updateAnnouncement } from '../../api/announcementsApi'
import { formatWhen } from '../billing/billingFormat'

const DURATIONS = [['1', '1 day'], ['3', '3 days'], ['7', '1 week'], ['14', '2 weeks'], ['30', '1 month'], ['custom', 'Choose an end']]
const TONES = [['INFO', 'Information'], ['SUCCESS', 'Good news'], ['WARNING', 'Important']]
const AUDIENCES = [['ALL', 'Everyone'], ['ORGANIZATION', 'Organizations only'], ['COLLEGE', 'Colleges only']]
const STATE = { LIVE: ['success', 'Live'], SCHEDULED: ['info', 'Scheduled'], ENDED: ['neutral', 'Ended'], STOPPED: ['warning', 'Stopped'] }
const FILTERS = [['', 'All'], ['live', 'Live'], ['scheduled', 'Scheduled'], ['past', 'Past']]

const pad = (n) => String(n).padStart(2, '0')
// <input type="datetime-local"> works in the person's own time zone: "YYYY-MM-DDTHH:mm"
const toLocalInput = (date) => { const d = new Date(date); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const EMPTY = { message: '', linkUrl: '', linkLabel: '', tone: 'INFO', audience: 'ALL', duration: '7', endsAt: '', schedule: false, startsAt: '' }

function endOf(form) {
    if (form.duration === 'custom') return form.endsAt ? new Date(form.endsAt) : null
    const start = form.schedule && form.startsAt ? new Date(form.startsAt) : new Date()
    return new Date(start.getTime() + Number(form.duration) * 86400000)
}

/** The platform owner's announcements: write one, choose who sees it and for how long, and end it early if needed. */
export default function AnnouncementsPage() {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [form, setForm] = useState(EMPTY)
    const [editing, setEditing] = useState(null)
    const [errors, setErrors] = useState({})
    const [filter, setFilter] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [removing, setRemoving] = useState(null)

    const list = useQuery({ queryKey: ['admin', 'announcements', { filter, page, pageSize }], queryFn: () => listAnnouncements({ state: filter, page, pageSize }), placeholderData: keepPreviousData })
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] })
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
    const end = endOf(form)

    const save = useMutation({
        mutationFn: (body) => (editing ? updateAnnouncement(editing, body) : createAnnouncement(body)),
        onSuccess: () => { refresh(); setForm(EMPTY); setEditing(null); setErrors({}); toast.success(editing ? 'Announcement updated.' : 'Announcement published. Organizations will see it within a few minutes.') },
        onError: (err) => { setErrors(err.fields || {}); toast.error(err.message) },
    })
    const stop = useMutation({ mutationFn: stopAnnouncement, onSuccess: () => { refresh(); toast.success('Announcement ended.') }, onError: (err) => toast.error(err.message) })
    const remove = useMutation({ mutationFn: deleteAnnouncement, onSuccess: () => { refresh(); setRemoving(null); toast.success('Announcement deleted.') }, onError: (err) => { setRemoving(null); toast.error(err.message) } })

    const submit = (e) => {
        e.preventDefault()
        if (save.isPending) return
        const found = {}
        if (form.message.trim().length < 3) found.message = 'Write the announcement.'
        if (!end || Number.isNaN(end.getTime())) found.endsAt = 'Choose when it should stop showing.'
        else if (end <= new Date()) found.endsAt = 'The end must be in the future.'
        if (Object.keys(found).length) { setErrors(found); return }
        setErrors({})
        save.mutate({ message: form.message, linkUrl: form.linkUrl.trim(), linkLabel: form.linkLabel.trim(), tone: form.tone, audience: form.audience, endsAt: end.toISOString(), ...(form.schedule && form.startsAt ? { startsAt: new Date(form.startsAt).toISOString() } : {}) })
    }
    const edit = (a) => {
        setEditing(a.id); setErrors({})
        setForm({ message: a.message, linkUrl: a.linkUrl, linkLabel: a.linkLabel, tone: a.tone, audience: a.audience, duration: 'custom', endsAt: toLocalInput(a.endsAt), schedule: new Date(a.startsAt) > new Date(), startsAt: toLocalInput(a.startsAt) })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    const items = list.data?.items || []
    const preview = { id: 'preview', message: form.message.trim() || 'Your announcement appears here, exactly as organizations will see it.', linkUrl: form.linkUrl.trim(), linkLabel: form.linkLabel.trim() || (form.linkUrl.trim() ? 'Learn more' : ''), tone: form.tone }

    return (
        <AdminShell>
            <div className='max-w-[1100px] mx-auto'>
                <header className='mb-5'>
                    <h1 className='font-display text-[26px] font-bold text-ink'>Announcements</h1>
                    <p className='text-[14px] text-text-secondary mt-0.5'>Tell every organization about a launch or an update. It appears as a banner at the top of their dashboard for as long as you choose.</p>
                </header>

                <form onSubmit={submit} className='bg-card border border-line rounded-2xl p-5 space-y-4 mb-6' noValidate>
                    <h2 className='text-[15px] font-bold text-ink'>{editing ? 'Edit announcement' : 'New announcement'}</h2>
                    <Textarea id='ann-message' label='Message' rows={2} maxLength={280} value={form.message} onChange={set('message')} error={errors.message} hint={`${form.message.length}/280. Keep it short: a long one scrolls across the banner.`} placeholder='e.g. New: round-wise reports are live. See how your candidates did, round by round.' />
                    <div className='grid sm:grid-cols-2 gap-4'>
                        <Input id='ann-link' label='Link (optional)' value={form.linkUrl} onChange={set('linkUrl')} error={errors.linkUrl} placeholder='https://workmateiq.com/…' inputMode='url' />
                        <Input id='ann-label' label='Link text' value={form.linkLabel} onChange={(e) => setForm((f) => ({ ...f, linkLabel: e.target.value.slice(0, 40) }))} placeholder='Learn more' />
                    </div>
                    <div className='grid sm:grid-cols-2 gap-4'>
                        <div><label htmlFor='ann-tone' className='block text-[13.5px] font-semibold text-ink mb-2'>Style</label><Select id='ann-tone' value={form.tone} onChange={set('tone')} options={TONES.map(([value, label]) => ({ value, label }))} /></div>
                        <div><label htmlFor='ann-audience' className='block text-[13.5px] font-semibold text-ink mb-2'>Who sees it</label><Select id='ann-audience' value={form.audience} onChange={set('audience')} options={AUDIENCES.map(([value, label]) => ({ value, label }))} /></div>
                    </div>
                    <fieldset>
                        <legend className='block text-[13.5px] font-semibold text-ink mb-2'>Show it for</legend>
                        <div className='flex flex-wrap gap-2'>
                            {DURATIONS.map(([value, label]) => (
                                <label key={value} className={`inline-flex items-center px-3.5 py-2 rounded-xl border-[1.5px] text-[13px] cursor-pointer ${form.duration === value ? 'border-accent bg-accent/[0.05] font-semibold text-ink' : 'border-line text-text-secondary hover:border-accent/40'}`}>
                                    <input type='radio' name='ann-duration' className='sr-only' checked={form.duration === value} onChange={() => setForm((f) => ({ ...f, duration: value }))} />{label}
                                </label>
                            ))}
                        </div>
                        <div className='grid sm:grid-cols-2 gap-4 mt-3'>
                            {form.duration === 'custom' && <Input id='ann-end' type='datetime-local' label='Stops showing at' value={form.endsAt} onChange={set('endsAt')} error={errors.endsAt} />}
                            <div>
                                <label className='inline-flex items-center gap-2 text-[13px] text-ink cursor-pointer mb-2'><input type='checkbox' className='w-4 h-4 accent-[var(--color-accent)]' checked={form.schedule} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.checked }))} /> Start later (otherwise it starts now)</label>
                                {form.schedule && <Input id='ann-start' type='datetime-local' value={form.startsAt} onChange={set('startsAt')} error={errors.startsAt} aria-label='Starts at' />}
                            </div>
                        </div>
                        {errors.endsAt && form.duration !== 'custom' && <p role='alert' className='text-[12px] text-red-500 mt-2'>{errors.endsAt}</p>}
                        {end && !Number.isNaN(end.getTime()) && <p className='text-[12.5px] text-text-secondary mt-2'>It will stop showing on {formatWhen(end)}.</p>}
                    </fieldset>
                    <div>
                        <p className='text-[13.5px] font-semibold text-ink mb-2'>Preview</p>
                        <AnnouncementStrip announcement={preview} />
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        <Button type='submit' disabled={save.isPending}><Megaphone size={15} /> {save.isPending ? 'Publishing…' : editing ? 'Save changes' : 'Publish announcement'}</Button>
                        {editing && <Button type='button' variant='secondary' onClick={() => { setEditing(null); setForm(EMPTY); setErrors({}) }}>Cancel</Button>}
                    </div>
                </form>

                <div role='tablist' aria-label='Show' className='flex flex-wrap gap-1 mb-3'>
                    {FILTERS.map(([value, label]) => (
                        <button key={label} role='tab' aria-selected={filter === value} onClick={() => { setFilter(value); setPage(1) }} className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${filter === value ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>{label}</button>
                    ))}
                </div>
                <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                    {list.isError ? (
                        <div role='alert' className='px-6 py-10 text-center'><p className='text-[15px] font-bold text-ink'>Could not load announcements</p><p className='text-[13px] text-text-secondary mt-1 mb-4'>{list.error.message}</p><Button size='sm' variant='secondary' onClick={() => list.refetch()}>Try again</Button></div>
                    ) : list.isLoading ? (
                        <div className='p-5 space-y-3' aria-busy='true'>{[0, 1, 2].map((i) => <Skeleton key={i} className='h-14 w-full rounded-xl' />)}</div>
                    ) : items.length === 0 ? (
                        <EmptyState icon={Megaphone} title='No announcements' description='Publish one above and every organization will see it on their dashboard.' />
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full text-[13.5px] min-w-[820px]'>
                                <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'><tr><th className='px-4 py-3'>Message</th><th className='px-4 py-3'>For</th><th className='px-4 py-3'>Shows</th><th className='px-4 py-3'>Status</th><th className='px-4 py-3'><span className='sr-only'>Actions</span></th></tr></thead>
                                <tbody className='divide-y divide-line'>
                                    {items.map((a) => (
                                        <tr key={a.id}>
                                            <td className='px-4 py-3 max-w-[340px]'><p className='text-ink break-words'>{a.message}</p>{a.linkUrl && <p className='text-[12px] text-text-secondary break-all'>{a.linkLabel}: {a.linkUrl}</p>}</td>
                                            <td className='px-4 py-3 text-text-secondary whitespace-nowrap'>{(AUDIENCES.find(([v]) => v === a.audience) || [])[1]}</td>
                                            <td className='px-4 py-3 text-[12.5px] text-text-secondary whitespace-nowrap'>{formatWhen(a.startsAt)}<br />to {formatWhen(a.stoppedAt || a.endsAt)}</td>
                                            <td className='px-4 py-3'><Badge variant={STATE[a.state][0]}>{STATE[a.state][1]}</Badge></td>
                                            <td className='px-4 py-3'>
                                                <div className='flex items-center justify-end gap-1'>
                                                    <button type='button' onClick={() => edit(a)} aria-label='Edit announcement' title='Edit' className='p-2 rounded-lg text-text-secondary hover:text-ink hover:bg-black/[0.05]'><Pencil size={15} /></button>
                                                    {(a.state === 'LIVE' || a.state === 'SCHEDULED') && <button type='button' disabled={stop.isPending} onClick={() => stop.mutate(a.id)} aria-label='End now' title='End now' className='p-2 rounded-lg text-text-secondary hover:text-ink hover:bg-black/[0.05] disabled:opacity-50'><Square size={15} /></button>}
                                                    <button type='button' onClick={() => setRemoving(a)} aria-label='Delete announcement' title='Delete' className='p-2 rounded-lg text-text-secondary hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]'><Trash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {list.data && list.data.total > 0 && <Pagination page={page} pageSize={pageSize} total={list.data.total} pageSizeOptions={[10, 25, 50]} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />}

                <ConfirmModal open={Boolean(removing)} onClose={() => !remove.isPending && setRemoving(null)} danger title='Delete this announcement?' confirmLabel={remove.isPending ? 'Deleting…' : 'Delete'} onConfirm={() => remove.mutateAsync(removing.id)}>
                    It disappears from every organization's dashboard right away and from this list.
                </ConfirmModal>
            </div>
        </AdminShell>
    )
}
