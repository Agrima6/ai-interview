import React, { useState, useEffect, useRef } from 'react'
import {
    Video, VideoOff, Mic, MicOff, CheckCircle2, AlertTriangle, ShieldCheck,
    Volume2, Loader2, Sparkles
} from 'lucide-react'
import { Modal, Button } from '../ui'

export default function DeviceCheckModal({ open, onClose, onReadyToStart }) {
    if (!open) return null

    const [videoStream, setVideoStream] = useState(null)
    const [audioStream, setAudioStream] = useState(null)
    const [audioLevel, setAudioLevel] = useState(0)
    const [cameraOk, setCameraOk] = useState(false)
    const [micOk, setMicOk] = useState(false)
    const [checking, setChecking] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')

    const videoRef = useRef(null)
    const animFrameRef = useRef(null)
    const audioContextRef = useRef(null)

    useEffect(() => {
        let stream = null

        const startMedia = async () => {
            setChecking(true)
            setErrorMsg('')
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: true,
                })

                setVideoStream(stream)
                setAudioStream(stream)
                setCameraOk(stream.getVideoTracks().length > 0)
                setMicOk(stream.getAudioTracks().length > 0)

                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }

                // Audio level meter
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
                audioContextRef.current = audioCtx
                const analyser = audioCtx.createAnalyser()
                analyser.fftSize = 256
                const source = audioCtx.createMediaStreamSource(stream)
                source.connect(analyser)

                const dataArray = new Uint8Array(analyser.frequencyBinCount)

                const tick = () => {
                    analyser.getByteFrequencyData(dataArray)
                    let sum = 0
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
                    const avg = sum / dataArray.length
                    setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)))
                    animFrameRef.current = requestAnimationFrame(tick)
                }
                tick()
            } catch (err) {
                setErrorMsg('Camera or Microphone access was denied or not found. Please allow access in your browser settings.')
            } finally {
                setChecking(false)
            }
        }

        startMedia()

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => {})
            }
            if (stream) {
                stream.getTracks().forEach((track) => track.stop())
            }
        }
    }, [open])

    const handleClose = () => {
        if (videoStream) {
            videoStream.getTracks().forEach((track) => track.stop())
        }
        onClose()
    }

    const handleStartInterview = () => {
        if (videoStream) {
            videoStream.getTracks().forEach((track) => track.stop())
        }
        onReadyToStart?.()
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title='Hardware & Audio Readiness Test'
            subtitle='Verify your camera feed and microphone before entering the real-time AI interview.'
            size='md'
        >
            <div className='space-y-4 pt-1 pb-3'>
                {errorMsg && (
                    <div className='p-3.5 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-600 flex items-center gap-2'>
                        <AlertTriangle size={16} className='shrink-0' />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Camera Live Preview */}
                <div className='relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center border border-line'>
                    <video ref={videoRef} autoPlay muted playsInline className='w-full h-full object-cover mirror' />
                    {checking && (
                        <div className='absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[13px] gap-2'>
                            <Loader2 size={16} className='animate-spin text-accent' /> Initializing camera...
                        </div>
                    )}
                    <div className='absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full'>
                        {cameraOk ? (
                            <>
                                <span className='w-2 h-2 rounded-full bg-success animate-pulse' /> Camera Connected (HD)
                            </>
                        ) : (
                            <>
                                <VideoOff size={12} className='text-red-400' /> Camera Inactive
                            </>
                        )}
                    </div>
                </div>

                {/* Microphone Level Meter */}
                <div className='p-4 rounded-xl border border-line bg-card/60'>
                    <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2 text-ink text-[13px] font-semibold'>
                            <Mic size={15} className='text-accent' /> Microphone Test
                        </div>
                        <span className={`text-[11.5px] font-bold ${micOk ? 'text-success' : 'text-text-secondary'}`}>
                            {micOk ? (audioLevel > 5 ? 'Speaking Detected' : 'Connected') : 'Inactive'}
                        </span>
                    </div>

                    <div className='w-full bg-black/10 dark:bg-white/10 rounded-full h-2.5 overflow-hidden'>
                        <div
                            className='h-full bg-success transition-all duration-75 rounded-full'
                            style={{ width: `${Math.max(5, audioLevel)}%` }}
                        />
                    </div>
                    <p className='text-[11.5px] text-text-secondary mt-1.5'>
                        Speak aloud to verify audio bars react to your voice.
                    </p>
                </div>

                {/* Proctoring Checklist */}
                <div className='p-3.5 rounded-xl border border-line bg-card/40 space-y-2 text-[12.5px] text-text-secondary'>
                    <div className='flex items-center gap-2 text-ink font-semibold'>
                        <ShieldCheck size={15} className='text-accent' /> Environment Readiness Checklist
                    </div>
                    <div className='flex items-center gap-2'>
                        <CheckCircle2 size={13} className='text-success shrink-0' /> Quiet, well-lit room with clear face visibility
                    </div>
                    <div className='flex items-center gap-2'>
                        <CheckCircle2 size={13} className='text-success shrink-0' /> Working microphone & earphones recommended
                    </div>
                    <div className='flex items-center gap-2'>
                        <CheckCircle2 size={13} className='text-success shrink-0' /> Stable internet connection
                    </div>
                </div>

                {/* Actions */}
                <div className='pt-3 border-t border-line flex items-center justify-end gap-3'>
                    <Button type='button' variant='secondary' size='sm' onClick={handleClose}>
                        Close
                    </Button>
                    <Button
                        type='button'
                        size='sm'
                        onClick={handleStartInterview}
                        disabled={!cameraOk || !micOk}
                    >
                        Ready to Start Interview →
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
