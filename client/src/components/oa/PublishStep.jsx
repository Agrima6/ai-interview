import React, { useState } from 'react'
import { motion as M } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowRight, CalendarClock, Check, CheckCircle2, Copy, ExternalLink, ListChecks, Rocket, Send, Undo2, Users } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import { buildExamUrl } from '../../utils/publicAppUrl'
import Button from '../Button'
import ConfirmModal from '../ui/ConfirmModal'
import { useToast } from '../ui/Toast'
import { PhaseBadge } from './oaUi'
import OpenRegistrationCard from './OpenRegistrationCard'
import { scheduleSentence } from './oaFormat'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function CheckRow({ done, optional, icon, title, text, action, onAction, index }) {
    const Icon = icon
    return (
        <M.li initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, duration: 0.3 }}
            className={`flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 ${done ? 'border-[var(--color-success)]/30 bg-[var(--color-success-soft)]' : 'border-line bg-card'}`}>
            <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${done ? 'bg-[var(--color-success)] text-white' : 'bg-surface-muted text-text-secondary'}`} aria-hidden='true'>
                {done ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
            </span>
            <div className='min-w-0 flex-1'>
                <p className='text-[14px] font-bold text-ink'>{title} <span className={`ml-1 text-[11.5px] font-semibold ${done ? 'text-[var(--color-success)]' : optional ? 'text-text-secondary' : 'text-[var(--color-warning)]'}`}>{done ? 'Done' : optional ? 'Can be done later' : 'To do'}</span></p>
                <p className='text-[12.5px] text-text-secondary mt-0.5'>{text}</p>
            </div>
            <Button size='xs' variant={done ? 'ghost' : 'secondary'} onClick={onAction}>{action} <ArrowRight size={13} /></Button>
        </M.li>
    )
}

/** Step 4 of a test round: the last check, the Publish button, then the candidate link and invitations. */
export default function PublishStep({ assessment: a, driveArchived, goTo }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [confirm, setConfirm] = useState(null)
    const students = a.stats?.students || 0
    const scheduled = Boolean(a.schedule?.startAt && a.schedule?.endAt)
    const ready = a.questionCount > 0 && scheduled
    const published = a.status === 'PUBLISHED'
    const archived = a.status === 'ARCHIVED'
    const link = buildExamUrl(a.id)

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['oa'] })
    const act = useMutation({
        mutationFn: (kind) => ({ publish: oaApi.publish, unpublish: oaApi.unpublish, archive: oaApi.archive })[kind](a.id),
        onSuccess: (_, kind) => { refresh(); setConfirm(null); toast.success({ publish: 'Published. Now invite your candidates.', unpublish: 'Moved back to draft.', archive: 'Round archived.' }[kind]) },
        onError: (err) => { setConfirm(null); toast.error(err.message) },
    })
    const invite = useMutation({
        mutationFn: () => oaApi.invite(a.id, {}),
        onSuccess: (r) => {
            refresh(); setConfirm(null)
            if (!r.attempted) toast.info('Everyone on the list has already been emailed.')
            else if (r.failed.length) toast.warning(`${r.sent} sent, ${r.failed.length} could not be emailed. Their access codes are in step 2.`)
            else toast.success(`${plural(r.sent, 'invitation')} sent.`)
        },
        onError: (err) => { setConfirm(null); toast.error(err.message) },
    })
    const copy = async () => { try { await navigator.clipboard.writeText(link); toast.success('Link copied.') } catch { toast.error('Could not copy. Select the link and copy it by hand.') } }

    if (archived) {
        return (
            <div className='rounded-2xl border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] px-5 py-5'>
                <p className='text-[15px] font-bold text-ink'>This round is archived</p>
                <p className='text-[13.5px] text-text-secondary mt-1'>Candidates can no longer sign in. Everything already recorded stays stored.</p>
                {!a.locked && !driveArchived && <Button size='sm' variant='secondary' className='mt-4' disabled={act.isPending} onClick={() => act.mutate('unpublish')}><Undo2 size={15} /> {act.isPending ? 'Restoring…' : 'Restore as a draft'}</Button>}
            </div>
        )
    }

    return (
        <div className='space-y-5'>
            {!published ? (
                <>
                    <ul className='space-y-2.5'>
                        <CheckRow index={0} icon={ListChecks} done={a.questionCount > 0} title='Questions' text={a.questionCount > 0 ? `${plural(a.questionCount, 'question')}, ${a.totalMarks} marks in total.` : 'Add at least one question.'} action={a.questionCount > 0 ? 'Review' : 'Go to step 1'} onAction={() => goTo('questions')} />
                        <CheckRow index={1} icon={Users} optional done={students > 0} title='Candidates' text={students > 0 ? `${plural(students, 'candidate')} on the list.` : 'No one on the list yet. You can also add candidates after publishing.'} action={students > 0 ? 'Review' : 'Go to step 2'} onAction={() => goTo('candidates')} />
                        <CheckRow index={2} icon={CalendarClock} done={scheduled} title='Schedule and rules' text={scheduled ? scheduleSentence(a.schedule) : 'Set when the test opens, when it closes and how long it lasts.'} action={scheduled ? 'Review' : 'Go to step 3'} onAction={() => goTo('schedule')} />
                    </ul>
                    <div className={`rounded-2xl border px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4 ${ready ? 'border-accent/30 bg-accent/[0.04]' : 'border-line bg-surface-muted/60'}`}>
                        <div className='flex-1'>
                            <p className='text-[15px] font-bold text-ink'>{ready ? 'Everything is ready' : 'Almost there'}</p>
                            <p className='text-[13px] text-text-secondary mt-0.5'>{ready ? 'Publishing lets candidates sign in. You can still go back to draft until the first candidate starts.' : 'Finish the steps marked "To do" above, then publish.'}</p>
                        </div>
                        <Button size='lg' className='oa-press' disabled={!ready || act.isPending} onClick={() => setConfirm('publish')}><Rocket size={17} /> Publish this round</Button>
                    </div>
                </>
            ) : (
                <>
                    <M.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
                        className='rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4'>
                        <span className='w-12 h-12 shrink-0 rounded-full bg-[var(--color-success)] text-white flex items-center justify-center' aria-hidden='true'><CheckCircle2 size={24} /></span>
                        <div className='flex-1 min-w-0'>
                            <p className='text-[16px] font-bold text-ink flex flex-wrap items-center gap-2'>This round is published <PhaseBadge phase={a.phase} /></p>
                            <p className='text-[13px] text-text-secondary mt-1'>{scheduleSentence(a.schedule)}</p>
                        </div>
                        {!a.locked && <Button size='sm' variant='secondary' onClick={() => setConfirm('unpublish')}><Undo2 size={15} /> Back to draft</Button>}
                    </M.div>

                    <div className='grid lg:grid-cols-2 gap-4'>
                        <section className='bg-card border border-line rounded-2xl p-5'>
                            <h3 className='text-[14.5px] font-bold text-ink'>1. Email the invitations</h3>
                            <p className='text-[13px] text-text-secondary mt-1'>Each candidate gets the link and a personal access code. Anyone already emailed is skipped.</p>
                            <div className='flex flex-wrap items-center gap-2 mt-4'>
                                <Button size='sm' disabled={!students || a.phase === 'ENDED' || invite.isPending} onClick={() => setConfirm('invite')}><Send size={14} /> Email invitations</Button>
                                <Button size='sm' variant='ghost' onClick={() => goTo('candidates')}><Users size={14} /> {students ? `See ${plural(students, 'candidate')}` : 'Add candidates'}</Button>
                            </div>
                            {!students && <p className='text-[12.5px] text-[var(--color-warning)] mt-3'>There is no one on the list yet. Add candidates in step 2 first.</p>}
                            {a.phase === 'ENDED' && <p className='text-[12.5px] text-text-secondary mt-3'>This round has closed, so invitations can no longer be sent.</p>}
                        </section>
                        <section className='bg-card border border-line rounded-2xl p-5 min-w-0'>
                            <h3 className='text-[14.5px] font-bold text-ink'>2. Or share the sign-in link yourself</h3>
                            <p className='text-[13px] text-text-secondary mt-1'>Candidates open this page and sign in with their email and access code.</p>
                            <div className='mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface-muted px-3 py-2'>
                                <span className='flex-1 min-w-0 truncate font-mono text-[12.5px] text-ink' title={link}>{link}</span>
                                <button type='button' onClick={copy} aria-label='Copy the candidate link' className='shrink-0 inline-flex items-center gap-1.5 min-h-[32px] px-2.5 rounded-lg text-[12.5px] font-semibold text-accent hover:bg-accent/10'><Copy size={13} /> Copy</button>
                                <a href={link} target='_blank' rel='noreferrer' aria-label='Open the candidate page in a new tab' className='shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10'><ExternalLink size={14} /></a>
                            </div>
                        </section>
                    </div>
                    <p className='text-[13px] text-text-secondary'>Next: step 5 (Live) and step 6 (Results) open as soon as the first candidate starts the test.</p>
                </>
            )}

            {!driveArchived && <OpenRegistrationCard assessment={a} goTo={goTo} />}

            {(!a.locked || a.phase === 'ENDED') && !driveArchived && (
                <div className='pt-2 border-t border-line'>
                    <button type='button' onClick={() => setConfirm('archive')} className='inline-flex items-center gap-2 min-h-[36px] text-[13px] font-medium text-text-secondary hover:text-[var(--color-danger)]'><Archive size={14} /> Archive this round</button>
                </div>
            )}

            <ConfirmModal open={confirm === 'publish'} onClose={() => setConfirm(null)} title='Publish this round?' confirmLabel='Publish' onConfirm={() => act.mutateAsync('publish').catch(() => {})}>
                {scheduleSentence(a.schedule)} Candidates can sign in once you invite them. After the first candidate starts, the questions and rules are locked.
            </ConfirmModal>
            <ConfirmModal open={confirm === 'unpublish'} onClose={() => setConfirm(null)} title='Move back to draft?' confirmLabel='Move to draft' onConfirm={() => act.mutateAsync('unpublish').catch(() => {})}>
                Candidates will not be able to sign in until you publish again. Access codes already emailed stay valid.
            </ConfirmModal>
            <ConfirmModal open={confirm === 'archive'} onClose={() => setConfirm(null)} title='Archive this round?' danger confirmLabel='Archive round' onConfirm={() => act.mutateAsync('archive').catch(() => {})}>
                Candidates can no longer sign in to this round. Results already recorded stay stored.
            </ConfirmModal>
            <ConfirmModal open={confirm === 'invite'} onClose={() => setConfirm(null)} title='Email the invitations?' confirmLabel='Send emails' onConfirm={() => invite.mutateAsync().catch(() => {})}>
                Every candidate on the list who has not been emailed yet ({students} on the list in total) receives the link and their access code.
            </ConfirmModal>
        </div>
    )
}
