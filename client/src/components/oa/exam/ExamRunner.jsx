import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, MonitorUp, Maximize, ShieldAlert, WifiOff } from 'lucide-react'
import { examApi } from '../../../api/oaApi'
import ProctoringCamera from '../../ProctoringCamera'
import Button from '../../Button'
import Modal from '../../ui/Modal'
import useNow from '../../../hooks/useNow'
import QuestionView from './QuestionView'
import useProctor from './useProctor'
import { requestScreen } from './examMedia'

const FACE_MESSAGES = { 'No face detected in your camera': 'NO_FACE', 'Multiple faces detected in your camera': 'MULTIPLE_FACES', 'You looked away from the screen': 'LOOKING_AWAY' }
const HEARTBEAT_MS = 15000
const AUTOSAVE_MS = 10000

const clock = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000))
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
    return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s % 60).padStart(2, '0')}`
}

export default function ExamRunner({ paper, screenStream, onScreenStream, onFinish }) {
    const cfg = paper.proctoring
    const flat = useMemo(() => paper.sections.flatMap((s) => s.questions.map((q) => ({ ...q, sectionTitle: s.title }))), [paper])
    const [index, setIndex] = useState(0)
    const [answers, setAnswers] = useState(paper.answers || {})
    const [review, setReview] = useState(() => new Set())
    const [saveState, setSaveState] = useState('saved')       // saved | saving | offline
    const [deadline, setDeadline] = useState(new Date(paper.deadline).getTime())
    const [skew, setSkew] = useState(new Date(paper.serverNow).getTime() - Date.now())
    const [count, setCount] = useState(paper.violationCount || 0)
    const [camera, setCamera] = useState(null)
    const [confirming, setConfirming] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [reshareError, setReshareError] = useState('')
    const now = useNow(1000)
    const dirty = useRef(new Set())
    const answersRef = useRef(answers)
    const saveTimer = useRef(null)
    const finished = useRef(false)
    const lastSnap = useRef(0)
    answersRef.current = answers

    const finish = useCallback((info) => { if (finished.current) return; finished.current = true; onFinish(info) }, [onFinish])

    const applyState = useCallback((s) => {
        if (!s) return
        if (s.deadline) setDeadline(new Date(s.deadline).getTime())
        if (s.serverNow) setSkew(new Date(s.serverNow).getTime() - Date.now())
        if (typeof s.violationCount === 'number') setCount(s.violationCount)
        if (s.status && s.status !== 'IN_PROGRESS') finish({ status: s.status, endReason: s.endReason })
    }, [finish])

    const proctor = useProctor({ cfg, cameraStream: camera, screenStream, active: true, onState: applyState })

    // ---- autosave ----
    const flush = useCallback(async () => {
        clearTimeout(saveTimer.current)
        const ids = [...dirty.current]
        if (!ids.length) return true
        setSaveState('saving')
        try {
            await examApi.saveAnswers(ids.map((id) => ({ questionId: id, value: answersRef.current[id] ?? null })))
            ids.forEach((id) => dirty.current.delete(id))
            setSaveState(dirty.current.size ? 'saving' : 'saved')
            return true
        } catch (err) {
            if (['TIME_UP', 'ALREADY_FINISHED'].includes(err.code)) { finish({ status: err.code === 'TIME_UP' ? 'AUTO_SUBMITTED' : 'SUBMITTED' }); return false }
            setSaveState('offline')
            return false
        }
    }, [finish])

    const change = (qid, value) => {
        setAnswers((a) => ({ ...a, [qid]: value }))
        dirty.current.add(qid)
        setSaveState('saving')
        clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(flush, 700)
    }

    useEffect(() => { const id = setInterval(() => { if (dirty.current.size) flush() }, AUTOSAVE_MS); return () => clearInterval(id) }, [flush])

    // ---- heartbeat: tells the server we are alive, carries the periodic snapshot, and re-syncs the clock ----
    useEffect(() => {
        const beat = async () => {
            await proctor.flushPending()
            const due = Date.now() - lastSnap.current >= cfg.snapshotIntervalSec * 1000
            const snapshot = due ? proctor.snapshot() : null
            try {
                const s = await examApi.heartbeat(snapshot)
                if (snapshot) lastSnap.current = Date.now()
                applyState(s)
            } catch (err) { if (err.code === 'TIME_UP' || err.code === 'ALREADY_FINISHED') finish({ status: 'AUTO_SUBMITTED' }) }
        }
        const id = setInterval(beat, HEARTBEAT_MS)
        beat()
        return () => clearInterval(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [camera])

    // ---- the clock ----
    const remaining = deadline - (now + skew)
    const submit = useCallback(async () => {
        if (submitting || finished.current) return
        setSubmitting(true)
        await flush()
        try { const r = await examApi.submit(); finish({ status: r.status, result: r.result }) } catch (err) { setSubmitting(false); setConfirming(false); if (err.code === 'ALREADY_FINISHED') finish({ status: 'SUBMITTED' }) }
    }, [submitting, flush, finish])
    useEffect(() => { if (remaining <= 0) submit() }, [remaining <= 0]) // eslint-disable-line react-hooks/exhaustive-deps

    // ---- face checks from the camera feed ----
    const onFace = useCallback((message) => { const type = FACE_MESSAGES[message]; if (type && cfg.faceChecks) proctor.report(type, message) }, [cfg.faceChecks]) // eslint-disable-line react-hooks/exhaustive-deps
    const onCameraStream = useCallback((stream) => setCamera(stream), [])

    const q = flat[index]
    const answered = (id) => { const v = answers[id]; return Array.isArray(v) ? v.length > 0 : v && typeof v === 'object' ? Boolean(v.code?.trim()) : Boolean(v && String(v).trim()) }
    const answeredCount = flat.filter((x) => answered(x.id)).length
    const blocked = proctor.lost.fullscreen || proctor.lost.screen || proctor.lost.camera
    const warningsLeft = cfg.maxViolations - count
    const low = remaining <= 5 * 60 * 1000

    const goto = (i) => { if (!paper.allowBackNavigation && i < index) return; flush(); setIndex(Math.min(Math.max(i, 0), flat.length - 1)) }
    const toggleReview = () => setReview((r) => { const n = new Set(r); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n })

    const regrantScreen = async () => {
        setReshareError('')
        const r = await requestScreen()
        if (r.ok) { onScreenStream(r.stream); proctor.clearLost('screen') } else setReshareError(r.message)
    }
    const regrantFullscreen = async () => { try { await document.documentElement.requestFullscreen(); proctor.clearLost('fullscreen') } catch { setReshareError('Your browser blocked full screen. Press F11, or click the button again.') } }

    if (!q) return <div className='p-8 text-center'>This test has no questions.</div>

    return (
        <div className='min-h-screen bg-bg flex flex-col select-none' data-testid='exam-runner'>
            <header className='sticky top-0 z-[var(--z-sticky-header)] bg-card border-b border-line'>
                <div className='max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-3'>
                    <div className='min-w-0 flex-1'>
                        <div className='text-[11.5px] font-semibold text-text-secondary truncate'>{q.sectionTitle}</div>
                        <div className='text-[14px] font-bold text-ink'>Question {index + 1} of {flat.length}</div>
                    </div>
                    <span className='hidden sm:inline-flex items-center gap-1.5 text-[12.5px] text-text-secondary' aria-live='polite'>
                        {saveState === 'saved' && <><CheckCircle2 size={14} className='text-[var(--color-success)]' /> Saved</>}
                        {saveState === 'saving' && <><Loader2 size={14} className='animate-spin' /> Saving…</>}
                        {saveState === 'offline' && <span className='text-[var(--color-danger)] inline-flex items-center gap-1.5'><WifiOff size={14} /> Not saved, retrying</span>}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-2.5 py-1.5 rounded-full ${warningsLeft <= 1 ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]' : count ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]' : 'bg-[var(--color-neutral-soft)] text-text-secondary'}`} title={`${cfg.maxViolations} violations end the test`}>
                        <ShieldAlert size={14} /> Warnings {count}/{cfg.maxViolations}
                    </span>
                    <div role='timer' aria-label='Time left' className={`inline-flex items-center gap-1.5 font-mono text-[17px] font-bold px-3 py-1.5 rounded-xl tabular-nums ${low ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]' : 'bg-ink text-white'}`}>
                        <Clock size={16} /> {clock(remaining)}{low && <span className='sr-only'> — less than five minutes left</span>}
                    </div>
                </div>
                {proctor.notice && Date.now() - proctor.notice.at < 9000 && (
                    // Overlays the page instead of pushing it down: a banner that shifts the layout can land a student's next click on the wrong answer.
                    <div role='alert' className='absolute left-0 right-0 top-full shadow-lg bg-[var(--color-danger)] text-white text-[13.5px] font-medium px-4 py-2 text-center flex items-center justify-center gap-2 pointer-events-none'>
                        <AlertTriangle size={15} /> {proctor.notice.text} {warningsLeft > 0 ? `${warningsLeft} more warning${warningsLeft === 1 ? '' : 's'} and your test ends automatically.` : 'Your test is ending.'}
                    </div>
                )}
            </header>

            <div className='flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_280px] gap-6 items-start' aria-hidden={blocked}>
                <main className='min-w-0 bg-card border border-line rounded-2xl p-5 sm:p-7'>
                    <div className='flex items-start justify-between gap-4 mb-5'>
                        <h1 className='text-[17px] sm:text-[18px] font-semibold text-ink leading-relaxed break-words select-text whitespace-pre-wrap'>{q.text}</h1>
                        <span className='shrink-0 text-[12.5px] font-semibold text-text-secondary bg-[var(--color-neutral-soft)] px-2.5 py-1 rounded-full'>{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
                    </div>
                    <QuestionView key={q.id} question={q} value={answers[q.id]} onChange={(v) => change(q.id, v)} />
                    <div className='flex flex-wrap items-center justify-between gap-3 mt-8 pt-5 border-t border-line'>
                        <div className='flex gap-2'>
                            <Button variant='secondary' size='sm' disabled={index === 0 || !paper.allowBackNavigation} onClick={() => goto(index - 1)}><ChevronLeft size={15} /> Previous</Button>
                            <Button variant='secondary' size='sm' aria-pressed={review.has(q.id)} onClick={toggleReview}><Bookmark size={14} className={review.has(q.id) ? 'fill-current' : ''} /> {review.has(q.id) ? 'Marked for review' : 'Mark for review'}</Button>
                        </div>
                        {index < flat.length - 1 ? <Button size='sm' onClick={() => goto(index + 1)}>Next <ChevronRight size={15} /></Button> : <Button size='sm' onClick={() => { flush(); setConfirming(true) }}>Finish and submit</Button>}
                    </div>
                </main>

                <aside className='space-y-4 lg:sticky lg:top-24'>
                    <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                        <ProctoringCamera active audio={false} onViolation={onFace} onStream={onCameraStream} className='aspect-[4/3] !rounded-none' />
                        <p className='px-3 py-2 text-[11.5px] text-text-secondary'>Your camera is on and your screen is being monitored.</p>
                    </div>
                    <nav aria-label='Questions' className='bg-card border border-line rounded-2xl p-4'>
                        <div className='flex items-center justify-between mb-3'><h2 className='text-[13px] font-bold text-ink'>Questions</h2><span className='text-[12px] text-text-secondary'>{answeredCount}/{flat.length} answered</span></div>
                        <div className='grid grid-cols-6 gap-1.5'>
                            {flat.map((x, i) => (
                                <button key={x.id} onClick={() => goto(i)} disabled={!paper.allowBackNavigation && i < index} aria-label={`Question ${i + 1}${answered(x.id) ? ', answered' : ', not answered'}${review.has(x.id) ? ', marked for review' : ''}`} aria-current={i === index ? 'step' : undefined}
                                    className={`relative h-9 rounded-lg text-[12.5px] font-semibold border transition-colors disabled:opacity-40 ${i === index ? 'ring-2 ring-accent border-accent' : 'border-line'} ${answered(x.id) ? 'bg-accent text-white border-accent' : 'bg-card text-ink hover:bg-black/[0.03]'}`}>
                                    {i + 1}{review.has(x.id) && <span className='absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--color-warning)] border-2 border-card' aria-hidden='true' />}
                                </button>
                            ))}
                        </div>
                        <p className='text-[11.5px] text-text-secondary mt-3'>Filled = answered · Orange dot = marked for review</p>
                        <Button className='w-full mt-4' size='sm' onClick={() => { flush(); setConfirming(true) }}>Submit test</Button>
                    </nav>
                </aside>
            </div>

            {blocked && (
                <div role='alertdialog' aria-modal='true' aria-labelledby='blocked-title' className='fixed inset-0 z-[var(--z-modal)] bg-[#1a1215]/95 flex items-center justify-center p-6'>
                    <div className='bg-card rounded-2xl max-w-md w-full p-7 text-center'>
                        <AlertTriangle size={36} className='mx-auto text-[var(--color-danger)] mb-3' />
                        <h2 id='blocked-title' className='font-display text-[20px] font-bold text-ink mb-2'>Your test is paused from view</h2>
                        <p className='text-[14px] text-text-secondary mb-5'>
                            {proctor.lost.fullscreen ? 'You left full screen.' : proctor.lost.screen ? 'Screen sharing stopped.' : 'Your camera stopped.'} The timer keeps running. Fix it to carry on.
                        </p>
                        {reshareError && <p role='alert' className='text-[13px] text-[var(--color-danger)] mb-3'>{reshareError}</p>}
                        <div className='flex flex-col gap-2'>
                            {proctor.lost.fullscreen && <Button onClick={regrantFullscreen}><Maximize size={16} /> Return to full screen</Button>}
                            {proctor.lost.screen && <Button onClick={regrantScreen}><MonitorUp size={16} /> Share entire screen again</Button>}
                            {proctor.lost.camera && <Button onClick={() => window.location.reload()}>Reload to reconnect the camera</Button>}
                        </div>
                    </div>
                </div>
            )}

            <Modal open={confirming} onClose={() => !submitting && setConfirming(false)} title='Submit your test?' size='sm'
                footer={<><Button variant='secondary' size='sm' disabled={submitting} onClick={() => setConfirming(false)}>Keep working</Button><Button size='sm' disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit now'}</Button></>}>
                <p className='text-[14px] text-ink'>You have answered <b>{answeredCount} of {flat.length}</b> questions{flat.length - answeredCount > 0 && <>, leaving <b>{flat.length - answeredCount}</b> blank</>}.</p>
                {review.size > 0 && <p className='text-[13px] text-[var(--color-warning)] mt-2'>{review.size} question{review.size === 1 ? ' is' : 's are'} still marked for review.</p>}
                <p className='text-[13px] text-text-secondary mt-3'>You cannot change your answers after submitting.</p>
            </Modal>
        </div>
    )
}
