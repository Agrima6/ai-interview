import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, Loader2, LogOut, ShieldAlert } from 'lucide-react'
import { examApi, oaTokens } from '../../api/oaApi'
import Button from '../../components/Button'
import ExamLobby from '../../components/oa/exam/ExamLobby'
import ExamRunner from '../../components/oa/exam/ExamRunner'
import { stopStream } from '../../components/oa/exam/examMedia'
import { ErrorState } from '../../components/oa/oaUi'
import ExamBrand from '../../components/oa/ExamBrand'

// "Right after the test" rounds go on to the AI interview in the same sitting: no email, no new sign-in.
function useContinueToAi(enabled) {
    const navigate = useNavigate()
    const [state, setState] = useState({ phase: enabled ? 'working' : 'idle', error: '' })        // idle | working | emailed | failed
    const started = useRef(false)
    const run = useCallback(() => {
        examApi.aiInterview().then((r) => {
            if (r.emailed || !r.ticket || !r.path) { setState({ phase: 'emailed', error: '' }); return }
            examApi.logout()
            navigate(`/candidate/handoff#ticket=${encodeURIComponent(r.ticket)}&to=${encodeURIComponent(r.path)}`, { replace: true })
        }).catch((err) => setState({ phase: 'failed', error: err.message }))
    }, [navigate])
    useEffect(() => { if (enabled && !started.current) { started.current = true; run() } }, [enabled, run])
    // While the interview is opening, closing or refreshing the page would lose the way in: the browser asks first.
    const holding = state.phase === 'working'
    useEffect(() => {
        if (!holding) return undefined
        const guard = (e) => { e.preventDefault(); e.returnValue = '' }
        window.addEventListener('beforeunload', guard)
        return () => window.removeEventListener('beforeunload', guard)
    }, [holding])
    const retry = useCallback(() => { setState({ phase: 'working', error: '' }); run() }, [run])
    return { ...state, retry }
}

function Finished({ session, info, onLeave }) {
    const status = info?.status || session.attempt?.status
    const continuing = useContinueToAi(session.assessment?.aiNext === 'AUTO' && ['SUBMITTED', 'AUTO_SUBMITTED'].includes(status))
    const result = info?.result || session.result
    const reason = info?.endReason || session.attempt?.endReason
    const view = {
        SUBMITTED: [CheckCircle2, 'var(--color-success)', 'Your test has been submitted', session.assessment?.aiNext === 'AUTO' ? 'Your answers are saved. Your AI interview starts now.' : session.assessment?.aiNext === 'REVIEW' ? 'Your answers are saved. If you qualify, you will be invited to a short AI interview by email.' : 'Your answers are saved. Your organizer will share the results.'],
        AUTO_SUBMITTED: [Clock, 'var(--color-warning)', 'Time is up', session.assessment?.aiNext === 'AUTO' ? 'Your answers were submitted automatically. Your AI interview starts now.' : session.assessment?.aiNext === 'REVIEW' ? 'Your answers were submitted automatically. If you qualify, you will be invited to a short AI interview by email.' : 'Your answers were submitted automatically. Your organizer will share the results.'],
        TERMINATED: [ShieldAlert, 'var(--color-danger)', 'Your test has ended', 'It ended automatically because of repeated proctoring violations. Your answers so far were saved, and your organizer will review what happened.'],
    }[status] || [CheckCircle2, 'var(--color-success)', 'Your test is complete', 'Thank you.']
    const [Icon, color, title, text] = view
    return (
        <div className='min-h-screen bg-bg flex items-center justify-center p-5'>
            <div className='bg-card border border-line rounded-3xl max-w-md w-full p-8 text-center'>
                <div className='flex justify-center mb-6'><ExamBrand brand={session.assessment?.brand} size={40} /></div>
                <Icon size={48} style={{ color }} className='mx-auto mb-4' />
                <h1 className='font-display text-[24px] font-bold text-ink mb-2'>{title}</h1>
                <p className='text-[14.5px] text-text-secondary leading-relaxed'>{text}</p>
                {status === 'TERMINATED' && reason && <p className='text-[13px] text-text-secondary mt-3'>{reason}</p>}
                {result && (
                    <div className='mt-6 border border-line rounded-2xl py-4'>
                        <div className='text-[12px] font-semibold text-text-secondary'>Your score</div>
                        <div className='font-display text-[32px] font-bold text-ink tabular-nums'>{result.score}<span className='text-[18px] text-text-secondary'> / {result.maxScore}</span></div>
                        <div className={`text-[13px] font-semibold ${result.passed ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>{result.percent}% · {result.passed ? 'Passed' : 'Not passed'}</div>
                    </div>
                )}
                {session.assessment?.aiNext === 'AUTO' && continuing.phase === 'working' && (
                    <div role='status' className='mt-5 rounded-2xl border-2 border-accent bg-accent/5 px-4 py-4 text-left'>
                        <p className='flex items-center gap-2 text-[14px] font-bold text-ink'><Loader2 size={16} className='animate-spin text-accent' aria-hidden='true' /> Your AI interview is beginning</p>
                        <p className='mt-1.5 text-[13px] text-text-secondary'><b className='text-ink'>Please do not close or refresh this page.</b> It opens by itself in a few seconds. Keep your camera and microphone ready, and sit somewhere quiet.</p>
                    </div>
                )}
                {continuing.phase === 'emailed' && <p role='status' className='mt-5 text-[13.5px] text-ink bg-[var(--color-warning-soft)] rounded-xl px-3.5 py-2.5'>We could not open it automatically, so we emailed you the interview link. Use that link to continue.</p>}
                {continuing.phase === 'failed' && (
                    <div role='alert' className='mt-5'>
                        <p className='text-[13px] text-[var(--color-danger)] mb-2'>{continuing.error || 'Could not open the AI interview.'}</p>
                        <Button size='sm' onClick={continuing.retry}>Try again</Button>
                    </div>
                )}
                {continuing.phase !== 'working' && <Button variant='secondary' size='sm' className='mt-7' onClick={onLeave}><LogOut size={14} /> Sign out</Button>}
            </div>
        </div>
    )
}

// "Loading" that admits when it is taking long, and offers a way out instead of leaving the candidate staring at a spinner.
function SlowLoading({ onRetry }) {
    const [slow, setSlow] = useState(false)
    useEffect(() => { const id = setTimeout(() => setSlow(true), 12000); return () => clearTimeout(id) }, [])
    return (
        <div className='min-h-screen bg-bg flex flex-col items-center justify-center gap-3 px-6 text-center' role='status'>
            <p className='text-[14px] text-text-secondary'>Loading your test…</p>
            {slow && (
                <>
                    <p className='text-[13px] text-text-secondary max-w-sm'>This is taking longer than usual. Your answers are safe. You can wait, or try again.</p>
                    <Button size='sm' variant='secondary' onClick={onRetry}>Try again</Button>
                </>
            )}
        </div>
    )
}

export default function OaExamPage() {
    const navigate = useNavigate()
    const hasToken = Boolean(oaTokens.get('student'))
    const [paper, setPaper] = useState(null)
    const [screenStream, setScreenStream] = useState(null)
    const [finish, setFinish] = useState(null)
    const session = useQuery({ queryKey: ['oa-exam', 'session'], queryFn: examApi.session, enabled: hasToken, retry: false, refetchInterval: (q) => (!paper && !finish && q.state.data && q.state.data.attempt?.status !== 'SUBMITTED' ? 15000 : false) })

    useEffect(() => () => stopStream(screenStream), [screenStream])

    const leave = useCallback(() => { stopStream(screenStream); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); examApi.logout(); navigate('/oa/exam', { replace: true }) }, [navigate, screenStream])
    const onFinish = useCallback((info) => {
        setFinish(info); setPaper(null)
        stopStream(screenStream); setScreenStream(null)
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        session.refetch()
    }, [screenStream, session])

    if (!hasToken) return <Navigate to='/oa/exam' replace />
    if (session.isError) return <div className='min-h-screen bg-bg flex items-center justify-center'><ErrorState title='Could not open your test' message={session.error.message} onRetry={session.refetch} /></div>
    if (!session.data) return <SlowLoading onRetry={session.refetch} />

    const s = session.data
    const done = finish || (s.attempt && s.attempt.status !== 'IN_PROGRESS')
    if (done) return <Finished session={s} info={finish} onLeave={leave} />
    if (paper) return <ExamRunner paper={paper} screenStream={screenStream} onScreenStream={setScreenStream} onFinish={onFinish} />
    return <ExamLobby session={s} screenStream={screenStream} onScreenStream={setScreenStream} onStarted={setPaper} onSlotBooked={session.refetch} />
}
