import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, ExternalLink, Link2, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import { buildJoinUrl } from '../../utils/publicAppUrl'
import Button from '../Button'
import ConfirmModal from '../ui/ConfirmModal'
import { useToast } from '../ui/Toast'
import { formatDateTime, fromLocalInput, inputClass, toLocalInput } from './oaFormat'
import { digitsOnly } from './oaRules'

/**
 * The open registration link: candidates register themselves and wait for approval, so the organizer does not have to
 * type anyone in. Switched off by default; every registration still has to be approved before an email goes out.
 */
export default function OpenRegistrationCard({ assessment: a, goTo }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const reg = a.registration || {}
    const link = buildJoinUrl(reg.token)
    const [closesAt, setClosesAt] = useState(toLocalInput(reg.closesAt))
    const [limit, setLimit] = useState(reg.maxRegistrations ? String(reg.maxRegistrations) : '')
    const [rotating, setRotating] = useState(false)
    const waiting = a.stats?.pending || 0

    const save = useMutation({
        mutationFn: (body) => oaApi.setRegistration(a.id, body),
        onSuccess: (_, body) => {
            queryClient.invalidateQueries({ queryKey: ['oa'] })
            setRotating(false)
            toast.success(body.rotate ? 'New link created. The old one no longer works.' : body.enabled === true ? 'Open registration is on.' : body.enabled === false ? 'Open registration is off.' : 'Saved.')
        },
        onError: (err) => { setRotating(false); toast.error(err.message) },
    })
    const copy = async () => { try { await navigator.clipboard.writeText(link); toast.success('Registration link copied.') } catch { toast.error('Could not copy. Select the link and copy it by hand.') } }
    const settingsChanged = (closesAt || '') !== toLocalInput(reg.closesAt) || limit !== (reg.maxRegistrations ? String(reg.maxRegistrations) : '')
    if (a.status === 'ARCHIVED') return null

    return (
        <section className='bg-card border border-line rounded-2xl p-5' aria-label='Open registration link'>
            <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0'>
                    <h3 className='text-[14.5px] font-bold text-ink flex items-center gap-2'><Link2 size={16} className='text-accent' aria-hidden='true' /> Let candidates register themselves</h3>
                    <p className='text-[13px] text-text-secondary mt-1'>Share one link anywhere. People register, then you approve them. Only approved people are emailed their access code.</p>
                </div>
                <button type='button' role='switch' aria-checked={Boolean(reg.enabled)} aria-label='Open registration' disabled={save.isPending} onClick={() => save.mutate({ enabled: !reg.enabled })}
                    className={`relative shrink-0 w-12 h-7 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 disabled:opacity-60 ${reg.enabled ? 'bg-[var(--color-success)]' : 'bg-line'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${reg.enabled ? 'translate-x-5' : ''}`} />
                </button>
            </div>

            {reg.enabled && link && (
                <div className='mt-4 space-y-4 oa-rise'>
                    <div className='flex items-center gap-2 rounded-xl border border-line bg-surface-muted px-3 py-2'>
                        <span className='flex-1 min-w-0 truncate font-mono text-[12.5px] text-ink' title={link}>{link}</span>
                        <button type='button' onClick={copy} aria-label='Copy the registration link' className='shrink-0 inline-flex items-center gap-1.5 min-h-[32px] px-2.5 rounded-lg text-[12.5px] font-semibold text-accent hover:bg-accent/10'><Copy size={14} /> Copy</button>
                        <a href={link} target='_blank' rel='noreferrer' aria-label='Open the registration page in a new tab' className='shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10'><ExternalLink size={15} /></a>
                    </div>
                    <div className='grid sm:grid-cols-2 gap-3'>
                        <div>
                            <label htmlFor='reg-closes' className='block text-[12.5px] font-semibold text-ink mb-1.5'>Closes on <span className='font-normal text-text-secondary'>(optional)</span></label>
                            <input id='reg-closes' type='datetime-local' className={inputClass} value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
                            <p className='text-[12px] text-text-secondary mt-1'>{reg.closesAt ? `Closes ${formatDateTime(reg.closesAt)}.` : 'Stays open until you switch it off.'}</p>
                        </div>
                        <div>
                            <label htmlFor='reg-limit' className='block text-[12.5px] font-semibold text-ink mb-1.5'>Most registrations <span className='font-normal text-text-secondary'>(optional)</span></label>
                            <input id='reg-limit' inputMode='numeric' className={inputClass} value={limit} placeholder='No limit' onChange={(e) => setLimit(digitsOnly(e.target.value, 6))} />
                            <p className='text-[12px] text-text-secondary mt-1'>Registration closes by itself when this many have registered.</p>
                        </div>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Button size='sm' disabled={!settingsChanged || save.isPending} onClick={() => save.mutate({ closesAt: closesAt ? fromLocalInput(closesAt) : null, maxRegistrations: limit ? Number(limit) : null })}>{save.isPending ? 'Saving…' : 'Save'}</Button>
                        <Button size='sm' variant='ghost' disabled={save.isPending} onClick={() => setRotating(true)}><RefreshCw size={14} /> Create a new link</Button>
                        {waiting > 0 && <Button size='sm' variant='secondary' className='ml-auto' onClick={() => goTo('candidates')}><Users size={14} /> {waiting} waiting for approval</Button>}
                    </div>
                    <p className='text-[12px] text-text-secondary flex items-start gap-1.5'><ShieldCheck size={13} className='mt-0.5 shrink-0' aria-hidden='true' /> Registering does not let anyone sit the test. People already on your list are not added twice.</p>
                </div>
            )}

            <ConfirmModal open={rotating} onClose={() => setRotating(false)} title='Create a new registration link?' confirmLabel='Create new link' onConfirm={() => save.mutateAsync({ rotate: true }).catch(() => {})}>
                The current link stops working at once, so anyone who has it will see an error. People who already registered stay on your list.
            </ConfirmModal>
        </section>
    )
}
