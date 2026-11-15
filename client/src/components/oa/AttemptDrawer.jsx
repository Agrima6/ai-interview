import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ShieldAlert, X } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import { formatEnumLabel } from '../../utils/formatEnumLabel'
import Badge from '../ui/Badge'
import Button from '../Button'
import Drawer from '../ui/Drawer'
import Skeleton from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import { AttemptStatus, ErrorState } from './oaUi'
import { formatDateTime, inputClass } from './oaFormat'

const VIOLATION_LABEL = {
    TAB_SWITCH: 'Switched tab', WINDOW_BLUR: 'Left the test window', FULLSCREEN_EXIT: 'Exited full screen', COPY_PASTE: 'Copy / paste attempt',
    SCREEN_SHARE_STOPPED: 'Stopped sharing screen', CAMERA_OFF: 'Camera turned off', NO_FACE: 'No face in camera', MULTIPLE_FACES: 'More than one face',
    LOOKING_AWAY: 'Looked away', DEVTOOLS: 'Developer tools opened', MULTIPLE_MONITORS: 'Second monitor detected', RIGHT_CLICK: 'Right-click blocked',
    SHORTCUT_BLOCKED: 'Shortcut blocked', RESUMED: 'Re-entered the test', EXAM_STARTED: 'Started the test', CONNECTION_GAP: 'Connection gap', FACE_CHECK_UNAVAILABLE: 'Face checks could not run',
}

function Answer({ q, grade, onGrade, locked }) {
    const subjective = ['SHORT', 'LONG', 'CODING'].includes(q.type)
    const given = q.answer
    const value = grade?.marks ?? ''
    return (
        <li className='border border-line rounded-xl p-4'>
            <div className='flex items-start justify-between gap-3'>
                <p className='text-[13.5px] font-medium text-ink break-words'>{q.text}</p>
                <Badge variant='neutral'>{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
            </div>
            {q.options?.length > 0 ? (
                <ul className='mt-2.5 space-y-1 text-[13px]'>
                    {q.options.map((o) => {
                        const chosen = given.selected.includes(o.id); const right = q.correct.includes(o.id)
                        return <li key={o.id} className={`flex items-center gap-2 ${right ? 'text-[var(--color-success)] font-semibold' : chosen ? 'text-[var(--color-danger)]' : 'text-text-secondary'}`}>
                            {right ? <Check size={14} /> : chosen ? <X size={14} /> : <span className='w-3.5' />}{o.text}{chosen && <span className='text-[11px]'>(chosen)</span>}</li>
                    })}
                </ul>
            ) : (
                <div className='mt-2.5'>
                    <div className='text-[11.5px] font-semibold text-text-secondary mb-1'>Student's answer</div>
                    {q.answered ? <pre className={`whitespace-pre-wrap break-words text-[13px] bg-surface-muted rounded-lg p-3 ${q.type === 'CODING' ? 'font-mono' : 'font-sans'}`}>{q.type === 'CODING' ? `${given.language ? `// ${given.language}\n` : ''}${given.code}` : given}</pre> : <p className='text-[13px] text-text-secondary italic'>Not answered</p>}
                    {q.modelAnswer && <details className='mt-2 text-[12.5px]'><summary className='cursor-pointer text-text-secondary font-medium'>Model answer / guide</summary><pre className='whitespace-pre-wrap mt-1 text-text-secondary font-sans'>{q.modelAnswer}</pre></details>}
                </div>
            )}
            <div className='flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-line text-[13px]'>
                {subjective ? (
                    <>
                        <label className='flex items-center gap-2'>Marks
                            <input inputMode='decimal' disabled={locked} aria-label={`Marks for: ${q.text.slice(0, 40)}`} aria-invalid={Number(value) > q.marks} className={`${inputClass} !w-24 !py-1.5 ${Number(value) > q.marks ? '!border-[var(--color-danger)]' : ''}`} value={value}
                                onChange={(e) => { const raw = e.target.value.replace(/[^\d.]/g, '').replace(/^(\d*\.?\d{0,2}).*$/, '$1'); onGrade(q.id, raw === '' ? '' : Math.min(Number(raw), q.marks) === Number(raw) ? raw : String(q.marks)) }} /> / {q.marks}</label>
                        {grade?.needsReview && grade?.auto && <Badge variant='warning'>Auto-scored from keywords: please check</Badge>}
                        {grade?.marks === null && <Badge variant='warning'>Waiting for you</Badge>}
                    </>
                ) : <span className={`font-semibold ${grade?.marks > 0 ? 'text-[var(--color-success)]' : grade?.marks < 0 ? 'text-[var(--color-danger)]' : 'text-text-secondary'}`}>{grade?.marks ?? 0} / {q.marks}</span>}
            </div>
        </li>
    )
}

export default function AttemptDrawer({ assessmentId, attemptId, onClose }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [tab, setTab] = useState('answers')
    const [edits, setEdits] = useState({})
    const q = useQuery({ queryKey: ['oa', 'attempt', attemptId], queryFn: () => oaApi.attempt(assessmentId, attemptId), enabled: Boolean(attemptId) })
    const d = q.data
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['oa'] })

    const grade = useMutation({
        mutationFn: () => oaApi.grade(assessmentId, attemptId, Object.entries(edits).filter(([, v]) => v !== '').map(([questionId, marks]) => ({ questionId, marks }))),
        onSuccess: () => { toast.success('Marks saved.'); setEdits({}); refresh() },
        onError: (err) => toast.error(err.message),
    })
    const decide = useMutation({
        mutationFn: (decision) => oaApi.decide(assessmentId, attemptId, decision),
        onSuccess: () => { toast.success('Decision recorded.'); refresh() },
        onError: (err) => toast.error(err.message),
    })

    const gradeOf = (qq) => (edits[qq.id] !== undefined ? { ...qq.grade, marks: edits[qq.id] } : qq.grade)
    const unsaved = Object.values(edits).some((v) => v !== '')

    return (
        <Drawer open={Boolean(attemptId)} onClose={onClose} title={d?.student?.name || 'Attempt'} widthClassName='max-w-2xl'
            footer={tab === 'answers' && d ? <><span className='text-[12.5px] text-text-secondary mr-auto'>{unsaved ? 'Unsaved marks' : ''}</span><Button size='sm' disabled={!unsaved || grade.isPending} onClick={() => grade.mutate()}>{grade.isPending ? 'Saving…' : 'Save marks'}</Button></> : undefined}>
            {q.isError ? <ErrorState message={q.error.message} onRetry={q.refetch} /> : !d ? <div className='space-y-3'><Skeleton className='h-6 w-1/2' /><Skeleton className='h-40 w-full' /></div> : (
                <div className='space-y-5'>
                    <div className='flex flex-wrap items-center gap-2 text-[13px]'>
                        <AttemptStatus status={d.attempt.status} />
                        <span className='text-text-secondary'>{d.student?.email}{d.student?.rollNumber ? ` · ${d.student.rollNumber}` : ''}</span>
                    </div>
                    <dl className='grid grid-cols-3 border border-line rounded-xl divide-x divide-line'>
                        <div className='px-4 py-3'><dt className='text-[11.5px] font-semibold text-text-secondary'>Score</dt><dd className='text-[18px] font-bold tabular-nums'>{d.attempt.score} <span className='text-[13px] font-medium text-text-secondary'>/ {d.attempt.maxScore}</span></dd></div>
                        <div className='px-4 py-3'><dt className='text-[11.5px] font-semibold text-text-secondary'>Percent</dt><dd className='text-[18px] font-bold tabular-nums'>{d.attempt.percent}%<span className={`block text-[11.5px] font-semibold ${d.attempt.percent >= d.passPercent ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>{d.attempt.percent >= d.passPercent ? 'Passed' : 'Not passed'} (pass {d.passPercent}%)</span></dd></div>
                        <div className='px-4 py-3'><dt className='text-[11.5px] font-semibold text-text-secondary'>Violations</dt><dd className='text-[18px] font-bold tabular-nums'>{d.attempt.violationCount}</dd></div>
                    </dl>
                    {d.attempt.endReason && <p className='text-[13px] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-xl px-3.5 py-2.5 flex items-center gap-2'><ShieldAlert size={15} /> {d.attempt.endReason}</p>}
                    {d.attempt.status !== 'IN_PROGRESS' && (
                        <div className='flex flex-wrap items-center gap-2 text-[13px]'>
                            <span className='font-semibold'>Decision:</span>
                            {[['CLEARED', 'Clear flags'], ['DISQUALIFIED', 'Disqualify'], [null, 'No decision']].map(([v, label]) => (
                                <button key={label} disabled={decide.isPending} aria-pressed={d.attempt.adminDecision === v} onClick={() => decide.mutate(v)}
                                    className={`px-3 py-1.5 rounded-full border text-[12.5px] font-semibold ${d.attempt.adminDecision === v ? (v === 'DISQUALIFIED' ? 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]' : 'border-accent bg-accent/10 text-accent') : 'border-line text-text-secondary hover:border-accent/40'}`}>{label}</button>
                            ))}
                        </div>
                    )}

                    <div role='tablist' className='flex gap-1 border-b border-line'>
                        {[['answers', 'Answers'], ['proctoring', `Proctoring (${d.violations.filter((v) => v.counted).length})`]].map(([id, label]) => (
                            <button key={id} role='tab' aria-selected={tab === id} onClick={() => setTab(id)} className={`px-4 py-2 text-[13px] font-semibold border-b-2 -mb-px ${tab === id ? 'border-accent text-accent' : 'border-transparent text-text-secondary'}`}>{label}</button>
                        ))}
                    </div>

                    {tab === 'answers' && d.sections.map((s) => (
                        <section key={s.sectionId}><h3 className='text-[13px] font-bold text-ink mb-2'>{s.title}</h3>
                            <ol className='space-y-3'>{s.questions.map((qq) => <Answer key={qq.id} q={qq} grade={gradeOf(qq)} locked={d.attempt.status === 'IN_PROGRESS'} onGrade={(id, v) => setEdits((e) => ({ ...e, [id]: v }))} />)}</ol></section>
                    ))}

                    {tab === 'proctoring' && (
                        <div className='space-y-5'>
                            {d.snapshots.length > 0 && <section><h3 className='text-[13px] font-bold text-ink mb-2'>Webcam snapshots ({d.snapshots.length})</h3>
                                <ul className='grid grid-cols-3 sm:grid-cols-4 gap-2'>{d.snapshots.map((s) => <li key={s.id}><img src={s.image} alt={`Webcam at ${formatDateTime(s.at)}`} loading='lazy' className='w-full aspect-[4/3] object-cover rounded-lg border border-line bg-black' /><span className='block text-[10.5px] text-text-secondary mt-0.5'>{new Date(s.at).toLocaleTimeString()}</span></li>)}</ul></section>}
                            <section><h3 className='text-[13px] font-bold text-ink mb-2'>Events</h3>
                                {d.violations.length === 0 ? <p className='text-[13px] text-text-secondary'>Nothing was recorded.</p> : (
                                    <ol className='space-y-2'>{d.violations.map((v) => (
                                        <li key={v.id} className='flex gap-3 text-[13px] border border-line rounded-xl p-3'>
                                            {v.image && <img src={v.image} alt='Webcam at the moment of this event' className='w-20 h-[60px] object-cover rounded-lg bg-black shrink-0' />}
                                            <div className='min-w-0'><div className='flex flex-wrap items-center gap-2'><span className='font-semibold text-ink'>{VIOLATION_LABEL[v.type] || formatEnumLabel(v.type)}</span>{v.counted ? <Badge variant='danger'>Counted</Badge> : <Badge variant='neutral'>Logged</Badge>}</div>
                                                <div className='text-[12px] text-text-secondary'>{formatDateTime(v.at)}{v.detail ? ` · ${v.detail}` : ''}</div></div>
                                        </li>))}</ol>
                                )}
                            </section>
                            {d.attempt.environment?.userAgent && <p className='text-[12px] text-text-secondary break-words'>Device: {d.attempt.environment.platform} · {d.attempt.environment.screen} · {d.attempt.environment.screenCount} screen(s) · {d.attempt.environment.userAgent}</p>}
                        </div>
                    )}
                </div>
            )}
        </Drawer>
    )
}
