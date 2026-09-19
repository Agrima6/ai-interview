import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Room, RoomEvent, Track } from 'livekit-client'
import {
    Maximize, AlertTriangle, ShieldAlert, Bot, Loader2, Mic, MicOff, Video, VideoOff,
    LogOut, Clock, Sparkles, Lightbulb, CheckCircle2, Circle, ScreenShare, ScreenShareOff,
    MessageSquare, Subtitles, Volume2, ShieldCheck, Copy, RefreshCw, User, Check,
    AlertCircle, ArrowRight
} from 'lucide-react'
import { Card } from '../../components/ui'
import { reportInterviewViolation, completeInterview, startAgentInterview, completeAgentInterview, uploadInterviewRecording } from '../../api/organization/organizationApi'
import logo from '../../assets/logo.png'

const MAX_VIOLATIONS = 3

const formatElapsed = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

function InterviewRoomPage() {
    const { driveId, roundNumber } = useParams()
    const navigate = useNavigate()

    // Session State
    const [started, setStarted] = useState(false)
    const [violationCount, setViolationCount] = useState(0)
    const [violationMessage, setViolationMessage] = useState('')
    const [terminated, setTerminated] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [connectState, setConnectState] = useState('connecting') // connecting | connected | agent-joining | failed
    const [connectError, setConnectError] = useState('')
    const [agentSpeaking, setAgentSpeaking] = useState(false)
    const [micOn, setMicOn] = useState(true)
    const [cameraOn, setCameraOn] = useState(true)
    const [screenShareOn, setScreenShareOn] = useState(false)
    const [questions, setQuestions] = useState([])
    const [activeTab, setActiveTab] = useState('question') // 'question' | 'transcript' | 'notes'
    const [notes, setNotes] = useState('')
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [showCaptions, setShowCaptions] = useState(true)

    // Live Transcripts
    const [transcripts, setTranscripts] = useState([])
    const transcriptEndRef = useRef(null)

    // Pre-Interview Readiness State
    const [previewStream, setPreviewStream] = useState(null)
    const [cameraReady, setCameraReady] = useState(false)
    const [micReady, setMicReady] = useState(false)
    const [audioLevel, setAudioLevel] = useState(0)
    const [screenReady, setScreenReady] = useState(false)
    const [clipboardReady] = useState(true) // Monitored by default
    const [hardwareChecking, setHardwareChecking] = useState(false)
    const [hardwareError, setHardwareError] = useState('')

    // Refs
    const previewVideoRef = useRef(null)
    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const animFrameRef = useRef(null)

    const videoRef = useRef(null)
    const screenVideoRef = useRef(null)
    const agentAudioRef = useRef(null)
    const roomRef = useRef(null)
    const fullscreenEnteredRef = useRef(false)
    const violationCooldownRef = useRef(false)
    const terminatedRef = useRef(false)
    const mediaRecorderRef = useRef(null)
    const recordedChunksRef = useRef([])
    const connectingRef = useRef(false)

    // -------------------------------------------------------------
    // PRE-INTERVIEW HARDWARE INITIALIZATION & VERIFICATION GATE
    // -------------------------------------------------------------
    const startHardwareCheck = useCallback(async () => {
        setHardwareChecking(true)
        setHardwareError('')
        try {
            // Stop any previous test stream
            if (previewStream) {
                previewStream.getTracks().forEach((t) => t.stop())
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true,
            })

            setPreviewStream(stream)
            setCameraReady(true)

            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = stream
            }

            // Audio Visualizer Meter
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext
                const audioCtx = new AudioCtx()
                audioContextRef.current = audioCtx
                const analyser = audioCtx.createAnalyser()
                analyser.fftSize = 256
                analyserRef.current = analyser

                const source = audioCtx.createMediaStreamSource(stream)
                source.connect(analyser)

                const bufferLength = analyser.frequencyBinCount
                const dataArray = new Uint8Array(bufferLength)

                const updateLevel = () => {
                    if (!analyserRef.current) return
                    analyserRef.current.getByteFrequencyData(dataArray)
                    let sum = 0
                    for (let i = 0; i < bufferLength; i++) {
                        sum += dataArray[i]
                    }
                    const average = sum / bufferLength
                    const normalized = Math.min(Math.round((average / 128) * 100), 100)
                    setAudioLevel(normalized)
                    if (normalized > 3) {
                        setMicReady(true)
                    }
                    animFrameRef.current = requestAnimationFrame(updateLevel)
                }
                updateLevel()
            } catch (audioErr) {
                console.warn('Audio analyser error:', audioErr)
                setMicReady(true)
            }
        } catch (err) {
            console.error('Hardware access error:', err)
            setHardwareError(
                err.name === 'NotAllowedError'
                    ? 'Camera or Microphone permission was denied. Please allow device access in your browser settings.'
                    : 'Unable to access camera or microphone. Please ensure your devices are connected.'
            )
            setCameraReady(false)
            setMicReady(false)
        } finally {
            setHardwareChecking(false)
        }
    }, [previewStream])

    // Mount hardware probe on pre-check screen
    useEffect(() => {
        if (!started) {
            startHardwareCheck()
        }
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => {})
            }
        }
    }, [started, startHardwareCheck])

    // Bind preview stream whenever video element mounts
    useEffect(() => {
        if (!started && previewVideoRef.current && previewStream) {
            previewVideoRef.current.srcObject = previewStream
        }
    }, [started, previewStream])

    // Test Screen Share in Pre-Check
    const testScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
            setScreenReady(true)
            screenStream.getVideoTracks()[0].onended = () => {
                setScreenReady(false)
            }
        } catch (err) {
            console.warn('Screen share test was declined:', err.message)
        }
    }

    // Auto-scroll transcript feed
    useEffect(() => {
        if (activeTab === 'transcript') {
            transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [transcripts, activeTab])

    // -------------------------------------------------------------
    // PROCTORING & RECORDING CAPABILITIES
    // -------------------------------------------------------------
    const startRecording = (stream) => {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
            ? 'video/webm;codecs=vp8,opus'
            : 'video/webm'
        try {
            const recorder = new MediaRecorder(stream, { mimeType })
            recordedChunksRef.current = []
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunksRef.current.push(e.data)
            }
            recorder.start(1000)
            mediaRecorderRef.current = recorder
        } catch (err) {
            console.error('Recording could not start:', err.message)
        }
    }

    const stopAndUploadRecording = async () => {
        const recorder = mediaRecorderRef.current
        if (!recorder || recorder.state === 'inactive') return
        await new Promise((resolve) => {
            recorder.onstop = resolve
            recorder.stop()
        })
        if (recordedChunksRef.current.length === 0) return
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        await uploadInterviewRecording(driveId, roundNumber, blob).catch((err) =>
            console.error('Recording upload failed:', err.message)
        )
    }

    const captureFrame = (video) => {
        try {
            if (!video || video.videoWidth === 0) return null
            const canvas = document.createElement('canvas')
            canvas.width = 320
            canvas.height = (video.videoHeight / video.videoWidth) * 320
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
            return canvas.toDataURL('image/jpeg', 0.5)
        } catch {
            return null
        }
    }

    const registerViolation = useCallback(
        (reason) => {
            if (violationCooldownRef.current || terminatedRef.current) return
            violationCooldownRef.current = true
            setTimeout(() => {
                violationCooldownRef.current = false
            }, 1500)

            const snapshot = captureFrame(videoRef.current)
            const screenSnapshot = captureFrame(screenVideoRef.current)
            reportInterviewViolation(driveId, roundNumber, reason, snapshot, screenSnapshot).catch(() => {})

            setViolationCount((prev) => {
                const next = prev + 1
                if (next >= MAX_VIOLATIONS) {
                    terminatedRef.current = true
                    setViolationMessage(`${reason}. That was your final warning - ending the interview now.`)
                    setTerminated(true)
                } else {
                    setViolationMessage(`Warning ${next}/${MAX_VIOLATIONS}: ${reason}. One more and the interview will end automatically.`)
                }
                return next
            })
        },
        [driveId, roundNumber]
    )

    // -------------------------------------------------------------
    // LIVEKIT CONNECTION & REAL-TIME TRANSCRIPT LISTENER
    // -------------------------------------------------------------
    const connectToAgent = async () => {
        if (connectingRef.current) return
        connectingRef.current = true
        setConnectState('connecting')
        setConnectError('')
        try {
            const session = await startAgentInterview(driveId, roundNumber)
            setQuestions(session.questions || [])
            const room = new Room()
            roomRef.current = room

            // Audio track subscription from AI interviewer
            room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
                if (participant.identity.startsWith('candidate-')) return
                if (track.kind === Track.Kind.Audio && agentAudioRef.current) {
                    track.attach(agentAudioRef.current)
                }
            })

            room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
                setAgentSpeaking(speakers.some((p) => !p.identity.startsWith('candidate-')))
            })

            room.on(RoomEvent.ParticipantConnected, () => setConnectState('connected'))

            room.on(RoomEvent.Disconnected, () => {
                if (!terminatedRef.current) setConnectError('Connection to the interview room was lost.')
            })

            // Real-Time Transcript Receiver over Data Channel
            room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
                if (topic === 'transcript') {
                    try {
                        const decoded = new TextDecoder().decode(payload)
                        const data = JSON.parse(decoded)
                        if (data.text) {
                            setTranscripts((prev) => {
                                // Avoid duplicate consecutive identical messages
                                const last = prev[prev.length - 1]
                                if (last && last.text === data.text && last.sender === data.sender) {
                                    return prev
                                }
                                return [
                                    ...prev,
                                    {
                                        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                        sender: data.sender || 'agent',
                                        text: data.text,
                                        time: data.timestamp
                                            ? new Date(data.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    },
                                ]
                            })
                        }
                    } catch (err) {
                        console.error('Failed to parse incoming transcript packet:', err)
                    }
                }
            })

            await room.connect(session.url, session.token)
            await room.localParticipant.setCameraEnabled(true)
            await room.localParticipant.setMicrophoneEnabled(true)

            const camPub = [...room.localParticipant.videoTrackPublications.values()][0]
            if (camPub?.track && videoRef.current) {
                camPub.track.attach(videoRef.current)
                if (videoRef.current.srcObject) startRecording(videoRef.current.srcObject)
            }

            // Automatically attempt Screen Share
            try {
                await room.localParticipant.setScreenShareEnabled(true)
                const screenPub = [...room.localParticipant.videoTrackPublications.values()].find(
                    (p) => p.source === Track.Source.ScreenShare
                )
                if (screenPub?.track && screenVideoRef.current) {
                    screenPub.track.attach(screenVideoRef.current)
                    setScreenShareOn(true)
                    screenPub.track.mediaStreamTrack.addEventListener('ended', () => setScreenShareOn(false))
                }
            } catch (err) {
                console.warn('LiveKit screen share could not be enabled immediately:', err.message)
            }

            setConnectState(room.remoteParticipants.size > 0 ? 'connected' : 'agent-joining')
        } catch (err) {
            setConnectState('failed')
            setConnectError(err.message || 'Could not connect to the interview agent. Is the agent service running?')
            connectingRef.current = false
        }
    }

    // Enter Fullscreen & Start Session
    const enterFullscreenAndStart = async () => {
        // Clean up preview hardware tracks
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {})
        }
        if (previewStream) {
            previewStream.getTracks().forEach((t) => t.stop())
            setPreviewStream(null)
        }

        try {
            if (document.documentElement.requestFullscreen) {
                await Promise.race([
                    document.documentElement.requestFullscreen(),
                    new Promise((resolve) => setTimeout(resolve, 1200)),
                ])
            }
        } catch {
            // Sandboxed fallback
        }

        setStarted(true)
        await connectToAgent()
    }

    // Toggle controls
    const toggleMic = async () => {
        const next = !micOn
        await roomRef.current?.localParticipant.setMicrophoneEnabled(next)
        setMicOn(next)
    }

    const toggleCamera = async () => {
        const next = !cameraOn
        await roomRef.current?.localParticipant.setCameraEnabled(next)
        setCameraOn(next)
    }

    const requestScreenShare = async () => {
        try {
            await roomRef.current?.localParticipant.setScreenShareEnabled(true)
            const screenPub = [...roomRef.current.localParticipant.videoTrackPublications.values()].find(
                (p) => p.source === Track.Source.ScreenShare
            )
            if (screenPub?.track && screenVideoRef.current) {
                screenPub.track.attach(screenVideoRef.current)
                setScreenShareOn(true)
                screenPub.track.mediaStreamTrack.addEventListener('ended', () => setScreenShareOn(false))
            }
        } catch (err) {
            console.error('Screen share was not granted:', err.message)
        }
    }

    const finishInterview = async () => {
        setSubmitting(true)
        try {
            await stopAndUploadRecording()
            await completeAgentInterview(driveId, roundNumber).catch(() => null)
            await completeInterview(driveId, roundNumber)
        } finally {
            roomRef.current?.disconnect()
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
            navigate('/candidate/room')
        }
    }

    // -------------------------------------------------------------
    // PROCTORING EVENT LISTENERS (FULLSCREEN, TAB SWITCH, CLIPBOARD)
    // -------------------------------------------------------------
    useEffect(() => {
        if (!started) return
        const handleVisibility = () => {
            if (document.hidden) registerViolation('You switched away from this tab')
        }
        const handleBlur = () => {
            if (!document.hidden) registerViolation('You switched to another window')
        }
        const handleFullscreenChange = () => {
            if (document.fullscreenElement) {
                fullscreenEnteredRef.current = true
                return
            }
            if (fullscreenEnteredRef.current) registerViolation('You exited fullscreen mode')
        }
        const handlePaste = () => {
            registerViolation('Clipboard paste detected. External text insertion is prohibited.')
        }

        document.addEventListener('visibilitychange', handleVisibility)
        window.addEventListener('blur', handleBlur)
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        window.addEventListener('paste', handlePaste)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility)
            window.removeEventListener('blur', handleBlur)
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            window.removeEventListener('paste', handlePaste)
        }
    }, [started, registerViolation])

    useEffect(() => {
        if (!violationMessage || terminated) return
        const t = setTimeout(() => setViolationMessage(''), 4000)
        return () => clearTimeout(t)
    }, [violationMessage, terminated])

    useEffect(() => {
        if (!terminated) return
        const t = setTimeout(() => finishInterview(), 2500)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminated])

    useEffect(() => () => roomRef.current?.disconnect(), [])

    // Clock
    useEffect(() => {
        if (connectState !== 'connected') return
        const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
        return () => clearInterval(interval)
    }, [connectState])

    const currentQuestionIndex = useMemo(() => {
        if (questions.length === 0) return 0
        const estimatedTotalSeconds = 25 * 60
        const pace = Math.min(elapsedSeconds / estimatedTotalSeconds, 0.98)
        return Math.min(Math.floor(pace * questions.length), questions.length - 1)
    }, [elapsedSeconds, questions.length])

    const currentQuestion = questions[currentQuestionIndex]
    const latestTranscript = transcripts[transcripts.length - 1]

    // Readiness summary score
    const readinessScore = useMemo(() => {
        let score = 0
        if (cameraReady) score++
        if (micReady) score++
        if (screenReady) score++
        if (clipboardReady) score++
        return score
    }, [cameraReady, micReady, screenReady, clipboardReady])

    // =============================================================
    // VIEW 1: PRE-INTERVIEW READINESS & PROCTORING PERMISSIONS GATE
    // =============================================================
    if (!started) {
        return (
            <div className='min-h-screen bg-bg text-ink flex flex-col'>
                {/* Header */}
                <header className='border-b border-line bg-card px-6 py-4 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <img src={logo} alt='Workmate.IQ' className='w-9 h-9 rounded-xl shadow-xs' />
                        <div>
                            <div className='flex items-center gap-2'>
                                <h1 className='font-display text-[16px] font-bold text-ink leading-none'>Workmate.IQ</h1>
                                <span className='text-[11px] font-semibold uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded-full'>
                                    Stage 1 of 2
                                </span>
                            </div>
                            <p className='text-[12px] text-text-secondary mt-0.5'>Hardware, Screen & Security Clearance</p>
                        </div>
                    </div>

                    <div className='flex items-center gap-3'>
                        <div className='flex items-center gap-2 bg-neutral-soft px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold text-text-secondary'>
                            <ShieldCheck size={14} className={readinessScore >= 3 ? 'text-success' : 'text-amber-500'} />
                            <span>Readiness: <strong className='text-ink'>{readinessScore}/4 Checks</strong></span>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className='flex-1 max-w-6xl mx-auto w-full p-6 sm:p-8 flex flex-col justify-center'>
                    <div className='mb-6'>
                        <h2 className='text-2xl font-bold font-display text-ink tracking-tight'>
                            System & Device Readiness Check
                        </h2>
                        <p className='text-[13.5px] text-text-secondary mt-1 max-w-2xl'>
                            To guarantee a high-integrity, fair evaluation, our AI interviewer requires active camera, microphone, screen sharing, and proctoring verification before the interview can start.
                        </p>
                    </div>

                    {hardwareError && (
                        <div className='mb-6 p-4 rounded-xl bg-danger-soft border border-danger/20 text-danger text-[13.5px] flex items-start gap-3'>
                            <AlertCircle size={18} className='shrink-0 mt-0.5' />
                            <div className='flex-1'>
                                <p className='font-semibold'>Hardware Access Notice</p>
                                <p className='mt-0.5 text-[13px] opacity-90'>{hardwareError}</p>
                            </div>
                            <button
                                onClick={startHardwareCheck}
                                className='inline-flex items-center gap-1 text-[12px] font-semibold underline shrink-0 hover:opacity-80'
                            >
                                <RefreshCw size={12} /> Retry Permissions
                            </button>
                        </div>
                    )}

                    <div className='grid lg:grid-cols-12 gap-6'>
                        {/* Left: Live Camera & Mic Audio Meter */}
                        <div className='lg:col-span-6 flex flex-col gap-4'>
                            <Card className='p-0 overflow-hidden flex flex-col bg-black/95 border-black/10 text-white relative shadow-soft rounded-2xl'>
                                <div className='relative aspect-video w-full bg-zinc-900 flex items-center justify-center overflow-hidden'>
                                    <video
                                        ref={previewVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className={`w-full h-full object-cover transition-opacity duration-300 ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
                                    />

                                    {!cameraReady && (
                                        <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-zinc-900'>
                                            <div className='w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white/50'>
                                                <VideoOff size={24} />
                                            </div>
                                            <div>
                                                <p className='text-[14px] font-medium text-white'>Camera Stream Offline</p>
                                                <p className='text-[12px] text-zinc-400 mt-0.5'>
                                                    {hardwareChecking ? 'Requesting video stream...' : 'Click below to allow camera access'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={startHardwareCheck}
                                                disabled={hardwareChecking}
                                                className='mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors'
                                            >
                                                <RefreshCw size={12} className={hardwareChecking ? 'animate-spin' : ''} />
                                                {hardwareChecking ? 'Checking...' : 'Enable Camera'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Video Status Badge */}
                                    <div className='absolute top-3 left-3 flex items-center gap-2'>
                                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md ${cameraReady ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${cameraReady ? 'bg-white animate-pulse' : 'bg-white'}`} />
                                            {cameraReady ? 'Camera Live' : 'Camera Disconnected'}
                                        </span>
                                    </div>
                                </div>

                                {/* Audio Meter Bar */}
                                <div className='p-4 bg-zinc-900/90 border-t border-white/10 flex flex-col gap-2'>
                                    <div className='flex items-center justify-between text-[12px]'>
                                        <span className='flex items-center gap-1.5 text-zinc-300 font-medium'>
                                            <Volume2 size={14} className={micReady ? 'text-emerald-400' : 'text-zinc-500'} />
                                            Microphone Input Level
                                        </span>
                                        <span className={`text-[11.5px] font-semibold ${micReady ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                            {micReady ? (audioLevel > 3 ? 'Audio Detected' : 'Connected (Listening)') : 'No Audio Detected'}
                                        </span>
                                    </div>
                                    <div className='w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5'>
                                        <div
                                            className={`h-full rounded-full transition-all duration-75 ${audioLevel > 30 ? 'bg-emerald-400' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.max(audioLevel, micReady ? 6 : 0)}%` }}
                                        />
                                    </div>
                                    <p className='text-[11px] text-zinc-400'>
                                        Say a few test words to verify that your voice registers on the meter above.
                                    </p>
                                </div>
                            </Card>

                            {/* Pro-Tips Box */}
                            <div className='p-4 rounded-xl bg-card border border-line flex items-start gap-3'>
                                <Lightbulb size={18} className='text-amber-500 shrink-0 mt-0.5' />
                                <div className='text-[12.5px] text-text-secondary leading-relaxed'>
                                    <p className='font-semibold text-ink'>Interview Environment Recommendations:</p>
                                    <ul className='mt-1 space-y-0.5 list-disc list-inside'>
                                        <li>Sit in a quiet, well-lit room facing your camera.</li>
                                        <li>Use headphones or earphones to prevent acoustic echo.</li>
                                        <li>Keep other tabs and background chat software closed.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Right: Security & Proctoring Checklist */}
                        <div className='lg:col-span-6 flex flex-col justify-between gap-4'>
                            <Card className='p-5 space-y-4'>
                                <h3 className='text-[14px] font-bold text-ink flex items-center gap-2'>
                                    <ShieldCheck size={16} className='text-accent' />
                                    Readiness & Permission Checklist
                                </h3>

                                <div className='space-y-3'>
                                    {/* 1. Camera */}
                                    <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${cameraReady ? 'bg-success-soft/50 border-success/30' : 'bg-card border-line'}`}>
                                        <div className='flex items-center gap-3'>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cameraReady ? 'bg-success/15 text-success' : 'bg-neutral-soft text-text-secondary'}`}>
                                                <Video size={16} />
                                            </div>
                                            <div>
                                                <p className='text-[13px] font-semibold text-ink leading-snug'>Camera & Facial Tracking</p>
                                                <p className='text-[11.5px] text-text-secondary'>Visual feed required for identity and proctoring</p>
                                            </div>
                                        </div>
                                        {cameraReady ? (
                                            <span className='inline-flex items-center gap-1 text-[11.5px] font-bold text-success'>
                                                <Check size={14} /> Ready
                                            </span>
                                        ) : (
                                            <button
                                                onClick={startHardwareCheck}
                                                className='text-[11.5px] font-semibold text-accent hover:underline'
                                            >
                                                Allow
                                            </button>
                                        )}
                                    </div>

                                    {/* 2. Microphone */}
                                    <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${micReady ? 'bg-success-soft/50 border-success/30' : 'bg-card border-line'}`}>
                                        <div className='flex items-center gap-3'>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${micReady ? 'bg-success/15 text-success' : 'bg-neutral-soft text-text-secondary'}`}>
                                                <Mic size={16} />
                                            </div>
                                            <div>
                                                <p className='text-[13px] font-semibold text-ink leading-snug'>Microphone & Voice Input</p>
                                                <p className='text-[11.5px] text-text-secondary'>Conversational voice channel for AI questions</p>
                                            </div>
                                        </div>
                                        {micReady ? (
                                            <span className='inline-flex items-center gap-1 text-[11.5px] font-bold text-success'>
                                                <Check size={14} /> Ready
                                            </span>
                                        ) : (
                                            <span className='text-[11.5px] font-medium text-amber-600'>Testing sound...</span>
                                        )}
                                    </div>

                                    {/* 3. Screen Sharing */}
                                    <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${screenReady ? 'bg-success-soft/50 border-success/30' : 'bg-card border-line'}`}>
                                        <div className='flex items-center gap-3'>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${screenReady ? 'bg-success/15 text-success' : 'bg-neutral-soft text-text-secondary'}`}>
                                                <ScreenShare size={16} />
                                            </div>
                                            <div>
                                                <p className='text-[13px] font-semibold text-ink leading-snug'>Screen Sharing Permission</p>
                                                <p className='text-[11.5px] text-text-secondary'>Choose "Entire Screen" when prompted</p>
                                            </div>
                                        </div>
                                        {screenReady ? (
                                            <span className='inline-flex items-center gap-1 text-[11.5px] font-bold text-success'>
                                                <Check size={14} /> Verified
                                            </span>
                                        ) : (
                                            <button
                                                onClick={testScreenShare}
                                                className='text-[11.5px] font-semibold bg-black/[0.05] hover:bg-black/[0.08] text-ink px-2.5 py-1 rounded-md transition-colors'
                                            >
                                                Test Share
                                            </button>
                                        )}
                                    </div>

                                    {/* 4. Anti-Cheat & Clipboard */}
                                    <div className={`p-3.5 rounded-xl border flex items-center justify-between bg-success-soft/50 border-success/30`}>
                                        <div className='flex items-center gap-3'>
                                            <div className='w-8 h-8 rounded-lg bg-success/15 text-success flex items-center justify-center'>
                                                <Copy size={16} />
                                            </div>
                                            <div>
                                                <p className='text-[13px] font-semibold text-ink leading-snug'>Clipboard & Anti-Cheat Monitor</p>
                                                <p className='text-[11.5px] text-text-secondary'>Pasting external AI or notes is strictly flagged</p>
                                            </div>
                                        </div>
                                        <span className='inline-flex items-center gap-1 text-[11.5px] font-bold text-success'>
                                            <Check size={14} /> Active
                                        </span>
                                    </div>

                                    {/* 5. Fullscreen Mode */}
                                    <div className='p-3.5 rounded-xl border border-line bg-card flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <div className='w-8 h-8 rounded-lg bg-neutral-soft text-text-secondary flex items-center justify-center'>
                                                <Maximize size={16} />
                                            </div>
                                            <div>
                                                <p className='text-[13px] font-semibold text-ink leading-snug'>Fullscreen Locking</p>
                                                <p className='text-[11.5px] text-text-secondary'>Enforced upon interview start ({MAX_VIOLATIONS} max warnings)</p>
                                            </div>
                                        </div>
                                        <span className='text-[11.5px] font-medium text-text-secondary'>Auto-engaged</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Start CTA Button */}
                            <div className='space-y-2'>
                                <button
                                    onClick={enterFullscreenAndStart}
                                    disabled={!cameraReady || !micReady}
                                    className={`w-full py-4 rounded-xl font-bold text-[14.5px] flex items-center justify-center gap-2 transition-all shadow-md ${
                                        cameraReady && micReady
                                            ? 'bg-accent hover:bg-accent-dark text-white shadow-accent/25 hover:shadow-lg'
                                            : 'bg-neutral-soft text-text-secondary cursor-not-allowed border border-line'
                                    }`}
                                >
                                    <Maximize size={16} />
                                    Enter Fullscreen & Begin Live Interview
                                    <ArrowRight size={15} />
                                </button>
                                <p className='text-center text-[11.5px] text-text-secondary'>
                                    By clicking Begin, you agree to audio/video recording and integrity monitoring.
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    // =============================================================
    // VIEW 2: ACTIVE LIVE INTERVIEW ROOM WITH REAL-TIME TRANSCRIPTS
    // =============================================================
    return (
        <div className='min-h-screen bg-bg flex flex-col select-none'>
            {/* Audio playback from LiveKit agent */}
            <audio ref={agentAudioRef} autoPlay />
            {/* Hidden video element capturing screen-share frames for proctoring violation snapshots */}
            <video
                ref={screenVideoRef}
                autoPlay
                muted
                playsInline
                className='fixed w-px h-px opacity-0 pointer-events-none -z-10'
            />

            {/* Violation Alert Banner */}
            {violationMessage && (
                <div className='fixed top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[13.5px] font-semibold px-6 py-3 rounded-2xl flex items-center gap-2.5 max-w-lg text-center shadow-lift z-50 animate-bounce'>
                    <AlertTriangle size={18} className='shrink-0' />
                    <span>{violationMessage}</span>
                </div>
            )}

            {/* Top Bar */}
            <header className='flex items-center justify-between border-b border-line bg-card px-6 py-3 shrink-0'>
                <div className='flex items-center gap-3'>
                    <img src={logo} alt='Workmate.IQ' className='w-8 h-8 rounded-lg' />
                    <div>
                        <p className='font-display text-[15px] font-bold text-ink leading-tight'>AI Interview Session</p>
                        <p className='text-[11.5px] text-text-secondary'>Live Proctoring & Speech AI</p>
                    </div>
                </div>

                <div className='flex items-center gap-3'>
                    <span className='inline-flex items-center gap-1.5 text-[12px] font-semibold text-success bg-success-soft px-3 py-1.5 rounded-full'>
                        <span className='w-2 h-2 rounded-full bg-success animate-pulse' /> Live
                    </span>
                    <span className='inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink bg-neutral-soft px-3 py-1.5 rounded-full'>
                        <Clock size={13} /> {formatElapsed(elapsedSeconds)}
                    </span>
                    <button
                        onClick={finishInterview}
                        disabled={submitting}
                        className='inline-flex items-center gap-1.5 border border-red-200 text-red-600 font-semibold text-[12px] rounded-lg px-3.5 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50'
                    >
                        <LogOut size={13} /> {submitting ? 'Submitting...' : 'Finish Interview'}
                    </button>
                </div>
            </header>

            {/* Main Stage */}
            <div className='flex-1 grid lg:grid-cols-[1.6fr_1fr] gap-4 p-4 min-h-0'>
                {/* Left: AI Interviewer Video Box & Candidate Video */}
                <div className='flex flex-col gap-4 min-h-0'>
                    {/* AI Interviewer Avatar Box */}
                    <div className='relative flex-1 min-h-[300px] bg-ink rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 shadow-soft'>
                        {/* Top Badges */}
                        <div className='absolute top-3.5 left-4 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-[11.5px] font-medium px-3 py-1 rounded-full'>
                            <Sparkles size={12} className='text-amber-400' /> AI Senior Interviewer
                        </div>

                        {/* Speaking / Listening Pill */}
                        <div className='absolute top-3.5 right-4 flex items-center gap-2'>
                            <button
                                onClick={() => setShowCaptions((c) => !c)}
                                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-md transition-colors ${
                                    showCaptions ? 'bg-white/20 text-white' : 'bg-black/40 text-white/50'
                                }`}
                                title='Toggle Live Subtitles'
                            >
                                <Subtitles size={12} /> CC {showCaptions ? 'On' : 'Off'}
                            </button>
                            {agentSpeaking ? (
                                <div className='inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[11.5px] font-medium px-2.5 py-1 rounded-full shadow-sm'>
                                    <span className='w-1.5 h-1.5 rounded-full bg-white animate-pulse' /> Speaking
                                </div>
                            ) : (
                                <div className='inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-[11.5px] font-medium px-2.5 py-1 rounded-full'>
                                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-400' /> Listening
                                </div>
                            )}
                        </div>

                        {/* Center Bot Graphic */}
                        <div className='flex flex-col items-center gap-3 text-white/80'>
                            <div
                                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    agentSpeaking
                                        ? 'bg-accent/20 border-2 border-accent text-accent scale-105 shadow-[0_0_30px_rgba(196,22,31,0.3)]'
                                        : 'bg-white/10 text-white/70'
                                }`}
                            >
                                <Bot size={50} />
                            </div>

                            {(connectState === 'connecting' || connectState === 'agent-joining') && (
                                <span className='inline-flex items-center gap-2 text-[13px] text-zinc-300 font-medium'>
                                    <Loader2 size={15} className='animate-spin text-accent' />
                                    {connectState === 'connecting' ? 'Establishing secure voice line...' : 'Waiting for AI interviewer to connect...'}
                                </span>
                            )}
                            {connectState === 'connected' && (
                                <span className='text-[13px] text-zinc-400'>
                                    {agentSpeaking ? 'AI Interviewer is speaking...' : 'Your turn to speak — listening to your response'}
                                </span>
                            )}
                        </div>

                        {/* Floating Closed Caption Subtitles Banner */}
                        {showCaptions && latestTranscript && (
                            <div className='absolute bottom-4 left-4 right-4 bg-black/85 backdrop-blur-md text-white text-[13px] px-4 py-2.5 rounded-xl border border-white/10 shadow-lg flex items-start gap-2.5 transition-all'>
                                <span
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 mt-0.5 ${
                                        latestTranscript.sender === 'agent' ? 'bg-accent text-white' : 'bg-emerald-600 text-white'
                                    }`}
                                >
                                    {latestTranscript.sender === 'agent' ? 'AI' : 'You'}
                                </span>
                                <p className='flex-1 leading-snug line-clamp-2 text-white/95 font-medium'>
                                    {latestTranscript.text}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Candidate Preview & Controls Bar */}
                    <div className='grid grid-cols-[1.5fr_1fr] gap-4 h-[210px] shrink-0'>
                        {/* Candidate Video */}
                        <div className='relative bg-black rounded-2xl overflow-hidden shadow-soft'>
                            <video ref={videoRef} autoPlay muted playsInline className='w-full h-full object-cover' />
                            <div className='absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 bg-black/70 backdrop-blur-xs text-white text-[10.5px] font-medium px-2.5 py-1 rounded-full'>
                                <User size={11} /> You (Candidate)
                            </div>
                        </div>

                        {/* Integrity Card & Device Toggles */}
                        <Card className='p-4 flex flex-col justify-between shadow-soft'>
                            <div>
                                <div className='flex items-center gap-2 mb-2'>
                                    <ShieldAlert size={15} className='text-accent' />
                                    <span className='text-[12.5px] font-semibold text-ink'>Integrity Warnings</span>
                                    <span
                                        className={`ml-auto text-[12px] font-bold px-2 py-0.5 rounded-full ${
                                            violationCount === 0
                                                ? 'bg-success-soft text-success'
                                                : violationCount >= 2
                                                ? 'bg-danger-soft text-danger'
                                                : 'bg-warning-soft text-warning'
                                        }`}
                                    >
                                        {violationCount}/{MAX_VIOLATIONS}
                                    </span>
                                </div>

                                {screenShareOn ? (
                                    <span className='inline-flex items-center gap-1.5 text-[11.5px] font-medium text-success mb-2'>
                                        <ScreenShare size={13} /> Screen sharing active
                                    </span>
                                ) : (
                                    <button
                                        onClick={requestScreenShare}
                                        className='inline-flex items-center gap-1.5 text-[11.5px] font-medium text-danger hover:underline mb-2'
                                    >
                                        <ScreenShareOff size={13} /> Screen share required - click to share
                                    </button>
                                )}
                            </div>

                            <div className='flex items-center gap-2 pt-2 border-t border-line'>
                                <button
                                    onClick={toggleMic}
                                    className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-xl py-2.5 transition-colors ${
                                        micOn ? 'bg-neutral-soft text-ink hover:bg-neutral-soft/80' : 'bg-red-50 text-red-600'
                                    }`}
                                >
                                    {micOn ? <Mic size={14} /> : <MicOff size={14} />} {micOn ? 'Mute' : 'Muted'}
                                </button>
                                <button
                                    onClick={toggleCamera}
                                    className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-xl py-2.5 transition-colors ${
                                        cameraOn ? 'bg-neutral-soft text-ink hover:bg-neutral-soft/80' : 'bg-red-50 text-red-600'
                                    }`}
                                >
                                    {cameraOn ? <Video size={14} /> : <VideoOff size={14} />} {cameraOn ? 'Camera' : 'Off'}
                                </button>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Right: Tabbed Panel (Question | Live Transcript | Notes) */}
                <Card className='flex flex-col min-h-0 p-0 overflow-hidden shadow-soft'>
                    {/* Tab Navigation */}
                    <div className='flex border-b border-line shrink-0 bg-neutral-soft/40'>
                        <button
                            onClick={() => setActiveTab('question')}
                            className={`flex-1 text-[13px] font-bold py-3 transition-colors flex items-center justify-center gap-1.5 ${
                                activeTab === 'question' ? 'text-accent border-b-2 border-accent bg-card' : 'text-text-secondary hover:text-ink'
                            }`}
                        >
                            <Lightbulb size={14} /> Question
                        </button>
                        <button
                            onClick={() => setActiveTab('transcript')}
                            className={`flex-1 text-[13px] font-bold py-3 transition-colors flex items-center justify-center gap-1.5 ${
                                activeTab === 'transcript' ? 'text-accent border-b-2 border-accent bg-card' : 'text-text-secondary hover:text-ink'
                            }`}
                        >
                            <MessageSquare size={14} /> Live Transcript
                            {transcripts.length > 0 && (
                                <span className='text-[10px] bg-accent/10 text-accent font-bold px-1.5 py-0.2 rounded-full'>
                                    {transcripts.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`flex-1 text-[13px] font-bold py-3 transition-colors flex items-center justify-center gap-1.5 ${
                                activeTab === 'notes' ? 'text-accent border-b-2 border-accent bg-card' : 'text-text-secondary hover:text-ink'
                            }`}
                        >
                            <Copy size={14} /> Scratchpad
                        </button>
                    </div>

                    {/* Tab 1: Question Context */}
                    <div className='flex-1 overflow-y-auto p-5'>
                        {activeTab === 'question' && (
                            <>
                                {connectError && connectState === 'failed' ? (
                                    <div className='p-4 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-600 flex items-center gap-2 mb-4'>
                                        <AlertTriangle size={15} className='shrink-0' /> {connectError}
                                        <button onClick={connectToAgent} className='ml-auto font-semibold underline shrink-0'>
                                            Retry
                                        </button>
                                    </div>
                                ) : null}

                                {currentQuestion ? (
                                    <>
                                        <div className='flex items-center justify-between mb-2'>
                                            <span className='text-[11px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2.5 py-0.5 rounded-full'>
                                                Question {currentQuestionIndex + 1} of {questions.length}
                                            </span>
                                            {currentQuestion.difficulty && (
                                                <span className='text-[11px] font-medium text-text-secondary capitalize'>
                                                    {currentQuestion.difficulty} Level
                                                </span>
                                            )}
                                        </div>

                                        <h2 className='text-[16.5px] font-bold text-ink leading-snug mb-4'>
                                            {currentQuestion.question_text}
                                        </h2>

                                        {currentQuestion.expected_topics?.length > 0 && (
                                            <div className='p-3.5 rounded-xl bg-neutral-soft mb-4'>
                                                <p className='flex items-center gap-1.5 text-[12px] font-semibold text-ink mb-2'>
                                                    <Lightbulb size={13} className='text-amber-500' /> Competencies & Key Points to Cover:
                                                </p>
                                                <ul className='space-y-1.5'>
                                                    {currentQuestion.expected_topics.map((topic) => (
                                                        <li key={topic} className='text-[12.5px] text-text-secondary flex items-start gap-1.5'>
                                                            <span className='text-accent font-bold'>&bull;</span>
                                                            <span>{topic}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <p className='text-[12.5px] text-text-secondary leading-relaxed bg-black/[0.02] p-3 rounded-xl border border-line'>
                                            Answer out loud naturally. The AI interviewer listens to your explanation in real time and will ask contextual follow-ups.
                                        </p>
                                    </>
                                ) : (
                                    <div className='py-8 text-center text-text-secondary'>
                                        <Sparkles size={24} className='mx-auto mb-2 text-accent opacity-60' />
                                        <p className='text-[13.5px] font-medium'>Preparing next question...</p>
                                        <p className='text-[12px] mt-1'>The AI interviewer is introducing the topic now.</p>
                                    </div>
                                )}

                                {/* Progress Checklist */}
                                {questions.length > 0 && (
                                    <div className='mt-6 pt-5 border-t border-line'>
                                        <p className='text-[11.5px] font-bold text-text-secondary uppercase tracking-wider mb-3'>
                                            Interview Progress
                                        </p>
                                        <div className='space-y-2'>
                                            {questions.map((q, idx) => (
                                                <div
                                                    key={q.id || idx}
                                                    className={`flex items-start gap-2.5 p-3 rounded-xl text-[12.5px] transition-colors ${
                                                        idx === currentQuestionIndex
                                                            ? 'bg-accent/8 border border-accent/20 text-ink font-semibold'
                                                            : 'text-text-secondary bg-black/[0.01]'
                                                    }`}
                                                >
                                                    {idx < currentQuestionIndex ? (
                                                        <CheckCircle2 size={15} className='text-success shrink-0 mt-0.5' />
                                                    ) : idx === currentQuestionIndex ? (
                                                        <Circle size={15} className='text-accent fill-accent/20 shrink-0 mt-0.5' />
                                                    ) : (
                                                        <Circle size={15} className='text-neutral/40 shrink-0 mt-0.5' />
                                                    )}
                                                    <span className='leading-snug'>
                                                        {idx <= currentQuestionIndex
                                                            ? q.question_text
                                                            : `Question ${idx + 1} (Revealed when reached)`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Tab 2: Live Transcripts */}
                        {activeTab === 'transcript' && (
                            <div className='flex flex-col h-full'>
                                <div className='flex items-center justify-between pb-3 mb-3 border-b border-line'>
                                    <p className='text-[12px] font-bold text-text-secondary uppercase tracking-wider'>
                                        Real-Time Dialogue Feed
                                    </p>
                                    <span className='text-[11px] text-text-secondary bg-neutral-soft px-2 py-0.5 rounded-full'>
                                        Auto-synchronized
                                    </span>
                                </div>

                                {transcripts.length === 0 ? (
                                    <div className='py-12 text-center text-text-secondary my-auto'>
                                        <MessageSquare size={28} className='mx-auto mb-2 text-text-secondary/40' />
                                        <p className='text-[13.5px] font-medium text-ink'>No speech recorded yet</p>
                                        <p className='text-[12px] mt-1 max-w-xs mx-auto'>
                                            As you and the AI interviewer speak, live transcribed dialogue will stream into this feed.
                                        </p>
                                    </div>
                                ) : (
                                    <div className='space-y-3.5'>
                                        {transcripts.map((t) => (
                                            <div
                                                key={t.id}
                                                className={`flex flex-col gap-1 ${t.sender === 'agent' ? 'items-start' : 'items-end'}`}
                                            >
                                                <div className='flex items-center gap-1.5 text-[11px] text-text-secondary px-1'>
                                                    {t.sender === 'agent' ? (
                                                        <>
                                                            <Bot size={12} className='text-accent' />
                                                            <span className='font-bold text-accent'>AI Interviewer</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <User size={12} className='text-emerald-600' />
                                                            <span className='font-bold text-emerald-600'>You</span>
                                                        </>
                                                    )}
                                                    <span>&bull;</span>
                                                    <span>{t.time}</span>
                                                </div>
                                                <div
                                                    className={`max-w-[90%] p-3 rounded-2xl text-[13px] leading-relaxed shadow-2xs ${
                                                        t.sender === 'agent'
                                                            ? 'bg-neutral-soft text-ink rounded-tl-sm border border-line'
                                                            : 'bg-accent text-white rounded-tr-sm'
                                                    }`}
                                                >
                                                    {t.text}
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={transcriptEndRef} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab 3: Notes / Scratchpad */}
                        {activeTab === 'notes' && (
                            <div className='flex flex-col h-full'>
                                <p className='text-[12px] text-text-secondary mb-3'>
                                    Private scratchpad for jotting down calculations, structure, or key points before speaking. This is not submitted or scored.
                                </p>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder='Type your personal thoughts, code outlines, or notes here...'
                                    className='w-full flex-1 min-h-[300px] resize-none bg-card border border-line rounded-xl p-3.5 text-[13px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 leading-relaxed font-mono'
                                />
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}

export default InterviewRoomPage
