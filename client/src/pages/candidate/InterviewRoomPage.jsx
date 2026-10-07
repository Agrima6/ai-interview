import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import AravTile from '../../components/candidate/AravTile'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { useParams, useNavigate } from 'react-router-dom'
import { Room, RoomEvent, Track } from 'livekit-client'
import {
    Maximize, AlertTriangle, ShieldAlert, Bot, Loader2, Mic, MicOff, Video, VideoOff,
    LogOut, Clock, Sparkles, Lightbulb, CheckCircle2, Circle, ScreenShare, ScreenShareOff,
    MessageSquare, Subtitles, Volume2, ShieldCheck, Copy, RefreshCw, User, Check,
    AlertCircle, ArrowRight, Send, MoreHorizontal, Wifi
} from 'lucide-react'
import { Card } from '../../components/ui'
import { reportInterviewViolation, completeInterview, startAgentInterview, completeAgentInterview, uploadInterviewRecording, getMyInterviews } from '../../api/organization/organizationApi'
import {
    STATUS, FULL_REQUIREMENTS, WRONG_SURFACE_COPY, normalizeRequirements, classifyMediaError, isTrackLive, verifyStream, readiness, describeMissing,
} from '../../utils/mediaPermissions'
import logo from '../../assets/logo.png'

const MAX_VIOLATIONS = 3
const IDLE_PERM = { status: STATUS.IDLE, message: '', recovery: '' }
// The scripted local demo interview (no real interviewer) exists for offline demos only: VITE_ALLOW_DEMO_INTERVIEW=true.
const ALLOW_DEMO_INTERVIEW = String(import.meta.env?.VITE_ALLOW_DEMO_INTERVIEW || '').toLowerCase() === 'true'

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
    // Non-fatal problems shown to the candidate instead of failing silently:
    const [audioBlocked, setAudioBlocked] = useState(false)   // the browser is blocking the interviewer's audio
    const [deviceWarning, setDeviceWarning] = useState('')     // microphone / camera could not be turned on
    const [agentSpeaking, setAgentSpeaking] = useState(false)
    const [aiThinking, setAiThinking] = useState(false)   // the candidate just finished and the interviewer has not started answering yet
    const [micOn, setMicOn] = useState(true)
    const [cameraOn, setCameraOn] = useState(true)
    const [screenShareOn, setScreenShareOn] = useState(false)
    const [questions, setQuestions] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [candidateAnswer, setCandidateAnswer] = useState('')
    const [isAIEvaluating, setIsAIEvaluating] = useState(false)
    const [activeTab, setActiveTab] = useState('question') // 'question' | 'transcript' | 'notes'
    const [notes, setNotes] = useState('')
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [showCaptions, setShowCaptions] = useState(true)
    const [recordingState, setRecordingState] = useState('idle')   // idle | recording | error
    const [networkIssue, setNetworkIssue] = useState(false)         // the live connection dropped and is being restored
    const [endConfirmOpen, setEndConfirmOpen] = useState(false)
    const [controlsOpen, setControlsOpen] = useState(false)         // compact mic / camera / CC controls (hover or tap)
    const [moreOpen, setMoreOpen] = useState(false)
    const [timelineOpen, setTimelineOpen] = useState(false)         // small screens: the full question list is collapsed
    const [longThink, setLongThink] = useState(false)
    const [agentProgress, setAgentProgress] = useState(null)        // {question_id, question_index, total, phase} from the interviewer
    const qStartRef = useRef(0)                                     // elapsed-seconds value when the current question began
    const qLogRef = useRef([])                                      // [{questionId, startedAt, endedAt, duration}] per finished question

    // Live Transcripts
    const [transcripts, setTranscripts] = useState([])
    const transcriptEndRef = useRef(null)
    const recognitionRef = useRef(null)

    // Pre-Interview Readiness State
    const [previewStream, setPreviewStream] = useState(null)
    // What this interview needs comes from its configuration (only that is ever requested). Until it loads we
    // ask for everything: failing closed keeps the proctoring guarantee.
    const [required, setRequired] = useState(FULL_REQUIREMENTS)
    const [requirementsLoaded, setRequirementsLoaded] = useState(false)
    // "Ready" = a LIVE stream is being held. The browser's "granted" state alone is never treated as proof.
    const [perm, setPerm] = useState({ camera: IDLE_PERM, microphone: IDLE_PERM, screen: IDLE_PERM })
    const cameraReady = perm.camera.status === STATUS.READY
    const micReady = perm.microphone.status === STATUS.READY
    const [screenLost, setScreenLost] = useState(false)   // screen sharing stopped while the interview is running
    const [audioLevel, setAudioLevel] = useState(0)
    const [hardwareChecking, setHardwareChecking] = useState(false)
    const [hardwareError, setHardwareError] = useState('')

    // Refs
    const previewVideoRef = useRef(null)
    // The live test stream lives in a ref as well as state: the check function must NOT depend on the
    // state value it sets, or every successful start re-created the function, re-ran the mount effect,
    // stopped the camera and started it again in a loop (the "camera keeps crashing" symptom).
    const previewStreamRef = useRef(null)
    const screenStreamRef = useRef(null)          // the approved screen share, reused by the interview (never re-prompted)
    const requiredRef = useRef(FULL_REQUIREMENTS) // latest requirements, readable from callbacks without stale closures
    const permAttemptedRef = useRef(false)        // one automatic permission attempt per page load
    const screenLostHandlerRef = useRef(null)     // set while the interview is running
    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const animFrameRef = useRef(null)

    const videoRef = useRef(null)
    const screenVideoRef = useRef(null)
    const agentAudioRef = useRef(null)
    const roomRef = useRef(null)
    const localStreamRef = useRef(null)
    const agentSpeakingRef = useRef(false)
    const fullscreenEnteredRef = useRef(false)
    const violationCooldownRef = useRef(false)
    const terminatedRef = useRef(false)
    const mediaRecorderRef = useRef(null)
    const recordedChunksRef = useRef([])
    const connectingRef = useRef(false)

    // -------------------------------------------------------------
    // PRE-INTERVIEW HARDWARE INITIALIZATION & VERIFICATION GATE
    // -------------------------------------------------------------
    const setPermStatus = useCallback(
        (kind, status, message = '', recovery = '') => setPerm((prev) => ({ ...prev, [kind]: { status, message, recovery } })),
        [],
    )

    // Loads what this interview requires from its own configuration.
    useEffect(() => {
        let cancelled = false
        getMyInterviews()
            .then((list) => {
                if (cancelled) return
                const item = (list || []).find((i) => String(i.driveId) === String(driveId) && Number(i.roundNumber) === Number(roundNumber))
                const next = normalizeRequirements(item?.requiredPermissions)
                requiredRef.current = next
                setRequired(next)
            })
            .catch(() => { /* unreadable configuration: stay fail-closed (everything required) */ })
            .finally(() => { if (!cancelled) setRequirementsLoaded(true) })
        return () => { cancelled = true }
    }, [driveId, roundNumber])

    // Camera + microphone: ONE request that asks only for what is required. Retried only by an explicit click.
    const startHardwareCheck = useCallback(async () => {
        setHardwareChecking(true)
        setHardwareError('')
        const want = requiredRef.current
        try {
            // Stop any previous test stream / meter before opening a new one
            if (previewStreamRef.current) {
                previewStreamRef.current.getTracks().forEach((t) => t.stop())
                previewStreamRef.current = null
            }
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
            analyserRef.current = null
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                await audioContextRef.current.close().catch(() => {})
            }

            if (want.camera) setPermStatus('camera', STATUS.REQUESTING)
            setPermStatus('microphone', STATUS.REQUESTING)

            // Modest video settings: 1280x720 fails or stutters on a busy machine or when another app
            // (Meet/Zoom) already holds the camera.
            const video = want.camera ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } } : false
            const audio = { echoCancellation: true, noiseSuppression: true }
            let stream = null
            const errors = {}
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video, audio })
            } catch (err) {
                const denied = ['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(err?.name)
                if (want.camera && !denied) {
                    // The camera failed (missing or busy) but the microphone may be fine: keep the microphone
                    // usable and report exactly which device has the problem.
                    errors.camera = err
                    try { stream = await navigator.mediaDevices.getUserMedia({ audio }) } catch (audioErr) { errors.microphone = audioErr }
                } else {
                    if (want.camera) errors.camera = err
                    errors.microphone = err
                }
            }

            previewStreamRef.current = stream
            setPreviewStream(stream)
            if (stream && previewVideoRef.current) {
                previewVideoRef.current.srcObject = stream
                previewVideoRef.current.play?.().catch(() => {})
            }

            // Every required device is verified against the stream itself, and watched for the stream stopping.
            const firstProblem = []
            const settle = (kind, tracks) => {
                if (errors[kind]) {
                    const c = classifyMediaError(kind, errors[kind])
                    setPermStatus(kind, c.status, c.message, c.recovery)
                    firstProblem.push(`${c.message} ${c.recovery}`)
                    return
                }
                const check = verifyStream(kind, stream)
                if (!check.ok) {
                    setPermStatus(kind, STATUS.ENDED, `Your ${kind} is not active.`, 'Click Retry to start it again.')
                    return
                }
                setPermStatus(kind, STATUS.READY)
                tracks.forEach((track) => track.addEventListener('ended', () => setPermStatus(
                    kind, STATUS.ENDED, `Your ${kind} stopped.`,
                    'Reconnect it, or close other apps using it (for example Google Meet), then click Retry.')))
            }
            if (want.camera) settle('camera', stream?.getVideoTracks() || [])
            settle('microphone', stream?.getAudioTracks() || [])
            if (firstProblem.length) setHardwareError(firstProblem[0])

            // Audio level meter (purely informational - readiness never waits for the candidate to speak)
            if (stream?.getAudioTracks().length) {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext
                    const audioCtx = new AudioCtx()
                    audioContextRef.current = audioCtx
                    // Chrome starts an AudioContext "suspended" until resumed, which left the meter at zero.
                    if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {})
                    const analyser = audioCtx.createAnalyser()
                    analyser.fftSize = 256
                    analyserRef.current = analyser
                    audioCtx.createMediaStreamSource(stream).connect(analyser)

                    const bufferLength = analyser.frequencyBinCount
                    const dataArray = new Uint8Array(bufferLength)
                    const updateLevel = () => {
                        if (!analyserRef.current) return
                        analyserRef.current.getByteFrequencyData(dataArray)
                        let sum = 0
                        for (let i = 0; i < bufferLength; i++) sum += dataArray[i]
                        setAudioLevel(Math.min(Math.round((sum / bufferLength / 128) * 100), 100))
                        animFrameRef.current = requestAnimationFrame(updateLevel)
                    }
                    updateLevel()
                } catch (audioErr) {
                    console.warn('Audio level meter unavailable:', audioErr)
                }
            }
        } finally {
            setHardwareChecking(false)
        }
    }, [setPermStatus])

    // ONE automatic attempt, and only once the interview's requirements are known - so a voice-only interview
    // never prompts for a camera. Every later attempt is an explicit click (no prompt loops).
    useEffect(() => {
        if (started || !requirementsLoaded || permAttemptedRef.current) return
        permAttemptedRef.current = true
        startHardwareCheck()
    }, [started, requirementsLoaded, startHardwareCheck])

    useEffect(() => () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {})
        }
    }, [started])

    // If the candidate fixes a blocked permission in the browser settings, pick that up once - without prompting.
    useEffect(() => {
        if (started || !requirementsLoaded || !navigator.permissions?.query) return undefined
        let cancelled = false
        const watchers = []
        const watch = async (name) => {
            try {
                const status = await navigator.permissions.query({ name })
                if (cancelled) return
                status.onchange = () => { if (status.state === 'granted') startHardwareCheck() }
                watchers.push(status)
            } catch { /* this browser doesn't expose this permission */ }
        }
        watch('microphone')
        if (required.camera) watch('camera')
        return () => { cancelled = true; watchers.forEach((w) => { w.onchange = null }) }
    }, [started, requirementsLoaded, required.camera, startHardwareCheck])

    // Bind preview stream whenever video element mounts
    useEffect(() => {
        if (!started && previewVideoRef.current && previewStream) {
            previewVideoRef.current.srcObject = previewStream
        }
    }, [started, previewStream])

    // Screen sharing needs a fresh click (getDisplayMedia can't ride on an earlier grant), so it is always explicit.
    // The approved stream is KEPT and reused by the interview - starting the interview never asks again.
    const onScreenTrackEnded = useCallback((stream) => {
        if (screenStreamRef.current !== stream) return          // superseded by a newer share
        screenStreamRef.current = null
        setPermStatus('screen', STATUS.ENDED, 'Screen sharing stopped.', 'Click "Share again" to share your entire screen.')
        screenLostHandlerRef.current?.()
    }, [setPermStatus])

    const requestScreenPermission = useCallback(async () => {
        setPermStatus('screen', STATUS.REQUESTING)
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' }, audio: false })
            const check = verifyStream('screen', stream)
            if (!check.ok) {
                stream.getTracks().forEach((t) => t.stop())
                if (check.status === STATUS.WRONG_SURFACE) {
                    setPermStatus('screen', STATUS.WRONG_SURFACE, WRONG_SURFACE_COPY.message, WRONG_SURFACE_COPY.recovery)
                } else {
                    setPermStatus('screen', STATUS.ENDED, 'Screen sharing stopped before it could be verified.', 'Click "Share screen" and try again.')
                }
                return
            }
            screenStreamRef.current?.getTracks().forEach((t) => t.stop())
            screenStreamRef.current = stream
            stream.getVideoTracks()[0].addEventListener('ended', () => onScreenTrackEnded(stream))
            setPermStatus('screen', STATUS.READY)
        } catch (err) {
            const c = classifyMediaError('screen', err)
            setPermStatus('screen', c.status, c.message, c.recovery)
        }
    }, [setPermStatus, onScreenTrackEnded])

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
            recorder.onerror = () => setRecordingState('error')
            recorder.start(1000)
            mediaRecorderRef.current = recorder
            setRecordingState('recording')
        } catch (err) {
            console.error('Recording could not start:', err.message)
            setRecordingState('error')
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
            const isRealLiveKit = Boolean(session?.url && session?.token && !session?.isMock && !session?.url?.includes('demo.livekit.cloud'))
            let questionsList = session?.questions || []
            // Invented placeholder questions are only for the offline DEMO mode. In a real interview they would be
            // shown to the candidate but never actually asked by the interviewer.
            if (!questionsList.length && !isRealLiveKit) {
                questionsList = [
                    { id: 'q1', question_text: 'Tell me about yourself, your technical stack, and your key recent projects.', difficulty: 'easy' },
                    { id: 'q2', question_text: 'How do you design scalable web applications and manage component state effectively?', difficulty: 'medium' },
                    { id: 'q3', question_text: 'Explain how you handle asynchronous operations, error handling, and performance optimization.', difficulty: 'medium' },
                    { id: 'q4', question_text: 'Describe a challenging bug or architectural problem you encountered and how you debugged and solved it.', difficulty: 'hard' },
                    { id: 'q5', question_text: 'What are your primary goals for personal and technical growth over the next 2-3 years?', difficulty: 'easy' },
                ]
            }
            setQuestions(questionsList)

            // A real interview must never silently turn into the scripted local demo (fake greeting, invented
            // questions, no interviewer) just because the room details are missing. Demo mode is opt-in.
            if (!isRealLiveKit && !ALLOW_DEMO_INTERVIEW) {
                throw new Error('The AI interviewer could not be set up for this interview. Please try again in a moment.')
            }

            if (!isRealLiveKit) {
                // Local Interactive AI Mode
                try {
                    const localStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
                        audio: true,
                    })
                    localStreamRef.current = localStream
                    if (videoRef.current) {
                        videoRef.current.srcObject = localStream
                        videoRef.current.play?.().catch(() => {})
                        startRecording(localStream)
                    }
                } catch (camErr) {
                    console.warn('Local media stream initialized with existing preview:', camErr)
                }

                setConnectState('connected')
                const firstQ = questionsList[0]?.question_text || 'Please introduce yourself and your technical background.'
                setTranscripts([
                    {
                        id: `greeting-${Date.now()}`,
                        sender: 'agent',
                        text: `Welcome to your AI Demo Technical Interview! I am your AI interviewer. Let's begin with question 1: ${firstQ}`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                ])

                speakText(`Welcome to your AI Technical Interview! Let's begin: ${firstQ}`)
                return
            }

            try {
                const room = new Room()
                roomRef.current = room

                // Audio track subscription from AI interviewer
                room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
                    if (participant.identity.startsWith('candidate-')) return
                    if (track.kind === Track.Kind.Audio) {
                        // Use the page's audio element when it exists; otherwise a hidden one, so the
                        // interviewer is never silent just because the element had not rendered yet.
                        if (agentAudioRef.current) {
                            track.attach(agentAudioRef.current)
                        } else {
                            const el = track.attach()
                            el.style.display = 'none'
                            document.body.appendChild(el)
                        }
                    }
                })
                room.on(RoomEvent.TrackUnsubscribed, (track) => track.detach())
                // Browsers can block audio until the candidate interacts; say so instead of staying silent.
                room.on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!room.canPlaybackAudio))

                room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
                    setAgentSpeaking(speakers.some((p) => !p.identity.startsWith('candidate-')))
                })

                room.on(RoomEvent.ParticipantConnected, () => setConnectState('connected'))
                room.on(RoomEvent.Reconnecting, () => setNetworkIssue(true))
                room.on(RoomEvent.Reconnected, () => setNetworkIssue(false))

                room.on(RoomEvent.Disconnected, () => {
                    if (!terminatedRef.current) setConnectError('Connection to the interview room was lost.')
                })

                // Real-Time Transcript Receiver over Data Channel
                room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
                    if (topic === 'progress') {
                        try { setAgentProgress(JSON.parse(new TextDecoder().decode(payload))) } catch { /* ignore a malformed packet */ }
                        return
                    }
                    if (topic === 'transcript') {
                        try {
                            const decoded = new TextDecoder().decode(payload)
                            const data = JSON.parse(decoded)
                            if (data.text) {
                                setTranscripts((prev) => {
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
                setDeviceWarning('')
                // Microphone FIRST: without it the interviewer cannot hear the candidate. A camera problem
                // (for example another app holding it) must neither stop the interview nor skip the mic.
                try {
                    await room.localParticipant.setMicrophoneEnabled(true)
                } catch (micErr) {
                    setDeviceWarning(`Your microphone could not be turned on (${micErr?.name || 'error'}), so the interviewer cannot hear you. Check the browser permission and close any other app using it.`)
                }
                try {
                    await room.localParticipant.setCameraEnabled(true)
                } catch (camErr) {
                    setDeviceWarning((prev) => prev || `Your camera could not be turned on (${camErr?.name || 'error'}). Close any other app using it (for example Google Meet).`)
                }

                const camPub = [...room.localParticipant.videoTrackPublications.values()][0]
                if (camPub?.track && videoRef.current) {
                    camPub.track.attach(videoRef.current)
                    if (videoRef.current.srcObject) startRecording(videoRef.current.srcObject)
                }

                // Screen: reuse the share the candidate ALREADY approved on the readiness screen. Asking again would
                // show a second browser prompt, which can also fail because the click that allowed it has expired.
                if (requiredRef.current.screen) {
                    const shared = screenStreamRef.current?.getVideoTracks().find(isTrackLive)
                    if (shared) {
                        try {
                            await room.localParticipant.publishTrack(shared, { source: Track.Source.ScreenShare, name: 'screen' })
                            if (screenVideoRef.current) {
                                screenVideoRef.current.srcObject = new MediaStream([shared])
                                screenVideoRef.current.play?.().catch(() => {})
                            }
                            setScreenShareOn(true)
                        } catch (err) {
                            console.warn('Could not publish the screen share:', err?.message)
                            setScreenShareOn(false)
                            setScreenLost(true)
                        }
                    } else {
                        setScreenLost(true)            // no live share: the candidate must share again (needs a click)
                    }
                }

                setConnectState('connected')
            } catch (livekitErr) {
                // Never pretend to be connected: a failed join used to look like a working room with no
                // interviewer and no error. Leave the room and let the outer handler show a Retry.
                roomRef.current?.disconnect?.()
                throw new Error(`Could not join the interview room: ${livekitErr?.message || 'connection failed'}. Please try again.`)
            }
        } catch (err) {
            setConnectState('failed')
            setConnectError(err.message || 'Could not connect to the interview room.')
            connectingRef.current = false
        }
    }

    // Enter Fullscreen & Start Session
    const enterFullscreenAndStart = async () => {
        // Re-verify at the moment of the click: a device may have been unplugged or sharing stopped since the last check.
        const want = requiredRef.current
        const lost = []
        if (want.camera && !verifyStream('camera', previewStreamRef.current).ok) lost.push('camera')
        if (!verifyStream('microphone', previewStreamRef.current).ok) lost.push('microphone')
        if (want.screen && !verifyStream('screen', screenStreamRef.current).ok) lost.push('screen')
        if (lost.length) {
            lost.forEach((kind) => setPermStatus(kind, STATUS.ENDED, `Your ${kind} is no longer active.`,
                kind === 'screen' ? 'Click "Share again" to share your entire screen.' : 'Click Retry to start it again.'))
            return                                   // never start an interview without its required resources
        }

        // Clean up preview hardware tracks and AudioContext
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close() } catch {}
            audioContextRef.current = null
        }
        if (previewStreamRef.current) {
            previewStreamRef.current.getTracks().forEach((t) => t.stop())
            previewStreamRef.current = null
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
        if (roomRef.current?.localParticipant) {
            await roomRef.current.localParticipant.setMicrophoneEnabled(next).catch(() => {})
        }
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next))
        }
        setMicOn(next)
    }

    const toggleCamera = async () => {
        const next = !cameraOn
        if (roomRef.current?.localParticipant) {
            await roomRef.current.localParticipant.setCameraEnabled(next).catch(() => {})
        }
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = next))
        }
        setCameraOn(next)
    }

    // In the room, screen sharing can stop at any time (the candidate clicks "Stop sharing"). That is surfaced at once,
    // counted as an integrity event, and can be fixed with one click.
    useEffect(() => {
        if (!started) { screenLostHandlerRef.current = null; return undefined }
        screenLostHandlerRef.current = () => {
            setScreenShareOn(false)
            if (requiredRef.current.screen && !terminatedRef.current) {
                setScreenLost(true)
                registerViolation('You stopped sharing your screen')
            }
        }
        return () => { screenLostHandlerRef.current = null }
    }, [started, registerViolation])

    const requestScreenShare = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' }, audio: false })
            const check = verifyStream('screen', stream)
            if (!check.ok) {
                stream.getTracks().forEach((t) => t.stop())
                setDeviceWarning(check.status === STATUS.WRONG_SURFACE
                    ? `${WRONG_SURFACE_COPY.message} ${WRONG_SURFACE_COPY.recovery}`
                    : 'Screen sharing could not be verified. Please try again.')
                return
            }
            screenStreamRef.current?.getTracks().forEach((t) => t.stop())
            screenStreamRef.current = stream
            const track = stream.getVideoTracks()[0]
            track.addEventListener('ended', () => onScreenTrackEnded(stream))
            const local = roomRef.current?.localParticipant
            if (local) {
                for (const pub of local.videoTrackPublications.values()) {
                    if (pub.source === Track.Source.ScreenShare && pub.track) {
                        await local.unpublishTrack(pub.track, false).catch(() => {})
                    }
                }
                await local.publishTrack(track, { source: Track.Source.ScreenShare, name: 'screen' })
            }
            if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = new MediaStream([track])
                screenVideoRef.current.play?.().catch(() => {})
            }
            setScreenShareOn(true)
            setScreenLost(false)
            setDeviceWarning('')
        } catch (err) {
            const c = classifyMediaError('screen', err)
            setDeviceWarning(`${c.message} ${c.recovery}`)
        }
    }

    const finishInterview = async () => {
        setSubmitting(true)
        try {
            await stopAndUploadRecording()
            await completeAgentInterview(driveId, roundNumber).catch(() => null)
            await completeInterview(driveId, roundNumber)
        } finally {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((t) => t.stop())
                localStreamRef.current = null
            }
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
        const t = setTimeout(() => setViolationMessage(''), 2800)
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

    const isNaturalVoice = (v) => {
        const n = v.name.toLowerCase()
        return n.includes('natural') || n.includes('online') || n.startsWith('google')
    }

    const getBestVoice = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return null
        const voices = window.speechSynthesis.getVoices()
        if (!voices.length) return null
        const femaleNames = ['zira', 'samantha', 'aria', 'jenny', 'google us english', 'google uk english female', 'female']
        const matched = voices.filter((v) => femaleNames.some((n) => v.name.toLowerCase().includes(n)))
        return matched.sort((a, b) => (isNaturalVoice(b) ? 1 : 0) - (isNaturalVoice(a) ? 1 : 0))[0] || voices[0]
    }

    const speakText = useCallback((text) => {
        return new Promise((resolve) => {
            if (typeof window === 'undefined' || !window.speechSynthesis) {
                resolve()
                return
            }
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(text.replace(/,/g, ', ').replace(/\./g, '. '))
            const voice = getBestVoice()
            if (voice) utterance.voice = voice
            utterance.rate = 0.95
            utterance.pitch = 1.05

            let resolved = false
            const finish = () => {
                if (resolved) return
                resolved = true
                setAgentSpeaking(false)
                resolve()
            }

            utterance.onstart = () => {
                setAgentSpeaking(true)
            }
            utterance.onend = finish
            utterance.onerror = finish

            setTimeout(finish, Math.max(3000, text.length * 90))
            window.speechSynthesis.speak(utterance)
        })
    }, [])

    useEffect(() => {
        agentSpeakingRef.current = agentSpeaking
    }, [agentSpeaking])

    // Continuous Speech Recognition
    useEffect(() => {
        if (!started || typeof window === 'undefined') return
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) return

        let recognition = null
        let isStopped = false

        try {
            recognition = new SpeechRecognition()
            recognition.continuous = true
            recognition.interimResults = true
            recognition.lang = 'en-US'

            recognition.onresult = (event) => {
                if (agentSpeakingRef.current) return
                let text = ''
                for (let i = 0; i < event.results.length; i++) {
                    text += event.results[i][0].transcript + ' '
                }
                if (text.trim()) {
                    setCandidateAnswer(text.trim())
                }
            }

            recognition.onerror = (e) => {
                if (e.error !== 'no-speech' && e.error !== 'aborted' && e.error !== 'audio-capture') {
                    console.warn('SpeechRecognition event:', e.error)
                }
            }

            recognition.onend = () => {
                if (!isStopped && micOn && !terminatedRef.current) {
                    setTimeout(() => {
                        if (!isStopped && micOn && !terminatedRef.current) {
                            try { recognition.start() } catch {}
                        }
                    }, 250)
                }
            }

            recognitionRef.current = recognition
            if (micOn) {
                try { recognition.start() } catch {}
            }
        } catch (err) {
            console.warn('SpeechRecognition init error:', err)
        }

        return () => {
            isStopped = true
            try { recognition?.stop() } catch {}
        }
    }, [started, micOn])

    const generateAiFeedback = (question, answerText) => {
        const text = (answerText || '').trim()
        if (!text || text.length < 15) {
            return `Thank you for your response. To provide the strongest evaluation, try elaborating further with specific examples or architecture details. Let's proceed to the next question.`
        }
        const keywords = ['react', 'node', 'state', 'hook', 'database', 'sql', 'nosql', 'api', 'async', 'promise', 'component', 'debug', 'architecture', 'scalability', 'performance']
        const hasTechnicalKeyword = keywords.some((k) => text.toLowerCase().includes(k))

        if (hasTechnicalKeyword) {
            return `Excellent explanation! You touched upon relevant technical patterns and structured your response clearly. Let's move forward to the next topic.`
        }
        return `Good response. You articulated your thought process well. Let's continue with our next technical question.`
    }

    const currentQuestion = questions[currentQuestionIndex]
    const latestTranscript = transcripts[transcripts.length - 1]

    useEffect(() => {
        if (latestTranscript?.sender !== 'candidate' || agentSpeaking) return undefined
        setAiThinking(true)
        const timer = setTimeout(() => setAiThinking(false), 9000)   // never "think" forever if the reply is slow
        return () => clearTimeout(timer)
    }, [latestTranscript, agentSpeaking])
    useEffect(() => { if (agentSpeaking) setAiThinking(false) }, [agentSpeaking])

    const thinkingNow = !agentSpeaking && (aiThinking || isAIEvaluating)
    useEffect(() => {
        if (!thinkingNow) { setLongThink(false); return undefined }
        const timer = setTimeout(() => setLongThink(true), 3500)   // a long pause becomes "Preparing follow-up..."
        return () => clearTimeout(timer)
    }, [thinkingNow])
    const aravState = (connectState === 'connecting' || connectState === 'agent-joining') ? 'connecting'
        : agentSpeaking ? 'speaking'
        : thinkingNow ? (longThink ? 'followup' : 'thinking')
        : 'listening'

    // The interviewer says which question is active: follow it (match by id; intro lines without text are skipped).
    useEffect(() => {
        if (!agentProgress?.question_id || questions.length === 0) return
        const index = questions.findIndex((q) => q.id === agentProgress.question_id)
        if (index >= 0) setCurrentQuestionIndex(index)
    }, [agentProgress, questions])

    // Each question has its own timer: closing one records start / end / duration, then a new one starts at 00:00.
    const lastQuestionRef = useRef(null)
    useEffect(() => {
        const q = questions[currentQuestionIndex]
        if (!q) return
        const previous = lastQuestionRef.current
        if (previous && previous.id !== q.id) {
            const endedAt = Date.now()
            qLogRef.current.push({ questionId: previous.id, startedAt: previous.startedAt, endedAt, duration: Math.max(0, Math.round((endedAt - previous.startedAt) / 1000)) })
        }
        if (!previous || previous.id !== q.id) {
            lastQuestionRef.current = { id: q.id, startedAt: Date.now() }
            qStartRef.current = elapsedSeconds
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuestionIndex, questions])
    const questionSeconds = Math.max(0, elapsedSeconds - qStartRef.current)
    const questionLimit = Number(currentQuestion?.time_limit) > 0 ? Number(currentQuestion.time_limit) : 150
    const questionLeft = questionLimit - questionSeconds
    const timerTone = questionLeft <= 0 ? 'over' : questionLeft <= 10 ? 'critical' : questionLeft <= 30 ? 'near' : 'normal'
    const lo = Math.max(1, Math.floor(questionLimit / 60)), hi = Math.max(lo + 1, Math.ceil(questionLimit / 60))

    // Scratchpad: private, autosaved on this device for the interview.
    const notesKey = `wm-scratchpad-${driveId}-${roundNumber}`
    useEffect(() => { try { const saved = localStorage.getItem(notesKey); if (saved) setNotes(saved) } catch { /* storage blocked */ } }, [notesKey])
    useEffect(() => { const t = setTimeout(() => { try { localStorage.setItem(notesKey, notes) } catch { /* storage blocked */ } }, 600); return () => clearTimeout(t) }, [notes, notesKey])

    const handleSubmitAnswer = async (e) => {
        if (e) e.preventDefault()
        if (isAIEvaluating || submitting) return
        setIsAIEvaluating(true)

        const answerText = candidateAnswer.trim() || 'Candidate provided verbal response.'
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        // 1. Add Candidate to transcript
        setTranscripts((prev) => [
            ...prev,
            {
                id: `cand-${Date.now()}`,
                sender: 'candidate',
                text: answerText,
                time: timestamp,
            },
        ])

        // 2. AI Feedback & Next Question
        const feedback = generateAiFeedback(currentQuestion, answerText)
        const isLast = currentQuestionIndex >= questions.length - 1

        if (isLast) {
            const concludingSpeech = `${feedback} Congratulations! You have successfully completed all technical questions for this interview. Great job!`
            setTranscripts((prev) => [
                ...prev,
                {
                    id: `ai-${Date.now()}`,
                    sender: 'agent',
                    text: concludingSpeech,
                    time: timestamp,
                },
            ])
            await speakText(concludingSpeech)
            setIsAIEvaluating(false)
            await finishInterview()
            return
        }

        const nextIndex = currentQuestionIndex + 1
        const nextQ = questions[nextIndex]
        const transitionSpeech = `${feedback} Question ${nextIndex + 1}: ${nextQ.question_text}`

        setTranscripts((prev) => [
            ...prev,
            {
                id: `ai-${Date.now()}`,
                sender: 'agent',
                text: transitionSpeech,
                time: timestamp,
            },
        ])

        setCurrentQuestionIndex(nextIndex)
        setCandidateAnswer('')
        setIsAIEvaluating(false)

        await speakText(transitionSpeech)
    }

    const handleRepeatQuestion = async () => {
        if (currentQuestion && !agentSpeaking) {
            await speakText(`Question ${currentQuestionIndex + 1}: ${currentQuestion.question_text}`)
        }
    }

    // Can the candidate continue? Only the resources this interview requires count.
    const gate = useMemo(() => {
        const statuses = { camera: perm.camera.status, microphone: perm.microphone.status, screen: perm.screen.status }
        const result = readiness(required, statuses)
        const requiredCount = Object.values(normalizeRequirements(required)).filter(Boolean).length
        return { ...result, requiredCount, readyCount: requiredCount - result.missing.length }
    }, [perm, required])
    const requiredKinds = Object.keys(required).filter((kind) => required[kind])

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
                            <ShieldCheck size={14} className={gate.canContinue ? 'text-success' : 'text-amber-500'} />
                            <span>Permissions: <strong className='text-ink'>{gate.readyCount}/{gate.requiredCount} ready</strong></span>
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
                            To keep the evaluation fair, this interview needs your {describeMissing(requiredKinds)}. Nothing else is requested, and the interview starts only once each of these is ready.
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

                                    {!required.camera && (
                                        <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-zinc-900'>
                                            <div className='w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white/50'>
                                                <Mic size={24} />
                                            </div>
                                            <p className='text-[14px] font-medium text-white'>Voice interview</p>
                                            <p className='text-[12px] text-zinc-400'>Your camera is not needed for this interview.</p>
                                        </div>
                                    )}

                                    {required.camera && !cameraReady && (
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
                                    {required.camera && (
                                        <div className='absolute top-3 left-3 flex items-center gap-2'>
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md ${cameraReady ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${cameraReady ? 'bg-white animate-pulse' : 'bg-white'}`} />
                                                {cameraReady ? 'Camera Live' : 'Camera Disconnected'}
                                            </span>
                                        </div>
                                    )}
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
                                    {required.camera && (
                                        <PermissionRow
                                            icon={Video} title='Camera' hint='Visual feed required for identity and proctoring'
                                            state={perm.camera} actionLabel='Allow camera' retryLabel='Retry' busy={hardwareChecking}
                                            onAction={startHardwareCheck}
                                        />
                                    )}
                                    <PermissionRow
                                        icon={Mic} title='Microphone' hint='Conversational voice channel for the AI interviewer'
                                        state={perm.microphone} actionLabel='Allow microphone' retryLabel='Retry' busy={hardwareChecking}
                                        onAction={startHardwareCheck}
                                    />
                                    {required.screen && (
                                        <PermissionRow
                                            icon={ScreenShare} title='Screen' hint='Share your entire screen - you will only be asked once'
                                            state={perm.screen} actionLabel='Share screen' retryLabel='Share again'
                                            onAction={requestScreenPermission}
                                        />
                                    )}

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

                            {/* Continue: ONE action, enabled only when every required permission is ready */}
                            <div className='space-y-2'>
                                <p
                                    role='status'
                                    className={`flex items-center justify-center gap-1.5 text-[12.5px] font-semibold ${gate.canContinue ? 'text-success' : 'text-amber-600'}`}
                                >
                                    {!requirementsLoaded ? 'Checking what this interview needs...'
                                        : gate.canContinue
                                            ? <><Check size={14} /> All required permissions are ready.</>
                                            : `Still needed: ${describeMissing(gate.missing)}.`}
                                </p>
                                <button
                                    onClick={enterFullscreenAndStart}
                                    disabled={!requirementsLoaded || !gate.canContinue}
                                    className={`w-full py-4 rounded-xl font-bold text-[14.5px] flex items-center justify-center gap-2 transition-all shadow-md ${
                                        requirementsLoaded && gate.canContinue
                                            ? 'bg-accent hover:bg-accent-dark text-white shadow-accent/25 hover:shadow-lg'
                                            : 'bg-neutral-soft text-text-secondary cursor-not-allowed border border-line'
                                    }`}
                                >
                                    Continue to Interview
                                    <ArrowRight size={15} />
                                </button>
                                <p className='text-center text-[11.5px] text-text-secondary'>
                                    Continuing starts the interview in fullscreen. By continuing, you agree to audio/video recording and integrity monitoring.
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

            {screenLost && required.screen && (
                <div role='alert' className='bg-red-600 text-white px-4 py-2.5 text-[13px] font-semibold flex items-center justify-center gap-3 flex-wrap'>
                    <AlertTriangle size={15} /> Screen sharing has stopped. Share your entire screen again to continue.
                    <button onClick={requestScreenShare} className='bg-white text-red-700 px-3 py-1 rounded-lg text-[12.5px] font-bold hover:bg-red-50'>Share again</button>
                </div>
            )}
            {/* Hidden video element capturing screen-share frames for proctoring violation snapshots */}
            <video
                ref={screenVideoRef}
                autoPlay
                muted
                playsInline
                className='fixed w-px h-px opacity-0 pointer-events-none -z-10'
            />

            {/* Temporary integrity warning: slides in, stays about 2-3 seconds, slides out. Every event is also logged server-side. */}
            {violationMessage && (
                <div role='alert' aria-live='assertive' className='wm-toast fixed top-4 left-1/2 z-50 w-[min(92vw,30rem)] bg-red-600 text-white rounded-2xl shadow-lift px-4 py-3 flex items-start gap-3'>
                    <AlertTriangle size={18} className='shrink-0 mt-0.5' aria-hidden='true' />
                    <div className='text-[13.5px] leading-snug'>
                        <p className='font-bold'>Integrity Warning</p>
                        <p className='opacity-95'>{violationMessage}</p>
                    </div>
                </div>
            )}
            <style>{`
                .wm-toast { animation: wmToastIn .28s ease-out both, wmToastOut .3s ease-in 2.5s forwards; transform: translateX(-50%); }
                @keyframes wmToastIn { from { opacity:0; transform: translate(-50%, -14px); } to { opacity:1; transform: translate(-50%, 0); } }
                @keyframes wmToastOut { to { opacity:0; transform: translate(-50%, -14px); } }
                @keyframes wmRecPulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
                @keyframes wmQuestionIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform:none; } }
                @media (prefers-reduced-motion: reduce) { .wm-toast, .wm-rec-dot, .wm-question { animation:none !important; } }
            `}</style>

            {/* Header: kept minimal on purpose - brand, timer, End Interview */}
            <header className='flex items-center justify-between gap-3 border-b border-line bg-card px-4 sm:px-6 py-3 shrink-0'>
                <div className='flex items-center gap-3 min-w-0'>
                    <img src={logo} alt='WorkmateIQ' className='w-9 h-9 rounded-lg shrink-0' />
                    <div className='min-w-0'>
                        <p className='font-display text-[15px] font-bold text-ink leading-tight truncate'>
                            <span className='text-accent'>WorkmateIQ</span> <span className='hidden sm:inline'>· AI Interview Session</span>
                        </p>
                        <p className='text-[11.5px] text-text-secondary truncate'>Live Proctoring &amp; Speech AI</p>
                    </div>
                </div>
                <div className='flex items-center gap-2 sm:gap-3 shrink-0'>
                    <span className='inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink bg-neutral-soft px-3 py-2 rounded-lg tabular-nums' aria-label={`Interview time ${formatElapsed(elapsedSeconds)}`}>
                        <Clock size={14} aria-hidden='true' /> {formatElapsed(elapsedSeconds)}
                    </span>
                    <button
                        type='button'
                        onClick={() => setEndConfirmOpen(true)}
                        disabled={submitting}
                        className='inline-flex items-center gap-1.5 border border-accent/40 text-accent font-semibold text-[12.5px] rounded-lg px-3.5 min-h-[40px] hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50'
                    >
                        <LogOut size={14} aria-hidden='true' /> <span className='hidden sm:inline'>{submitting ? 'Submitting...' : 'End Interview'}</span><span className='sm:hidden'>End</span>
                    </button>
                </div>
            </header>

            <main className='flex-1 min-h-0 p-3 sm:p-4 min-[1200px]:p-5 grid gap-4 min-[1200px]:grid-cols-[minmax(0,1.75fr)_minmax(380px,1fr)] min-[1200px]:items-start'>
                {/* ------------ Left: candidate video with Arav floating over it ------------ */}
                <section aria-label='Interview video' className='flex flex-col gap-3 min-w-0'>
                    <div
                        className='group relative w-full aspect-[4/3] sm:aspect-video min-[1200px]:max-h-[calc(100vh-260px)] min-[1200px]:min-h-[360px] bg-black rounded-2xl overflow-hidden shadow-soft'
                        onClick={() => { setControlsOpen((v) => !v); setMoreOpen(false) }}
                    >
                        <video ref={videoRef} autoPlay muted playsInline className='w-full h-full object-cover' aria-label='Your camera' />

                        {!cameraOn && (
                            <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900 text-white/80'>
                                <VideoOff size={34} aria-hidden='true' />
                                <p className='text-[13px] font-medium'>Camera off</p>
                            </div>
                        )}

                        {/* Recording status, always visible on the video */}
                        <div className='absolute top-3 left-3 flex flex-col items-start gap-2'>
                            {recordingState === 'error' ? (
                                <span role='status' className='inline-flex items-center gap-2 bg-amber-500 text-black text-[12px] font-bold px-3 py-1.5 rounded-full'>
                                    <AlertTriangle size={13} aria-hidden='true' /> Recording issue
                                </span>
                            ) : recordingState === 'recording' ? (
                                <span role='status' className='inline-flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white text-[12px] font-semibold px-3 py-1.5 rounded-full'>
                                    <span className='wm-rec-dot w-2.5 h-2.5 rounded-full bg-red-500' style={{ animation: 'wmRecPulse 1.6s ease-in-out infinite' }} aria-hidden='true' />
                                    Recording <span className='opacity-60'>|</span> <span className='tabular-nums'>{formatElapsed(elapsedSeconds)}</span>
                                </span>
                            ) : null}
                        </div>

                        {/* Arav: a floating participant tile. It sits top-right on small screens so it never covers the candidate. */}
                        <div className='absolute right-2 top-2 w-[104px] sm:w-[148px] min-[1200px]:top-auto min-[1200px]:bottom-3 min-[1200px]:right-3 min-[1200px]:w-[186px]' onClick={(e) => e.stopPropagation()}>
                            <AravTile state={aravState} />
                        </div>

                        {/* Live captions for what Arav says */}
                        {showCaptions && latestTranscript && (
                            <div aria-live='polite' className='absolute left-3 right-3 bottom-16 min-[1200px]:right-[210px] bg-black/80 backdrop-blur-sm text-white text-[13.5px] px-4 py-2.5 rounded-xl border border-white/10 flex items-start gap-2.5'>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 mt-0.5 ${latestTranscript.sender === 'agent' ? 'bg-accent text-white' : 'bg-emerald-600 text-white'}`}>
                                    {latestTranscript.sender === 'agent' ? 'Arav' : 'You'}
                                </span>
                                <p className='flex-1 leading-snug line-clamp-2 font-medium'>{latestTranscript.text}</p>
                            </div>
                        )}

                        <div className='absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-black/70 text-white text-[11.5px] font-medium px-2.5 py-1 rounded-full pointer-events-none'>
                            <User size={12} aria-hidden='true' /> You (Candidate)
                        </div>

                        {/* Compact controls: shown on hover / keyboard focus / tap, or whenever something needs attention */}
                        <div
                            className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 transition-opacity ${
                                controlsOpen || !micOn || !cameraOn || deviceWarning ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button type='button' onClick={toggleMic} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'} aria-pressed={!micOn} title={micOn ? 'Mic on' : 'Mic off'}
                                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white ${micOn ? 'bg-black/70 text-white hover:bg-black/85' : 'bg-red-600 text-white'}`}>
                                {micOn ? <Mic size={18} aria-hidden='true' /> : <MicOff size={18} aria-hidden='true' />}
                            </button>
                            <button type='button' onClick={toggleCamera} aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'} aria-pressed={!cameraOn} title={cameraOn ? 'Camera on' : 'Camera off'}
                                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white ${cameraOn ? 'bg-black/70 text-white hover:bg-black/85' : 'bg-red-600 text-white'}`}>
                                {cameraOn ? <Video size={18} aria-hidden='true' /> : <VideoOff size={18} aria-hidden='true' />}
                            </button>
                            <button type='button' onClick={() => setShowCaptions((c) => !c)} aria-label={showCaptions ? 'Turn captions off' : 'Turn captions on'} aria-pressed={showCaptions}
                                className={`h-11 px-3.5 rounded-full flex items-center gap-1.5 text-[12px] font-bold backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white ${showCaptions ? 'bg-white text-ink' : 'bg-black/70 text-white'}`}>
                                <Subtitles size={16} aria-hidden='true' /> CC {showCaptions ? 'On' : 'Off'}
                            </button>
                            <div className='relative'>
                                <button type='button' onClick={() => setMoreOpen((v) => !v)} aria-label='More options' aria-expanded={moreOpen}
                                    className='w-11 h-11 rounded-full flex items-center justify-center bg-black/70 text-white hover:bg-black/85 backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white'>
                                    <MoreHorizontal size={18} aria-hidden='true' />
                                </button>
                                {moreOpen && (
                                    <div role='menu' className='absolute bottom-14 right-0 w-56 bg-card border border-line rounded-xl shadow-lift p-1.5 z-20'>
                                        <button type='button' role='menuitem' onClick={() => { setMoreOpen(false); requestScreenShare() }}
                                            className='w-full flex items-center gap-2 px-3 min-h-[44px] rounded-lg text-[13px] text-ink hover:bg-neutral-soft text-left'>
                                            {screenShareOn ? <ScreenShare size={15} aria-hidden='true' /> : <ScreenShareOff size={15} aria-hidden='true' />}
                                            {screenShareOn ? 'Screen sharing active' : 'Share screen'}
                                        </button>
                                        <button type='button' role='menuitem' onClick={() => { setMoreOpen(false); handleRepeatQuestion() }} disabled={agentSpeaking || isAIEvaluating}
                                            className='w-full flex items-center gap-2 px-3 min-h-[44px] rounded-lg text-[13px] text-ink hover:bg-neutral-soft text-left disabled:opacity-40'>
                                            <Volume2 size={15} aria-hidden='true' /> Repeat the question
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Problems the candidate can act on, with plain-language guidance */}
                    {networkIssue && (
                        <div role='alert' className='p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-[13px] text-amber-900 flex items-start gap-2'>
                            <Wifi size={16} className='shrink-0 mt-0.5' aria-hidden='true' />
                            <span><b>Connection interrupted.</b> We&apos;re trying to reconnect. Please stay on this page.</span>
                        </div>
                    )}
                    {recordingState === 'error' && (
                        <div role='alert' className='p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-[13px] text-amber-900 flex items-start gap-2'>
                            <AlertTriangle size={16} className='shrink-0 mt-0.5' aria-hidden='true' />
                            <span><b>Recording interrupted.</b> We&apos;re attempting to restore recording. Please remain on this page.</span>
                        </div>
                    )}
                    {audioBlocked && (
                        <div role='alert' className='p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-[13px] text-amber-900 flex items-center gap-2'>
                            <AlertTriangle size={16} className='shrink-0' aria-hidden='true' /> Your browser is blocking Arav&apos;s audio.
                            <button type='button' onClick={() => roomRef.current?.startAudio().then(() => setAudioBlocked(false))} className='ml-auto font-semibold underline shrink-0 min-h-[44px]'>Enable audio</button>
                        </div>
                    )}
                    {deviceWarning && (
                        <div role='alert' className='p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-[13px] text-amber-900 flex items-start gap-2'>
                            <AlertTriangle size={16} className='shrink-0 mt-0.5' aria-hidden='true' /> <span>{deviceWarning}</span>
                        </div>
                    )}
                    {connectError && connectState === 'failed' && (
                        <div role='alert' className='p-3.5 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-700 flex items-center gap-2'>
                            <AlertTriangle size={16} className='shrink-0' aria-hidden='true' /> {connectError}
                            <button type='button' onClick={connectToAgent} className='ml-auto font-semibold underline shrink-0 min-h-[44px]'>Retry</button>
                        </div>
                    )}

                    {/* Persistent, lightweight integrity status (detailed warnings are temporary toasts) */}
                    <div className='flex items-center gap-3 flex-wrap rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3'>
                        <ShieldAlert size={18} className='text-amber-600 shrink-0' aria-hidden='true' />
                        <div className='min-w-0'>
                            <p className='text-[13px] font-bold text-ink leading-tight'>Integrity Monitoring Active</p>
                            <p className='text-[12px] text-text-secondary'>Please stay in this tab and don&apos;t close the browser.</p>
                        </div>
                        <span className={`ml-auto text-[12px] font-bold px-2.5 py-1 rounded-full ${violationCount === 0 ? 'bg-success-soft text-success' : violationCount >= 2 ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}>
                            Warnings {violationCount}/{MAX_VIOLATIONS}
                        </span>
                        {required.screen && (
                            screenShareOn ? (
                                <span className='inline-flex items-center gap-1.5 text-[12px] font-medium text-success'><ScreenShare size={14} aria-hidden='true' /> Screen sharing active</span>
                            ) : (
                                <button type='button' onClick={requestScreenShare} className='inline-flex items-center gap-1.5 text-[12px] font-semibold text-danger underline min-h-[44px]'>
                                    <ScreenShareOff size={14} aria-hidden='true' /> Screen sharing stopped - share again
                                </button>
                            )
                        )}
                    </div>

                    {/* Desktop: a large End Interview below the main content */}
                    <div className='hidden min-[1200px]:flex justify-center pt-1'>
                        <button type='button' onClick={() => setEndConfirmOpen(true)} disabled={submitting}
                            className='inline-flex items-center justify-center gap-2.5 w-full max-w-sm min-h-[52px] rounded-2xl bg-accent hover:bg-accent-dark text-white text-[16px] font-bold shadow-lift transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50'>
                            <LogOut size={18} aria-hidden='true' /> {submitting ? 'Submitting...' : 'End Interview'}
                        </button>
                    </div>
                </section>

                {/* ------------ Right: question, transcript, scratchpad ------------ */}
                <aside aria-label='Interview details' className='min-w-0 min-[1200px]:sticky min-[1200px]:top-4'>
                    <Card className='flex flex-col p-0 overflow-hidden shadow-soft min-[1200px]:max-h-[calc(100vh-120px)]'>
                        <div role='tablist' aria-label='Interview panel' className='flex border-b border-line shrink-0'>
                            {[
                                { id: 'question', label: 'Question', icon: <Lightbulb size={15} aria-hidden='true' /> },
                                { id: 'transcript', label: 'Live Transcript', icon: <MessageSquare size={15} aria-hidden='true' />, badge: transcripts.length },
                                { id: 'notes', label: 'Scratchpad', icon: <Copy size={15} aria-hidden='true' /> },
                            ].map((tab) => (
                                <button key={tab.id} type='button' role='tab' id={`tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 min-h-[48px] text-[13px] font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                                        activeTab === tab.id ? 'text-accent border-accent' : 'text-text-secondary border-transparent hover:text-ink'
                                    }`}>
                                    {tab.icon}<span>{tab.label}</span>
                                    {tab.badge > 0 && <span className='text-[10px] bg-accent/10 text-accent font-bold px-1.5 rounded-full'>{tab.badge}</span>}
                                </button>
                            ))}
                        </div>

                        <div className='flex-1 overflow-y-auto p-4 sm:p-5' role='tabpanel' id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                            {activeTab === 'question' && (
                                <>
                                    {currentQuestion ? (
                                        <div key={currentQuestion.id || currentQuestionIndex} className='wm-question' style={{ animation: 'wmQuestionIn .3s ease-out both' }}>
                                            <div className='flex items-center justify-between gap-3 flex-wrap mb-3'>
                                                <span className='text-[12px] font-bold text-accent bg-accent/10 px-3 py-1 rounded-full'>
                                                    Question {currentQuestionIndex + 1} of {questions.length}
                                                </span>
                                                <span className='inline-flex items-center gap-1.5 text-[12px] text-text-secondary'>
                                                    <Clock size={13} aria-hidden='true' /> Estimated time: {lo}–{hi} min
                                                </span>
                                            </div>

                                            <h2 className='text-[18px] sm:text-[19px] font-bold text-ink leading-snug mb-3'>{currentQuestion.question_text}</h2>

                                            <div className='flex items-center justify-between gap-3 flex-wrap mb-4'>
                                                <span
                                                    role='timer'
                                                    aria-label={`Time on this question ${formatElapsed(questionSeconds)}`}
                                                    className={`inline-flex items-center gap-2 text-[13px] font-bold tabular-nums px-3 py-1.5 rounded-lg ${
                                                        timerTone === 'over' || timerTone === 'critical' ? 'bg-danger-soft text-danger' : timerTone === 'near' ? 'bg-warning-soft text-warning' : 'bg-neutral-soft text-ink'
                                                    }`}
                                                >
                                                    <Clock size={14} aria-hidden='true' /> {formatElapsed(questionSeconds)}
                                                    <span className='text-[11px] font-semibold opacity-80'>
                                                        {timerTone === 'over' ? 'Time limit reached' : timerTone === 'critical' ? `${Math.max(questionLeft, 0)}s left` : timerTone === 'near' ? 'Almost out of time' : 'on this question'}
                                                    </span>
                                                </span>
                                                <button type='button' onClick={handleRepeatQuestion} disabled={agentSpeaking || isAIEvaluating}
                                                    className='inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-text-secondary hover:text-accent min-h-[44px] disabled:opacity-40'>
                                                    <Volume2 size={14} aria-hidden='true' /> Repeat question
                                                </button>
                                            </div>

                                            <p className='text-[13px] text-text-secondary leading-relaxed rounded-xl bg-neutral-soft/70 px-4 py-3'>
                                                Answer naturally. Arav will listen to your explanation in real time and may ask follow-up questions based on your response.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className='py-8 text-center text-text-secondary'>
                                            <Loader2 size={24} className='mx-auto mb-2 text-accent animate-spin' aria-hidden='true' />
                                            <p className='text-[13.5px] font-medium text-ink'>Arav is getting started...</p>
                                            <p className='text-[12px] mt-1'>Your first question will appear here in a moment.</p>
                                        </div>
                                    )}

                                    {/* Interview progress */}
                                    {questions.length > 0 && (
                                        <div className='mt-6 pt-5 border-t border-line'>
                                            <div className='flex items-center justify-between mb-2'>
                                                <p className='text-[14px] font-bold text-ink'>Interview Progress</p>
                                                <p className='text-[12.5px] text-text-secondary'>{currentQuestionIndex} of {questions.length} completed</p>
                                            </div>
                                            <div className='h-2 rounded-full bg-neutral-soft overflow-hidden mb-3' role='progressbar' aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={currentQuestionIndex}>
                                                <div className='h-full rounded-full bg-accent transition-all duration-500' style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }} />
                                            </div>

                                            <button type='button' onClick={() => setTimelineOpen((v) => !v)} aria-expanded={timelineOpen}
                                                className='md:hidden w-full text-left text-[12.5px] font-semibold text-accent min-h-[44px]'>
                                                {timelineOpen ? 'Hide all questions' : 'Show all questions'}
                                            </button>
                                            <ol className={`${timelineOpen ? 'block' : 'hidden'} md:block space-y-1.5`}>
                                                {questions.map((q, idx) => {
                                                    const done = idx < currentQuestionIndex
                                                    const current = idx === currentQuestionIndex
                                                    return (
                                                        <li key={q.id || idx} aria-current={current ? 'step' : undefined}
                                                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${current ? 'bg-accent/8 border border-accent/20' : ''}`}>
                                                            <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[12px] font-bold ${
                                                                done ? 'bg-success text-white' : current ? 'bg-accent text-white' : 'bg-neutral-soft text-text-secondary'
                                                            }`}>
                                                                {done ? <Check size={14} aria-hidden='true' /> : idx + 1}
                                                            </span>
                                                            <span className={`flex-1 min-w-0 text-[13px] leading-snug truncate ${current ? 'font-semibold text-ink' : done ? 'text-text-secondary' : 'text-text-secondary'}`}>
                                                                {idx <= currentQuestionIndex ? q.question_text : `Question ${idx + 1}`}
                                                            </span>
                                                            <span className={`text-[11.5px] font-semibold shrink-0 ${current ? 'text-accent bg-accent/10 px-2 py-0.5 rounded-full' : done ? 'text-success' : 'text-text-secondary/70'}`}>
                                                                {done ? 'Completed' : current ? 'Current' : 'Upcoming'}
                                                            </span>
                                                        </li>
                                                    )
                                                })}
                                            </ol>
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
                                                            <span className='font-bold text-accent'>Arav</span>
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
                                    Private scratchpad for jotting down calculations, structure, or key points before speaking. This is private: it is not submitted, shown to the hiring team, or scored.
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
                </aside>

                {/* Mobile / tablet: End Interview at the bottom, reachable but behind a confirmation */}
                <div className='min-[1200px]:hidden flex justify-center pb-2'>
                    <button type='button' onClick={() => setEndConfirmOpen(true)} disabled={submitting}
                        className='inline-flex items-center justify-center gap-2.5 w-full max-w-md min-h-[52px] rounded-2xl bg-accent hover:bg-accent-dark text-white text-[16px] font-bold shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50'>
                        <LogOut size={18} aria-hidden='true' /> {submitting ? 'Submitting...' : 'End Interview'}
                    </button>
                </div>
            </main>

            <ConfirmModal
                open={endConfirmOpen}
                onClose={() => setEndConfirmOpen(false)}
                title='End interview?'
                confirmLabel='End Interview'
                cancelLabel='Continue Interview'
                danger
                onConfirm={async () => { await finishInterview(); setEndConfirmOpen(false) }}
            >
                <p className='text-[13.5px] text-text-secondary leading-relaxed'>
                    Are you sure you want to end this interview? Your current progress will be submitted.
                </p>
            </ConfirmModal>
        </div>
    )
}

export default InterviewRoomPage


// One line of the permission checklist: what it is, whether it is really ready, and - when it is not - exactly
// what is wrong and how to fix it.
function PermissionRow({ icon, title, hint, state, actionLabel, retryLabel, onAction, busy = false }) {
    const status = state?.status || STATUS.IDLE
    const ready = status === STATUS.READY
    const requesting = status === STATUS.REQUESTING || busy
    const failed = [STATUS.BLOCKED, STATUS.CANCELLED, STATUS.UNAVAILABLE, STATUS.ENDED, STATUS.WRONG_SURFACE].includes(status)
    return (
        <div className={`p-3.5 rounded-xl border transition-colors ${ready ? 'bg-success-soft/50 border-success/30' : failed ? 'bg-amber-50/60 border-amber-300/70' : 'bg-card border-line'}`}>
            <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3 min-w-0'>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ready ? 'bg-success/15 text-success' : failed ? 'bg-amber-100 text-amber-700' : 'bg-neutral-soft text-text-secondary'}`}>
                        {React.createElement(icon, { size: 16 })}
                    </div>
                    <div className='min-w-0'>
                        <p className='text-[13px] font-semibold text-ink leading-snug'>{title}</p>
                        <p className='text-[11.5px] text-text-secondary'>{hint}</p>
                    </div>
                </div>
                {ready ? (
                    <span className='inline-flex items-center gap-1 text-[11.5px] font-bold text-success shrink-0'><Check size={14} /> Ready</span>
                ) : requesting ? (
                    <span className='inline-flex items-center gap-1.5 text-[11.5px] font-medium text-text-secondary shrink-0'>
                        <Loader2 size={13} className='animate-spin' /> Waiting for your browser...
                    </span>
                ) : (
                    <button
                        type='button'
                        onClick={onAction}
                        className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${failed ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-accent hover:bg-accent-dark text-white'}`}
                    >
                        {failed ? retryLabel : actionLabel}
                    </button>
                )}
            </div>
            {failed && (state.message || state.recovery) && (
                <p className='mt-2.5 text-[12px] text-amber-800 leading-relaxed'>
                    <span className='font-semibold'>{state.message}</span> {state.recovery}
                </p>
            )}
        </div>
    )
}
