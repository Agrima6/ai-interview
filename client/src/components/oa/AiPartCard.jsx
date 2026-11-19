import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import { useToast } from '../ui/Toast'
import AiInterviewPicker from './AiInterviewPicker'

/**
 * "Add an AI interview to this round": the candidates take the test and, as soon as they submit it, are invited to the
 * AI interview too. One round, two parts, one place for the organizer to follow it.
 */
export default function AiPartCard({ assessment: a, disabled = false }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const part = a.aiPart || { enabled: false, aiInterviewDriveId: null }
    const save = useMutation({
        mutationFn: (next) => oaApi.updateAssessment(a.id, { aiPart: next }),
        onSuccess: (_, next) => { queryClient.invalidateQueries({ queryKey: ['oa'] }); toast.success(next.enabled ? 'AI interview added to this round.' : 'AI interview removed from this round.') },
        onError: (err) => toast.error(err.message),
    })
    // Switching on only opens the chooser; it is saved once an AI interview is picked or set up.
    const [open, setOpen] = useState(part.enabled)
    const toggle = (next) => {
        setOpen(next)
        if (part.enabled !== next && (!next || part.aiInterviewDriveId)) save.mutate({ enabled: next, aiInterviewDriveId: part.aiInterviewDriveId, roundNumber: part.roundNumber || 1 })
    }
    const choose = (id) => save.mutate({ enabled: Boolean(id), aiInterviewDriveId: id || null, roundNumber: 1 })

    return (
        <section className='mb-5 rounded-2xl border border-line bg-card p-4 sm:p-5' aria-busy={save.isPending} aria-label='AI interview part of this round'>
            <div className='flex items-start gap-3'>
                <span className='w-10 h-10 shrink-0 rounded-xl bg-surface-muted text-text-secondary flex items-center justify-center' aria-hidden='true'><Bot size={19} strokeWidth={1.8} /></span>
                <div className='min-w-0 flex-1'>
                    <div className='flex items-start justify-between gap-3'>
                        <div>
                            <h3 className='text-[14px] font-bold text-ink'>Also run an AI interview in this round</h3>
                            <p className='text-[12.5px] text-text-secondary mt-0.5'>Candidates take this test, then are invited to a short AI interview straight after they submit. No separate round needed.</p>
                        </div>
                        <label className='inline-flex items-center gap-2 shrink-0 text-[13px] font-semibold text-ink cursor-pointer'>
                            <input type='checkbox' role='switch' className='w-4 h-4 accent-[var(--color-primary)]' checked={open} disabled={disabled || save.isPending}
                                onChange={(e) => toggle(e.target.checked)} />
                            {open ? 'On' : 'Off'}
                        </label>
                    </div>
                    {open && (
                        <div className='mt-4 border-t border-line pt-4'>
                            <AiInterviewPicker value={part.aiInterviewDriveId} onChange={choose} disabled={disabled} pending={save.isPending} />
                            {part.enabled && part.aiInterviewDriveId && <p className='text-[12.5px] text-text-secondary mt-3'>Anyone who submits the test (not anyone removed for cheating) is added and emailed their AI interview invitation automatically. Results of the interview are in AI Interview.</p>}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
