import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Bot, ChevronRight, ClipboardCheck, Mail, Plus, X } from 'lucide-react'
import { Choice } from './RoundKindChoice'
import { oaApi } from '../../api/oaApi'
import Button from '../Button'
import { useToast } from '../ui/Toast'
import AiInterviewPicker from './AiInterviewPicker'

/**
 * "Add an AI interview to this round": the candidates take the test and, as soon as they submit it, are invited to the
 * AI interview too. One round, two parts. Sits right under the round type so nobody has to hunt for it.
 */
export default function AiPartCard({ assessment: a, drive, disabled = false, showPrompt = true }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const part = a.aiPart || { enabled: false, aiInterviewDriveId: null }
    const save = useMutation({
        mutationFn: (next) => oaApi.updateAssessment(a.id, { aiPart: next }),
        onSuccess: (_, next) => { queryClient.invalidateQueries({ queryKey: ['oa'] }); toast.success(next.enabled ? 'AI interview added to this round.' : 'AI interview removed from this round.') },
        onError: (err) => toast.error(err.message),
    })
    // "Add" only opens the chooser; it is saved once an AI interview is picked or set up.
    const [params, setParams] = useSearchParams()
    const [localOpen, setOpen] = useState(false)
    const open = part.enabled || localOpen || params.get('ai') === '1'
    // Remembered locally until an AI interview is chosen, so picking "when" first is not lost.
    const [picked, setPicked] = useState(part.when || 'AFTER_SUBMIT')
    const when = part.aiInterviewDriveId ? (part.when || 'AFTER_SUBMIT') : picked
    const remove = () => { setOpen(false); setParams((p) => { const n = new URLSearchParams(p); n.delete('ai'); return n }, { replace: true }); if (part.enabled) save.mutate({ enabled: false, aiInterviewDriveId: part.aiInterviewDriveId, roundNumber: part.roundNumber || 1, when }) }
    const choose = (id) => save.mutate({ enabled: Boolean(id), aiInterviewDriveId: id || null, roundNumber: 1, when })
    const setWhen = (next) => { setPicked(next); if (next !== when && part.aiInterviewDriveId) save.mutate({ enabled: part.enabled, aiInterviewDriveId: part.aiInterviewDriveId, roundNumber: part.roundNumber || 1, when: next }) }

    if (!open) {
        if (!showPrompt) return null
        return (
            <section className='mb-5 rounded-2xl border-2 border-dashed border-accent/40 bg-accent/[0.04] p-4 sm:p-5 flex flex-wrap items-center gap-4' aria-label='Add an AI interview to this round'>
                <span className='w-11 h-11 shrink-0 rounded-xl bg-accent text-white flex items-center justify-center' aria-hidden='true'><Bot size={22} strokeWidth={1.8} /></span>
                <div className='min-w-0 flex-1'>
                    <h3 className='text-[15px] font-bold text-ink'>Want an AI interview in this round too?</h3>
                    <p className='text-[13px] text-text-secondary mt-0.5'>Candidates take this test, then get a short AI interview straight after. One round, both parts.</p>
                </div>
                <Button size='sm' disabled={disabled} onClick={() => setOpen(true)}><Plus size={15} /> Add AI interview</Button>
            </section>
        )
    }

    return (
        <section className='mb-5 rounded-2xl border-2 border-accent bg-card p-4 sm:p-5' aria-busy={save.isPending} aria-label='AI interview part of this round'>
            <div className='flex items-start gap-3'>
                <span className='w-11 h-11 shrink-0 rounded-xl bg-accent text-white flex items-center justify-center' aria-hidden='true'><Bot size={22} strokeWidth={1.8} /></span>
                <div className='min-w-0 flex-1'>
                    <div className='flex items-start justify-between gap-3'>
                        <div>
                            <h3 className='text-[15px] font-bold text-ink'>AI interview in this round</h3>
                            <p className='text-[13px] text-text-secondary mt-0.5'>One round: the AI interview follows the test questions.</p>
                        </div>
                        <Button size='sm' variant='secondary' disabled={disabled || save.isPending} onClick={remove}><X size={14} /> Remove</Button>
                    </div>
                    <p className='mt-4 text-[13px] font-semibold text-ink'>When do candidates get the AI interview?</p>
                    <fieldset className='mt-2 grid sm:grid-cols-2 gap-3' disabled={disabled || save.isPending}>
                        <Choice name={`ai-when-${a.id}`} selected={when === 'AFTER_SUBMIT'} onSelect={() => setWhen('AFTER_SUBMIT')} icon={Mail} title='Right after the test, in one sitting' text='Candidates finish the test and go straight into the AI interview on the same screen. No email, no new sign-in.' />
                        <Choice name={`ai-when-${a.id}`} selected={when === 'AFTER_REVIEW'} onSelect={() => setWhen('AFTER_REVIEW')} icon={ClipboardCheck} title='After I review the scores' text='Nobody is invited until you choose, e.g. everyone who scored 60% or more (in Results).' />
                    </fieldset>
                    <ol className='mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[12.5px]' aria-label='What each candidate does, in order'>
                        <li className='inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 font-semibold text-ink'><ClipboardCheck size={13} aria-hidden='true' /> Takes this test</li>
                        <ChevronRight size={14} className='text-text-secondary' aria-hidden='true' />
                        <li className='inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 font-semibold text-ink'><Mail size={13} aria-hidden='true' /> {when === 'AFTER_SUBMIT' ? 'Continues automatically' : 'You review, then invite'}</li>
                        <ChevronRight size={14} className='text-text-secondary' aria-hidden='true' />
                        <li className='inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 font-semibold text-accent'><Bot size={13} aria-hidden='true' /> Takes the AI interview</li>
                    </ol>
                    <div className='mt-4 border-t border-line pt-4'>
                        <AiInterviewPicker value={part.aiInterviewDriveId} onChange={choose} disabled={disabled} pending={save.isPending}
                            getPrefill={async () => ({ partOfTest: true, onCandidates: async (list) => { await oaApi.addStudents(a.id, list.map((c) => ({ name: c.name, email: c.email, phone: c.phone || undefined }))); queryClient.invalidateQueries({ queryKey: ['oa'] }); toast.success(`${list.length} candidate${list.length === 1 ? '' : 's'} added to the test round.`) }, title: `${drive?.title || a.title} · AI interview`, department: drive?.department, roleCategory: drive?.roleCategory, experienceLevel: drive?.experienceLevel })} />
                    </div>
                    {part.enabled && part.aiInterviewDriveId && (
                        <div role='status' className='mt-4 rounded-xl bg-[var(--color-warning-soft)] px-4 py-3 text-[13px] text-ink'>
                            <p className='font-bold'>The AI interview is ready, but nothing has been sent yet.</p>
                            <p className='mt-0.5 text-text-secondary'>It only runs after the test. Still to do for this round: add the test questions (step 1), the candidates (step 2), the schedule (step 3), then <b>Publish &amp; invite</b> (step 4) to send the test. Candidates will move on to the AI interview by themselves.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
