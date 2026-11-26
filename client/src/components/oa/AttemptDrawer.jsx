import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Lock, ShieldAlert, VideoOff, X } from 'lucide-react'
import { GatewayUrl } from '../../api/client'
import { oaApi } from '../../api/oaApi'
import { formatEnumLabel } from '../../utils/formatEnumLabel'
import Badge from '../ui/Badge'
import Button from '../Button'
import Drawer from '../ui/Drawer'
import Skeleton from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import { AttemptStatus, ErrorState } from './oaUi'
import { formatDateTime, formatDuration, inputClass, sectionLabel } from './oaFormat'
import { languageLabel } from './oaLanguages'
import DeviceDetails from './DeviceDetails'
import AiInterviewReportCard from './AiInterviewReportCard'
import Lightbox from './Lightbox'

const VIOLATION_LABEL = {
    TAB_SWITCH: 'Switched tab', WINDOW_BLUR: 'Left the test window', FULLSCREEN_EXIT: 'Exited full screen', COPY_PASTE: 'Copy / paste attempt',
    SCREEN_SHARE_STOPPED: 'Stopped sharing screen', CAMERA_OFF: 'Camera turned off', NO_FACE: 'No face in camera', MULTIPLE_FACES: 'More than one face',
    LOOKING_AWAY: 'Looked away', DEVTOOLS: 'Developer tools opened', MULTIPLE_MONITORS: 'Second monitor detected', RIGHT_CLICK: 'Right-click blocked',
    SHORTCUT_BLOCKED: 'Shortcut blocked', RESUMED: 'Re-entered the test', EXAM_STARTED: 'Started the test', CONNECTION_GAP: 'Connection gap', FACE_CHECK_UNAVAILABLE: 'Face checks could not run',
}

// Shown in place of the answers while the candidate is still writing: nobody can look at a paper in progress.
function HiddenAnswers({ sections }) {
    const count = sections.reduce((n, s) => n + s.questions.length, 0)
    return (
        <div className='border border-dashed border-line rounded-2xl px-6 py-10 text-center'>
            <div className='w-12 h-12 rounded-full bg-surface-muted text-text-secondary flex items-center justify-center mx-auto mb-3'><Lock size={20} /></div>
            <h3 className='text-[15px] font-bold text-ink'>Answers are hidden while the candidate is writing</h3>
            <p className='text-[13px] text-text-secondary max-w-sm mx-auto mt-1'>The {count} answer{count === 1 ? '' : 's'}, the score and the marks appear here as soon as the test is submitted. Proctoring events and device details are visible now.</p>
        </div>
    )
}

function Answer({ q, grade, onGrade, locked }) {
    const subjective = ['SHORT', 'LONG', 'CODING', 'VIDEO'].includes(q.type)
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
                        const chosen = Boolean(given?.selected?.includes(o.id)); const right = q.correct.includes(o.id)
                        return <li key={o.id} className={`flex items-center gap-2 ${right ? 'text-[var(--color-success)] font-semibold' : chosen ? 'text-[var(--color-danger)]' : 'text-text-secondary'}`}>
                            {right ? <Check size={14} /> : chosen ? <X size={14} /> : <span className='w-3.5' />}{o.text}{chosen && <span className='text-[11px]'>(chosen)</span>}</li>
                    })}
                </ul>
            ) : q.type === 'VIDEO' ? (
                <div className='mt-2.5'>
                    <div className='text-[11.5px] font-semibold text-text-secondary mb-1'>Candidate's video answer{given?.video?.durationSec ? ` · ${formatDuration(given.video.durationSec)}` : ''}</div>
                    {given?.video?.url
                        ? <video controls preload='metadata' src={`${GatewayUrl}${given.video.url}`} className='w-full max-h-[360px] rounded-lg bg-black' aria-label={`Video answer to: ${q.text.slice(0, 60)}`} />
                        : <p className='flex items-center gap-2 text-[13px] text-text-secondary italic'><VideoOff size={14} /> No video was recorded</p>}
                </div>
            ) : (
                <div className='mt-2.5'>
                    <div className='text-[11.5px] font-semibold text-text-secondary mb-1'>Candidate's answer</div>
                    {q.answered ? <pre className={`whitespace-pre-wrap break-words text-[13px] bg-surface-muted rounded-lg p-3 ${q.type === 'CODING' ? 'font-mono' : 'font-sans'}`}>{q.type === 'CODING' ? `${given?.language ? `// ${languageLabel(given.language)}\n` : ''}${given?.code ?? ''}` : String(given ?? '')}</pre> : <p className='text-[13px] text-text-secondary italic'>Not answered</p>}
                    {q.modelAnswer && <details className='mt-2 text-[12.5px]'><summary className='cursor-pointer text-text-secondary font-medium'>Model answer / guide</summary><pre className='whitespace-pre-wrap mt-1 text-text-secondary font-sans'>{q.modelAnswer}</pre></details>}
                </div>
            )}
            <div className='flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-line text-[13px]'>
                {subjective ? (
                    <>
                        <label className='flex items-center gap-2'>Marks
                            <input inputMode='decimal' disabled={locked} aria-label={`Marks for: ${q.text.slice(0, 40)}`} aria-invalid={Number(value) > q.marks} className={`${inputClass} !w-24 !py-1.5 ${Number(value) > q.marks ? '!border-[var(--color-danger)]' : ''}`} value={value}
                                onChange={(e) => { const raw = e.target.value.replace(/[^\d.]/g, '').replace(/^(\d*\.?\d{0,2}).*$/, '$1'); onGrade(q.id, raw === '' ? '' : Math.min(Number(raw), q.marks) === Number(raw) ? raw : String(q.marks)) }} /> / {q.marks}</label>
                        {grade?.needsReview && grade?.auto && !grade?.runner && !grade?.ai && <Badge variant='warning'>Auto-scored from keywords: please check</Badge>}
                        {grade?.ai && <Badge variant='info'>AI suggested: please check</Badge>}
                        {grade?.ai?.feedback && <p className='basis-full text-[12.5px] text-text-secondary'>AI's reason: {grade.ai.feedback}</p>}
                        {grade?.runner && <Badge variant={grade.runner.passed === grade.runner.total ? 'success' : 'warning'}>{grade.runner.ran ? `Test cases: ${grade.runner.passed} of ${grade.runner.total} passed (run automatically)` : 'Nothing was run: no code was written'}</Badge>}
                        {grade?.marks === null && <Badge variant='warning'>{locked ? 'Not marked yet' : 'Waiting for you'}</Badge>}
                    </>
                ) : <span className={`font-semibold ${grade?.marks > 0 ? 'text-[var(--color-success)]' : grade?.marks < 0 ? 'text-[var(--color-danger)]' : 'text-text-secondary'}`}>{grade?.marks ?? 0} / {q.marks}</span>}
            </div>
        </li>
    )
}

// `api` and `readOnly` let the platform owner open the same screen on any organization's candidate, without being able to change marks.
export default function AttemptDrawer({ assessmentId, attemptId, onClose, assessment, api = oaApi, readOnly = false }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [tab, setTab] = useState('answers')
    const [edits, setEdits] = useState({})
    const [zoom, setZoom] = useState(null)   // null | { images, index }
    const q = useQuery({ queryKey: ['oa', readOnly ? 'admin-attempt' : 'attempt', attemptId], queryFn: () => api.attempt(assessmentId, attemptId), enabled: Boolean(attemptId) })
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

    const hidden = Boolean(d?.answersHidden)
    const snapshotImages = (d?.snapshots || []).map((s) => ({ src: s.image, caption: `Webcam · ${formatDateTime(s.at)}` }))
    const eventImages = (d?.violations || []).filter((v) => v.image).map((v) => ({ id: v.id, src: v.image, caption: `${VIOLATION_LABEL[v.type] || formatEnumLabel(v.type)} · ${formatDateTime(v.at)}` }))
    const gradeOf = (qq) => (edits[qq.id] !== undefined ? { ...qq.grade, marks: edits[qq.id] } : qq.grade)
    const unsaved = Object.values(edits).some((v) => v !== '')

    return (
        <Drawer open={Boolean(attemptId)} onClose={onClose} title={d?.student?.name || 'Attempt'} widthClassName='max-w-2xl'
            footer={!readOnly && tab === 'answers' && d && !hidden ? <><span className='text-[12.5px] text-text-secondary mr-auto'>{unsaved ? 'Unsaved marks' : ''}</span><Button size='sm' disabled={!unsaved || grade.isPending} onClick={() => grade.mutate()}>{grade.isPending ? 'Saving…' : 'Save marks'}</Button></> : undefined}>
            {q.isError ? <ErrorState message={q.error.message} onRetry={q.refetch} /> : !d ? <div className='space-y-3'><Skeleton className='h-6 w-1/2' /><Skeleton className='h-40 w-full' /></div> : (
                <div className='space-y-5'>
                    <div className='flex flex-wrap items-center gap-2 text-[13px]'>
                        <AttemptStatus status={d.attempt.status} />
                        <span className='text-text-secondary'>{d.student?.email}{d.student?.rollNumber ? ` · ${d.student.rollNumber}` : ''}</span>
                    </div>
                    <dl className='grid grid-cols-3 border border-line rounded-xl divide-x divide-line'>
                        <div className='px-4 py-3'><dt className='text-[11.5px] font-semibold text-text-secondary'>Score</dt><dd className='text-[18px] font-bold tabular-nums'>{hidden ? <span className='text-[13px] font-medium text-text-secondary'>After submission</span> : <>{d.attempt.score} <span className='text-[13px] font-medium text-text-secondary'>/ {d.attempt.maxScore}</span></>}</dd></div>
                        <div className='px-4 py-3'><dt className='text-[11.5px] font-semibold text-text-secondary'>Percent</dt><dd className='text-[18px] font-bold tabular-nums'>{hidden ? <span className='text-[13px] font-medium text-text-secondary'>After submission</span> : <>{d.attempt.percent}%<span className={`block text-[11.5px] font-semibold ${d.attempt.percent >= d.passPercent ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>{d.attempt.percent >= d.passPercent ? 'Passed' : 'Not passed'} (pass {d.passPercent}%)</span></>}</dd></div>
                        <div className='px-4 py-3'><dt className='text-[11.5px] font-semibold text-text-secondary'>Violations</dt><dd className='text-[18px] font-bold tabular-nums'>{d.attempt.violationCount}</dd></div>
                    </dl>
                    {readOnly && d.attempt.adminDecision && <p className='text-[13px] text-text-secondary'>The organizer's decision: <b className='text-ink'>{d.attempt.adminDecision === 'DISQUALIFIED' ? 'Disqualified' : 'Flags cleared'}</b></p>}
                    {assessment && <AiInterviewReportCard assessment={assessment} email={d.student?.email} />}
                    {d.attempt.endReason && <p className='text-[13px] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-xl px-3.5 py-2.5 flex items-center gap-2'><ShieldAlert size={15} /> {d.attempt.endReason}</p>}
                    {!readOnly && d.attempt.status !== 'IN_PROGRESS' && (
                        <div className='flex flex-wrap items-center gap-2 text-[13px]'>
                            <span className='font-semibold'>Decision:</span>
                            {[['CLEARED', 'Clear flags'], ['DISQUALIFIED', 'Disqualify'], [null, 'No decision']].map(([v, label]) => (
                                <button key={label} disabled={decide.isPending} aria-pressed={d.attempt.adminDecision === v} onClick={() => decide.mutate(v)}
                                    className={`px-3 py-1.5 rounded-full border text-[12.5px] font-semibold ${d.attempt.adminDecision === v ? (v === 'DISQUALIFIED' ? 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]' : 'border-accent bg-accent/10 text-accent') : 'border-line text-text-secondary hover:border-accent/40'}`}>{label}</button>
                            ))}
                        </div>
                    )}

                    <div role='tablist' className='flex gap-1 border-b border-line'>
                        {[['answers', 'Answers'], ['proctoring', `Proctoring (${d.violations.filter((v) => v.counted).length})`], ['device', 'Device & location']].map(([id, label]) => (
                            <button key={id} role='tab' aria-selected={tab === id} onClick={() => setTab(id)} className={`px-4 py-2 text-[13px] font-semibold border-b-2 -mb-px ${tab === id ? 'border-accent text-accent' : 'border-transparent text-text-secondary'}`}>{label}</button>
                        ))}
                    </div>

                    {tab === 'answers' && hidden && <HiddenAnswers sections={d.sections} />}
                    {tab === 'answers' && !hidden && d.sections.map((s, i) => (
                        <section key={s.sectionId}><h3 className='text-[13px] font-bold text-ink mb-2'>{sectionLabel(s, (s.number || i + 1) - 1)}</h3>
                            <ol className='space-y-3'>{s.questions.map((qq) => <Answer key={qq.id} q={qq} grade={gradeOf(qq)} locked={readOnly || d.attempt.status === 'IN_PROGRESS'} onGrade={(id, v) => setEdits((e) => ({ ...e, [id]: v }))} />)}</ol></section>
                    ))}

                    {tab === 'proctoring' && (
                        <div className='space-y-5'>
                            {d.snapshots.length > 0 && <section><h3 className='text-[13px] font-bold text-ink mb-2'>Webcam snapshots ({d.snapshots.length})</h3>
                                <ul className='grid grid-cols-3 sm:grid-cols-4 gap-2'>{d.snapshots.map((s, i) => <li key={s.id}><button type='button' onClick={() => setZoom({ images: snapshotImages, index: i })} aria-label={`Enlarge the webcam snapshot from ${formatDateTime(s.at)}`} className='block w-full rounded-lg overflow-hidden border border-line bg-black cursor-zoom-in transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-accent'><img src={s.image} alt='' loading='lazy' className='w-full aspect-[4/3] object-cover' /></button><span className='block text-[10.5px] text-text-secondary mt-0.5'>{new Date(s.at).toLocaleTimeString()}</span></li>)}</ul></section>}
                            <section><h3 className='text-[13px] font-bold text-ink mb-2'>Events</h3>
                                {d.violations.length === 0 ? <p className='text-[13px] text-text-secondary'>Nothing was recorded.</p> : (
                                    <ol className='space-y-2'>{d.violations.map((v) => (
                                        <li key={v.id} className='flex gap-3 text-[13px] border border-line rounded-xl p-3'>
                                            {v.image && <button type='button' onClick={() => setZoom({ images: eventImages, index: eventImages.findIndex((x) => x.id === v.id) })} aria-label='Enlarge the webcam picture from this event' className='shrink-0 rounded-lg overflow-hidden bg-black cursor-zoom-in focus-visible:ring-2 focus-visible:ring-accent'><img src={v.image} alt='' className='w-20 h-[60px] object-cover' /></button>}
                                            <div className='min-w-0'><div className='flex flex-wrap items-center gap-2'><span className='font-semibold text-ink'>{VIOLATION_LABEL[v.type] || formatEnumLabel(v.type)}</span>{v.counted ? <Badge variant='danger'>Counted</Badge> : <Badge variant='neutral'>Logged</Badge>}</div>
                                                <div className='text-[12px] text-text-secondary'>{formatDateTime(v.at)}{v.detail ? ` · ${v.detail}` : ''}</div></div>
                                        </li>))}</ol>
                                )}
                            </section>
                        </div>
                    )}

                    {tab === 'device' && (
                        <div className='space-y-3'>
                            <p className='text-[13px] text-text-secondary'>Recorded when the candidate pressed Start{d.attempt.startedAt ? ` (${formatDateTime(d.attempt.startedAt)})` : ''}.</p>
                            <DeviceDetails ip={d.attempt.ip} env={d.attempt.environment || {}} mapLink className='border border-line rounded-xl p-4' />
                            {d.attempt.environment?.userAgent && <p className='text-[12px] text-text-secondary break-words'>Browser signature: {d.attempt.environment.userAgent}</p>}
                            <p className='text-[12px] text-text-secondary'>A website cannot read a computer's name or MAC address: browsers do not share them. The IP address, location, browser and device above are what identify the machine.</p>
                        </div>
                    )}
                </div>
            )}
            <Lightbox images={zoom?.images || []} index={zoom ? zoom.index : null} onIndex={(index) => setZoom((z) => ({ ...z, index }))} onClose={() => setZoom(null)} />
        </Drawer>
    )
}
