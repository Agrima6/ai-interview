import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, Circle, Clock, Maximize, MonitorUp, ShieldCheck } from 'lucide-react'
import { examApi } from '../../../api/oaApi'
import Button from '../../Button'
import useNow from '../../../hooks/useNow'
import { formatDateTime } from '../oaFormat'
import { describeEnvironment, mobileDevice, requestCamera, requestScreen, stopStream } from './examMedia'
import SlotPicker from './SlotPicker'

const countdown = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000))
    const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60)
    if (d) return `${d}d ${h}h ${m}m`
    return `${h ? `${h}h ` : ''}${String(m).padStart(h ? 2 : 1, '0')}m ${String(s % 60).padStart(2, '0')}s`
}

function Check({ done, label, hint, error, action }) {
    return (
        <li className='flex items-start gap-3 py-3'>
            {done ? <CheckCircle2 size={20} className='ui-pop text-[var(--color-success)] shrink-0 mt-0.5' /> : <Circle size={20} className='text-text-secondary shrink-0 mt-0.5' />}
            <div className='min-w-0 flex-1'>
                <div className='text-[14px] font-semibold text-ink'>{label}</div>
                <div className='text-[12.5px] text-text-secondary'>{hint}</div>
                {error && <div role='alert' className='text-[12.5px] text-[var(--color-danger)] mt-1'>{error}</div>}
            </div>
            {!done && action}
        </li>
    )
}

// Instructions, the system check, the countdown to the start, and the one click that begins the test.
export default function ExamLobby({ session, screenStream, onScreenStream, onStarted, onSlotBooked }) {
    const { assessment: a, student, attempt } = session
    const cfg = a.proctoring
    const now = useNow(1000)
    const skew = useRef(0)
    skew.current = new Date(session.serverNow).getTime() - Date.now()
    const [camera, setCamera] = useState({ ok: false, error: '' })
    const [screen, setScreen] = useState({ ok: Boolean(screenStream), error: '' })
    const [agreed, setAgreed] = useState(false)
    const [starting, setStarting] = useState(false)
    const [error, setError] = useState('')
    const probe = useRef(null)
    const resuming = attempt?.status === 'IN_PROGRESS'
    const extended = typeof window !== 'undefined' && window.screen?.isExtended === true
    const small = mobileDevice()

    useEffect(() => () => stopStream(probe.current), [])

    const checkCamera = async () => {
        const r = await requestCamera()
        if (r.ok) { stopStream(probe.current); probe.current = r.stream; setCamera({ ok: true, error: '' }) } else setCamera({ ok: false, error: r.message })
    }
    const checkScreen = async () => {
        const r = await requestScreen()
        if (r.ok) { onScreenStream(r.stream); setScreen({ ok: true, error: '' }) } else setScreen({ ok: false, error: r.message })
    }

    const startAt = a.schedule.startAt ? new Date(a.schedule.startAt).getTime() : null
    const untilStart = startAt === null ? 0 : startAt - (now + skew.current)
    const choosing = a.phase === 'CHOOSE_SLOT' || a.phase === 'NO_SLOT'
    const open = a.phase === 'OPEN' || resuming
    const needCamera = cfg.requireCamera; const needScreen = cfg.requireScreenShare
    const ready = (!needCamera || camera.ok) && (!needScreen || screen.ok) && agreed && !(cfg.level === 'HARD' && extended) && !small

    const begin = async () => {
        if (starting) return
        setStarting(true); setError('')
        // Full screen must be requested inside this click, before anything is awaited, or the browser refuses it.
        const fullscreen = cfg.requireFullscreen ? document.documentElement.requestFullscreen().catch(() => 'blocked') : null
        try {
            if (fullscreen && (await fullscreen) === 'blocked') throw new Error('Your browser blocked full screen. Allow it for this site, then try again.')
            stopStream(probe.current); probe.current = null          // the exam opens its own camera feed
            const paper = await examApi.start(describeEnvironment())
            onStarted(paper)
        } catch (err) {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
            setError(err.message); setStarting(false)
        }
    }

    return (
        <div className='min-h-screen bg-bg'>
            <header className='bg-card border-b border-line'>
                <div className='max-w-[1100px] mx-auto px-5 h-16 flex items-center justify-between'>
                    <span className='font-display text-[16px] font-bold text-ink'>{a.title}</span>
                    <span className='text-[13px] text-text-secondary'>Signed in as <b className='text-ink'>{student.name}</b></span>
                </div>
            </header>
            <main className='max-w-[1100px] mx-auto px-5 py-8 grid lg:grid-cols-[1fr_420px] gap-8 items-start'>
                <section className='space-y-6 oa-stagger'>
                    <div className='oa-mesh bg-card border border-line rounded-2xl p-6'>
                        <div className='flex items-center gap-2 text-[13px] font-semibold text-accent mb-2'><Clock size={15} />
                            {a.phase === 'UPCOMING' ? 'Starts in' : a.phase === 'OPEN' ? 'The test is open' : resuming ? 'You are part-way through' : a.phase === 'CHOOSE_SLOT' ? 'Pick your time' : a.phase === 'NO_SLOT' ? 'No slot booked' : ''}</div>
                        {a.phase === 'CHOOSE_SLOT' && <div className='font-display text-[24px] font-bold text-ink'>Choose a start time below</div>}
                        {a.phase === 'NO_SLOT' && <div className='font-display text-[22px] font-bold text-ink'>You did not book a slot in time</div>}
                        {a.phase === 'UPCOMING' && <div className='font-display text-[34px] font-bold text-ink tabular-nums' aria-live='off'>{countdown(untilStart)}</div>}
                        {a.phase === 'OPEN' && !resuming && <div className='font-display text-[28px] font-bold text-ink'>You can start now</div>}
                        {resuming && <div className='font-display text-[24px] font-bold text-ink'>Resume your test</div>}
                        <dl className='grid sm:grid-cols-3 gap-4 mt-5 text-[13px]'>
                            <div><dt className='text-text-secondary'>Starts</dt><dd className='font-semibold text-ink'>{startAt === null ? 'Choose a slot' : formatDateTime(a.schedule.startAt, a.schedule.timezone)}</dd></div>
                            <div><dt className='text-text-secondary'>Duration</dt><dd className='font-semibold text-ink'>{a.schedule.durationMinutes} minutes</dd></div>
                            <div><dt className='text-text-secondary'>Questions</dt><dd className='font-semibold text-ink'>{a.questionCount} · {a.totalMarks} marks</dd></div>
                        </dl>
                    </div>
                    {a.slots && !resuming && <SlotPicker slots={a.slots} cutoffMinutes={a.slotCutoffMinutes} timezone={a.schedule.timezone} durationMinutes={a.schedule.durationMinutes} onBooked={onSlotBooked} />}
                    {a.description && <p className='text-[14px] text-ink leading-relaxed'>{a.description}</p>}
                    <div className='bg-card border border-line rounded-2xl p-6'>
                        <h2 className='text-[15px] font-bold text-ink mb-3'>Instructions</h2>
                        {a.instructions && <p className='text-[14px] text-ink whitespace-pre-wrap leading-relaxed mb-4'>{a.instructions}</p>}
                        <ul className='text-[13.5px] text-ink space-y-2 list-disc pl-5'>
                            <li>The clock starts when you press Start and does not stop. Your answers save automatically.</li>
                            <li>Your questions are in an order of your own. Other students see them differently.</li>
                            {!a.allowBackNavigation && <li>You cannot go back to a question once you move on.</li>}
                            {cfg.requireFullscreen && <li>The test runs in full screen. Leaving it is recorded.</li>}
                            <li>Switching tabs or windows, {cfg.blockCopyPaste && 'copying or pasting, '}opening developer tools or a second screen is recorded{cfg.faceChecks && ', and so is your face leaving the camera or a second person appearing'}.</li>
                            <li><b>After {cfg.maxViolations} violations the test ends automatically</b> and is flagged for your organizer.</li>
                            <li>Use a laptop or desktop in the latest Chrome or Edge. Close everything else first.</li>
                        </ul>
                    </div>
                </section>

                <aside className='bg-card border border-line rounded-2xl p-6 lg:sticky lg:top-6'>
                    <h2 className='text-[15px] font-bold text-ink flex items-center gap-2'><ShieldCheck size={17} className='text-accent' /> System check</h2>
                    <p className='text-[12.5px] text-text-secondary mt-0.5'>{cfg.level === 'HARD' ? 'Hard proctoring: everything below is required.' : 'Complete the checks your organizer requires.'}</p>
                    {small && <p role='alert' className='mt-3 text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5'>This test cannot be taken on a phone or tablet. Please open the link on a laptop or desktop.</p>}
                    <ul className='divide-y divide-line mt-2'>
                        {needCamera && <Check done={camera.ok} label='Webcam' hint='We show your own video during the test.' error={camera.error} action={<Button size='xs' variant='secondary' onClick={checkCamera}><Camera size={13} /> Allow</Button>} />}
                        {needScreen && <Check done={screen.ok} label='Share your entire screen' hint='Choose “Entire screen” in the browser prompt.' error={screen.error} action={<Button size='xs' variant='secondary' onClick={checkScreen}><MonitorUp size={13} /> Share</Button>} />}
                        {cfg.requireFullscreen && <Check done label='Full screen' hint='Turns on automatically when you start.' />}
                        <Check done={!extended} label='One screen only' hint={extended ? 'A second display is connected. Disconnect it to begin.' : 'No second display found.'} error={extended && cfg.level === 'HARD' ? 'Disconnect the second monitor.' : ''} />
                    </ul>
                    <label className='flex items-start gap-3 mt-4 cursor-pointer'>
                        <input type='checkbox' checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className='mt-1 w-4 h-4 accent-[var(--color-accent)]' />
                        <span className='text-[13px] text-ink'>I understand the rules, and I agree to be monitored by camera and screen during this test.</span>
                    </label>
                    {error && <p role='alert' className='mt-3 text-[13px] text-[var(--color-danger)] flex items-start gap-2'><AlertTriangle size={15} className='mt-0.5 shrink-0' /> {error}</p>}
                    <Button className={`w-full mt-5 oa-press ${ready && open && !starting ? 'oa-ring' : ''}`} disabled={!ready || !open || starting} onClick={begin}>
                        <Maximize size={16} /> {starting ? 'Starting…' : resuming ? 'Resume test' : open ? 'Start test' : a.phase === 'UPCOMING' ? 'Waiting for the start time' : a.phase === 'CHOOSE_SLOT' ? 'Choose a time slot first' : 'Not available'}
                    </Button>
                    {choosing && a.phase === 'CHOOSE_SLOT' && <p className='text-[12px] text-text-secondary mt-2 text-center'>Book a slot first. You can finish the checks now.</p>}
                    {!open && a.phase === 'UPCOMING' && <p className='text-[12px] text-text-secondary mt-2 text-center'>You can finish the checks now. The button turns on at the start time.</p>}
                    {a.phase === 'CLOSED_TO_ENTRY' && !resuming && <p role='alert' className='text-[12.5px] text-[var(--color-danger)] mt-2'>The late-entry window has closed. Please contact your organizer.</p>}
                </aside>
            </main>
        </div>
    )
}
