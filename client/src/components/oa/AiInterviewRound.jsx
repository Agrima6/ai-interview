import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Download, ExternalLink, Link2, Send, Users } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import { addCandidatesToDrive } from '../../api/organization/organizationApi'
import { useAuth } from '../../hooks/useAuth.jsx'
import Button from '../Button'
import ConfirmModal from '../ui/ConfirmModal'
import { useToast } from '../ui/Toast'
import { DriveStepper, StepFooter, StepIntro } from './DriveStepper'
import AiInterviewPicker from './AiInterviewPicker'
import useAiInterviews from '../../hooks/useAiInterviews'
import { downloadText, inputClass } from './oaFormat'
import StudentsTab from './StudentsTab'
import useOaBase from '../../hooks/useOaBase'

const BATCH = 100
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

// Everyone on this round's list, read page by page (the list is server-paginated).
const everyCandidate = async (roundId) => {
    const all = []
    for (let page = 1; page <= 200; page += 1) {
        const res = await oaApi.listStudents(roundId, { page, pageSize: BATCH })
        all.push(...res.items)
        if (all.length >= res.total || !res.items.length) break
    }
    return all
}

/**
 * A round that is run by the AI interviewer instead of a test. Three steps: the candidate list, which AI interview
 * they sit, and sending them there. Sending emails every candidate their interview invitation, so it always asks first.
 */
export default function AiInterviewRound({ assessment: a, drive, driveArchived, step, onStep }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const auth = useAuth()
    const signedIn = auth.status === 'authenticated'
    const base = useOaBase()
    const [confirm, setConfirm] = useState(false)
    const [outcome, setOutcome] = useState(null)
    const candidates = a.stats?.students || 0
    const archived = a.status === 'ARCHIVED' || driveArchived

    const { options } = useAiInterviews()
    const chosen = options.find((o) => o.id === a.aiInterviewDriveId)
    const openRounds = (chosen?.rounds || []).filter((r) => r.status === 'ACTIVE')
    const [roundChoice, setRoundChoice] = useState('')
    const roundNumber = Number(roundChoice) || openRounds[0]?.roundNumber || 1

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['oa'] })
    const link = useMutation({
        mutationFn: (driveId) => oaApi.updateAssessment(a.id, { aiInterviewDriveId: driveId }),
        onSuccess: (_, driveId) => { refresh(); setRoundChoice(''); toast.success(driveId ? 'AI interview selected.' : 'Selection cleared.') },
        onError: (err) => toast.error(err.message),
    })

    const send = useMutation({
        mutationFn: async () => {
            const people = await everyCandidate(a.id)
            if (!people.length) throw new Error('There is no one on the list to send.')
            let added = 0
            for (let i = 0; i < people.length; i += BATCH) {
                const batch = people.slice(i, i + BATCH).map((s) => ({ name: s.name, email: s.email, phone: s.phone || undefined, rollNumber: s.rollNumber || undefined }))
                try {
                    const res = await addCandidatesToDrive(a.aiInterviewDriveId, batch, roundNumber)
                    added += res?.addSummary?.added ?? batch.length
                } catch (error) {
                    // "Everyone is already on the drive" is not a failure when sending the same list twice.
                    if (error.code !== 'NO_NEW_CANDIDATES') throw error
                }
            }
            return { total: people.length, added }
        },
        onSuccess: (r) => { setConfirm(false); setOutcome(r); toast.success(r.added ? 'Candidates sent to the AI interview.' : 'Everyone was already on that AI interview.') },
        onError: (err) => { setConfirm(false); toast.error(err.message) },
    })

    const exportCsv = useMutation({
        mutationFn: async () => {
            const people = await everyCandidate(a.id)
            downloadText(`round-${a.roundNumber}-candidates.csv`, [['Name', 'Email', 'Phone', 'Roll number'], ...people.map((s) => [s.name, s.email, s.phone, s.rollNumber])].map((row) => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8')
        },
        onError: (err) => toast.error(err.message),
    })

    const steps = [
        { id: 'candidates', label: 'Candidates', done: candidates > 0 },
        { id: 'interview', label: 'Choose interview', done: Boolean(chosen) },
        { id: 'send', label: 'Send', done: Boolean(outcome), locked: !candidates || !chosen, lockReason: !candidates ? 'Add candidates first (step 1)' : 'Choose the AI interview first (step 2)' },
    ]
    // Chosen once, when the round opens: finishing a step must not move the organizer on by itself.
    const [landed] = useState(() => steps.find((s) => !s.done && !s.locked)?.id || 'send')
    const current = steps.find((s) => s.id === step && !s.locked)?.id || (steps.find((s) => s.id === landed && !s.locked) ? landed : steps.find((s) => !s.done && !s.locked)?.id || 'send')
    const index = steps.findIndex((s) => s.id === current)
    const intro = {
        candidates: [Users, 'Check who takes this interview', 'These are the candidates of this round. Add, upload or remove anyone before you send them on.'],
        interview: [Link2, 'Choose the AI interview they will sit', 'Pick one of your active AI interviews. Questions, scoring and scheduling are all set up there.'],
        send: [Send, 'Send the candidates to the AI interview', 'They are added to the interview you chose and each one is emailed an invitation.'],
    }[current]

    return (
        <>
            <DriveStepper steps={steps} current={current} onSelect={onStep} />
            <StepIntro number={index + 1} total={steps.length} icon={intro[0]} title={intro[1]} text={intro[2]} />

            {current === 'candidates' && <StudentsTab assessment={a} />}

            {current === 'interview' && (
                <div className='bg-card border border-line rounded-2xl p-5 max-w-2xl'>
                    <AiInterviewPicker value={a.aiInterviewDriveId} onChange={(id) => link.mutate(id)} disabled={archived} pending={link.isPending}
                        getPrefill={async () => ({ title: `${drive?.title || a.title} · ${a.roundLabel || 'AI interview'}`, department: drive?.department, roleCategory: drive?.roleCategory, experienceLevel: drive?.experienceLevel, candidates: await everyCandidate(a.id) })} />
                </div>
            )}

            {current === 'send' && (
                <div className='grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start'>
                    <div className='bg-card border border-line rounded-2xl p-5'>
                        <dl className='grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[13.5px]'>
                            <div><dt className='text-[12px] font-semibold text-text-secondary'>Candidates</dt><dd className='font-bold text-ink tabular-nums'>{candidates}</dd></div>
                            <div className='min-w-0'><dt className='text-[12px] font-semibold text-text-secondary'>AI interview</dt><dd className='font-bold text-ink break-words'>{chosen?.title}</dd></div>
                        </dl>
                        {openRounds.length > 1 && (
                            <div className='mt-4 max-w-xs'>
                                <label htmlFor='ai-round' className='block text-[13px] font-semibold text-ink mb-1.5'>Interview round</label>
                                <select id='ai-round' className={inputClass} value={String(roundNumber)} onChange={(e) => setRoundChoice(e.target.value)}>
                                    {openRounds.map((r) => <option key={r.roundNumber} value={r.roundNumber}>Round {r.roundNumber}{r.title ? ` · ${r.title}` : ''}</option>)}
                                </select>
                            </div>
                        )}
                        {chosen && !openRounds.length && <p role='status' className='mt-4 text-[13px] bg-[var(--color-warning-soft)] text-[var(--color-warning)] rounded-xl px-3.5 py-2.5'>This AI interview has no active round. Activate a round in AI Interview, then come back.</p>}
                        <div className='mt-5 flex flex-wrap items-center gap-2'>
                            <Button className='oa-press' disabled={archived || send.isPending || !openRounds.length} onClick={() => setConfirm(true)}><Send size={16} /> {send.isPending ? 'Sending…' : `Send ${candidates} candidate${candidates === 1 ? '' : 's'}`}</Button>
                        </div>
                        {outcome && (
                            <p role='status' className='oa-rise mt-4 flex items-start gap-2 text-[13.5px] text-ink bg-[var(--color-success-soft)] rounded-xl px-3.5 py-3'><CheckCircle2 size={17} className='text-[var(--color-success)] mt-0.5 shrink-0' aria-hidden='true' />
                                <span>{outcome.added ? `${outcome.added} of ${outcome.total} candidate${outcome.total === 1 ? '' : 's'} were added and invited.` : 'Everyone on the list was already on that AI interview, so no one was added twice.'} Follow their interviews and scores in AI Interview.</span></p>
                        )}
                    </div>
                    <aside className='bg-card border border-line rounded-2xl p-5'>
                        <h3 className='text-[14px] font-bold text-ink'>Prefer to do it by hand?</h3>
                        <p className='text-[13px] text-text-secondary mt-1 mb-3'>Download this round's candidates as a CSV and upload the file in AI Interview.</p>
                        <Button size='sm' variant='secondary' disabled={!candidates || exportCsv.isPending} onClick={() => exportCsv.mutate()}><Download size={14} /> {exportCsv.isPending ? 'Preparing…' : 'Download CSV'}</Button>
                        {signedIn && chosen && base.aiDrive && <Link to={base.aiDrive(chosen.id)} className='mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline'>Follow these interviews <ExternalLink size={13} /></Link>}
                    </aside>
                </div>
            )}

            <StepFooter previous={steps[index - 1]} next={steps[index + 1]} onSelect={onStep} />

            <ConfirmModal open={confirm} onClose={() => setConfirm(false)} title={`Send ${candidates} candidate${candidates === 1 ? '' : 's'} to the AI interview?`} confirmLabel='Send and invite' onConfirm={() => send.mutateAsync().catch(() => {})}>
                They are added to "{chosen?.title}" and each one is emailed an interview invitation straight away. Anyone already on that interview is skipped, so nobody is invited twice.
            </ConfirmModal>
        </>
    )
}
