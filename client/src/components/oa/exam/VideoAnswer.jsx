import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Circle, RotateCcw, Square, Upload, Video } from 'lucide-react'
import { examApi } from '../../../api/oaApi'
import Button from '../../Button'
import { stopStream } from './examMedia'

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const pickMime = () => ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || ''

// A recording whose upload failed is kept here, so moving to another question and back does not throw it away.
const unsaved = new Map()   // questionId -> { blob, seconds }

/**
 * A video answer ("Tell me about yourself"). Pressing Stop uploads the recording straight away: there is no separate
 * save step to forget, and the question turns green as soon as the server has the video. If the upload fails the
 * recording is kept and can be sent again. `value` is `{ recorded: true, durationSec }` once the server has it.
 */
export default function VideoAnswer({ question: q, value, onChange }) {
    const max = q.maxDurationSec || 120
    const kept = unsaved.get(q.id)
    const [phase, setPhase] = useState(value?.recorded ? 'saved' : kept ? 'failed' : 'idle')   // idle | recording | uploading | saved | failed
    const [elapsed, setElapsed] = useState(kept?.seconds || 0)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState(kept ? 'Your recording has not been saved yet. Send it again.' : '')
    const [previewUrl, setPreviewUrl] = useState('')
    const live = useRef(null)
    const stream = useRef(null)
    const recorder = useRef(null)
    const chunks = useRef([])
    const timer = useRef(null)
    const started = useRef(0)
    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange })
    const mounted = useRef(true)

    const release = useCallback(() => { clearInterval(timer.current); stopStream(stream.current); stream.current = null }, [])
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; release() } }, [release])
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
    useEffect(() => { if (phase === 'recording' && live.current && stream.current) live.current.srcObject = stream.current }, [phase])

    const stop = useCallback(() => { if (recorder.current?.state === 'recording') recorder.current.stop() }, [])

    // Sends a recording to the server. Keeps going if the candidate moves to another question meanwhile.
    const upload = useCallback(async (blob, seconds) => {
        if (mounted.current) { setPhase('uploading'); setError(''); setProgress(0) }
        try {
            await examApi.uploadVideo(q.id, blob, seconds, (p) => { if (mounted.current) setProgress(p) })
            unsaved.delete(q.id)
            onChangeRef.current({ recorded: true, durationSec: Math.round(seconds) })
            if (mounted.current) setPhase('saved')
        } catch (err) {
            unsaved.set(q.id, { blob, seconds })
            if (mounted.current) { setError(err.message || 'The upload failed. Check your connection and send it again.'); setPhase('failed') }
        }
    }, [q.id])

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
            const blob = new Blob(chunks.current, { type: rec.mimeType || mimeType || 'video/webm' })
            const seconds = Math.min(max, (Date.now() - started.current) / 1000)
            release()
            if (mounted.current) { setElapsed(seconds); setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob) }) }
            upload(blob, seconds)
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

    const again = () => { unsaved.delete(q.id); setPreviewUrl(''); setError(''); setPhase('idle') }
    const retry = () => { const k = unsaved.get(q.id); if (k) upload(k.blob, k.seconds) }

    return (
        <div>
            <p className='text-[12.5px] text-text-secondary mb-3'>Press Start, answer, then press Stop. Your video is sent to your organizer automatically. You can record again before you finish. Up to {clock(max)}.</p>
            <div className='rounded-2xl border border-line bg-[#1a1215] overflow-hidden aspect-video max-w-xl relative'>
                {phase === 'recording' && <video ref={live} autoPlay muted playsInline className='w-full h-full object-cover -scale-x-100' aria-label='Your camera' />}
                {['uploading', 'failed'].includes(phase) && previewUrl && <video src={previewUrl} controls playsInline className='w-full h-full object-contain' aria-label='Your recording' />}
                {(phase === 'idle' || phase === 'saved' || (phase === 'failed' && !previewUrl)) && (
                    <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 px-6 text-center'>
                        {phase === 'saved' ? <CheckCircle2 size={38} className='text-[var(--color-success)]' /> : phase === 'failed' ? <AlertTriangle size={38} className='text-[var(--color-warning)]' /> : <Video size={38} />}
                        <span className='text-[13.5px] font-medium'>{phase === 'saved' ? `Your answer is saved${value?.durationSec ? ` (${clock(value.durationSec)})` : ''}` : phase === 'failed' ? 'Recorded, but not sent yet' : 'Your video answer will appear here'}</span>
                    </div>
                )}
                {phase === 'recording' && (
                    <span className='absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 text-white text-[12px] font-semibold px-2.5 py-1' role='timer'>
                        <Circle size={10} className='fill-[var(--color-danger)] text-[var(--color-danger)] oa-ring' aria-hidden='true' /> REC {clock(elapsed)} / {clock(max)}
                    </span>
                )}
            </div>
            {phase === 'uploading' && (
                <div className='max-w-xl mt-3' role='progressbar' aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label='Sending your video'>
                    <div className='h-2 rounded-full bg-line overflow-hidden'><div className='h-full bg-accent transition-[width]' style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} /></div>
                    <p className='text-[12px] text-text-secondary mt-1'>Sending your video… {Math.round(progress * 100)}%. You can keep this page open while it finishes.</p>
                </div>
            )}
            {error && <p role='alert' className='text-[13px] text-[var(--color-danger)] mt-3 max-w-xl'>{error}</p>}
            <div className='flex flex-wrap gap-2 mt-4'>
                {phase === 'idle' && <Button size='sm' onClick={start}><Circle size={14} className='fill-current' /> Start recording</Button>}
                {phase === 'recording' && <Button size='sm' variant='danger' onClick={stop}><Square size={14} className='fill-current' /> Stop and send</Button>}
                {phase === 'failed' && <><Button size='sm' onClick={retry}><Upload size={14} /> Send again</Button><Button size='sm' variant='secondary' onClick={again}><RotateCcw size={14} /> Record again</Button></>}
                {phase === 'saved' && <Button size='sm' variant='secondary' onClick={again}><RotateCcw size={14} /> Record again</Button>}
            </div>
        </div>
    )
}
