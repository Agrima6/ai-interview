import React, { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, LogOut, ShieldAlert } from 'lucide-react'
import { examApi, oaTokens } from '../../api/oaApi'
import Button from '../../components/Button'
import ExamLobby from '../../components/oa/exam/ExamLobby'
import ExamRunner from '../../components/oa/exam/ExamRunner'
import { stopStream } from '../../components/oa/exam/examMedia'
import { ErrorState } from '../../components/oa/oaUi'
import ExamBrand from '../../components/oa/ExamBrand'

function Finished({ session, info, onLeave }) {
    const status = info?.status || session.attempt?.status
    const result = info?.result || session.result
    const reason = info?.endReason || session.attempt?.endReason
    const view = {
        SUBMITTED: [CheckCircle2, 'var(--color-success)', 'Your test has been submitted', 'Your answers are saved. Your organizer will share the results.'],
        AUTO_SUBMITTED: [Clock, 'var(--color-warning)', 'Time is up', 'Your answers were submitted automatically. Your organizer will share the results.'],
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
                <Button variant='secondary' size='sm' className='mt-7' onClick={onLeave}><LogOut size={14} /> Sign out</Button>
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
