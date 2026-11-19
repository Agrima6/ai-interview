import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import Button from '../Button'
import ConfirmModal from '../ui/ConfirmModal'
import { useToast } from '../ui/Toast'
import { inputClass } from './oaFormat'

/** Results step of a round whose AI interview follows the organizer's review: invite everyone who scored enough. */
export default function AiInvitePanel({ assessment: a }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [min, setMin] = useState('60')
    const [confirm, setConfirm] = useState(false)
    const send = useMutation({
        mutationFn: () => oaApi.inviteToAi(a.id, { minPercent: Number(min) || 0 }),
        onSuccess: (r) => {
            queryClient.invalidateQueries({ queryKey: ['oa'] })
            setConfirm(false)
            toast.success(r.considered === 0 ? 'No one new qualifies at that score.' : `${r.invited} candidate${r.invited === 1 ? '' : 's'} invited to the AI interview${r.failed ? `, ${r.failed} could not be invited` : ''}.`)
        },
        onError: (err) => { setConfirm(false); toast.error(err.message) },
    })
    if (!a.aiPart?.enabled || a.aiPart.when !== 'AFTER_REVIEW') return null
    return (
        <section className='mb-5 rounded-2xl border-2 border-accent bg-card p-4 flex flex-wrap items-end gap-4' aria-label='Invite to the AI interview'>
            <span className='w-10 h-10 shrink-0 rounded-xl bg-accent text-white flex items-center justify-center' aria-hidden='true'><Bot size={20} strokeWidth={1.8} /></span>
            <div className='min-w-0 flex-1'>
                <h3 className='text-[14.5px] font-bold text-ink'>Invite to the AI interview</h3>
                <p className='text-[12.5px] text-text-secondary'>Review the scores, then invite everyone who scored at least this much. Candidates removed for cheating are never invited, and no one is invited twice.</p>
            </div>
            <label className='text-[12.5px] font-semibold text-ink'>Minimum score %
                <input inputMode='numeric' maxLength={3} className={`${inputClass} !w-24 mt-1`} value={min} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 3); setMin(v && Number(v) > 100 ? '100' : v) }} />
            </label>
            <Button size='sm' disabled={send.isPending} onClick={() => setConfirm(true)}>{send.isPending ? 'Inviting…' : 'Invite to AI interview'}</Button>
            <ConfirmModal open={confirm} onClose={() => setConfirm(false)} title={`Invite everyone who scored ${Number(min) || 0}% or more?`} confirmLabel='Send invitations' onConfirm={() => send.mutateAsync().catch(() => {})}>
                Each of them is added to the AI interview and emailed their invitation straight away. Anyone who still has answers waiting for your marks is judged on their score so far.
            </ConfirmModal>
        </section>
    )
}
