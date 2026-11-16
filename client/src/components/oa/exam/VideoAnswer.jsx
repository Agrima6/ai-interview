import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle, RotateCcw, Square, Upload, Video } from 'lucide-react'
import { examApi } from '../../../api/oaApi'
import Button from '../../Button'
import { stopStream } from './examMedia'

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const pickMime = () => ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || ''

/**
 * A video answer ("Tell me about yourself"): the candidate records with their camera and microphone, watches it back,
 * and uploads it. The recording is sent on its own, never through the autosave of written answers.
 * `value` is `{ recorded: true, durationSec }` once the server has it.
 */
export default function VideoAnswer({ question: q, value, onChange }) {
    const max = q.maxDurationSec || 120
    const [phase, setPhase] = useState(value?.recorded ? 'saved' : 'idle')   // idle | recording | review | uploading | saved
    const [elapsed, setElapsed] = useState(0)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState('')
    const [previewUrl, setPreviewUrl] = useState('')
    const live = useRef(null)
    const stream = useRef(null)
    const recorder = useRef(null)
    const chunks = useRef([])
    const blob = useRef(null)
    const timer = useRef(null)
    const started = useRef(0)

    const release = useCallback(() => { clearInterval(timer.current); stopStream(stream.current); stream.current = null }, [])
    useEffect(() => () => release(), [release])
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
    useEffect(() => { if (phase === 'recording' && live.current && stream.current) live.current.srcObject = stream.current }, [phase])

    const stop = useCallback(() => { if (recorder.current?.state === 'recording') recorder.current.stop() }, [])

    const start = async () => {
        setError('')
        if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) { setError('This browser cannot record video. Use the latest desktop Chrome or Edge.'); return }
        try {
            stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true })
        } catch { setError('Allow the camera and the microphone in your browser, then press Record again.'); return }
        chunks.current = []
        const mimeType = pickMime()
        const rec = new MediaRecorder(stream.current, mimeType ? { mimeType, videoBitsPerSecond: 800000 } : undefined)
        recorder.current = rec
        rec.ondataavailable = (e) => { if (e.data?.size) chunks.current.push(e.data) }
        rec.onstop = () => {
            const type = rec.mimeType || mimeType || 'video/webm'
            blob.current = new Blob(chunks.current, { type })
            release()
            setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob.current) })
            setElapsed(Math.min(max, (Date.now() - started.current) / 1000))
            setPhase('review')
        }
        rec.start(1000)
        started.current = Date.now()
        setElapsed(0); setPhase('recording')
        timer.current = setInterval(() => {
            const s = (Date.now() - started.current) / 1000
            setElapsed(s)
            if (s >= max) stop()
        }, 250)
    }

    const upload = async () => {
        if (!blob.current || phase === 'uploading') return
        setPhase('uploading'); setError(''); setProgress(0)
        try {
            await examApi.uploadVideo(q.id, blob.current, elapsed, setProgress)
            onChange({ recorded: true, durationSec: Math.round(elapsed) })
            setPhase('saved')
        } catch (err) { setError(err.message || 'The upload failed. Check your connection and try again.'); setPhase('review') }
    }

    const again = () => { blob.current = null; setPreviewUrl(''); setError(''); setPhase('idle') }

    return (
        <div>
            <p className='text-[12.5px] text-text-secondary mb-3'>Record your answer with your camera and microphone. You can watch it back and record again before you save it. Up to {clock(max)}.</p>
            <div className='rounded-2xl border border-line bg-[#1a1215] overflow-hidden aspect-video max-w-xl relative'>
                {phase === 'recording' && <video ref={live} autoPlay muted playsInline className='w-full h-full object-cover -scale-x-100' aria-label='Your camera' />}
                {(phase === 'review' || phase === 'uploading') && previewUrl && <video src={previewUrl} controls playsInline className='w-full h-full object-contain' aria-label='Your recording' />}
                {(phase === 'idle' || phase === 'saved') && (
                    <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80'>
                        {phase === 'saved' ? <CheckCircle2 size={38} className='text-[var(--color-success)]' /> : <Video size={38} />}
                        <span className='text-[13.5px] font-medium'>{phase === 'saved' ? `Your answer is saved${value?.durationSec ? ` (${clock(value.durationSec)})` : ''}` : 'Your video answer will appear here'}</span>
                    </div>
                )}
                {phase === 'recording' && (
                    <span className='absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 text-white text-[12px] font-semibold px-2.5 py-1' role='timer'>
                        <Circle size={10} className='fill-[var(--color-danger)] text-[var(--color-danger)] oa-ring' aria-hidden='true' /> REC {clock(elapsed)} / {clock(max)}
                    </span>
                )}
            </div>
            {phase === 'uploading' && (
                <div className='max-w-xl mt-3' role='progressbar' aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label='Uploading your video'>
                    <div className='h-2 rounded-full bg-line overflow-hidden'><div className='h-full bg-accent transition-[width]' style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                    <p className='text-[12px] text-text-secondary mt-1'>Uploading… {Math.round(progress * 100)}%. Keep this page open.</p>
                </div>
            )}
            {error && <p role='alert' className='text-[13px] text-[var(--color-danger)] mt-3 max-w-xl'>{error}</p>}
            <div className='flex flex-wrap gap-2 mt-4'>
                {phase === 'idle' && <Button size='sm' onClick={start}><Circle size={14} className='fill-current' /> Start recording</Button>}
                {phase === 'recording' && <Button size='sm' variant='danger' onClick={stop}><Square size={14} className='fill-current' /> Stop recording</Button>}
                {phase === 'review' && <><Button size='sm' onClick={upload}><Upload size={14} /> Save this answer</Button><Button size='sm' variant='secondary' onClick={again}><RotateCcw size={14} /> Record again</Button></>}
                {phase === 'saved' && <Button size='sm' variant='secondary' onClick={again}><RotateCcw size={14} /> Record again</Button>}
            </div>
        </div>
    )
}
