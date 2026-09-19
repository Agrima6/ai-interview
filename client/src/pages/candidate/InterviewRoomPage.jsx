import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Room, RoomEvent, Track } from 'livekit-client'
import {
    Maximize, AlertTriangle, ShieldAlert, Bot, Loader2, Mic, MicOff, Video, VideoOff,
    LogOut, Clock, Sparkles, Lightbulb, CheckCircle2, Circle, ScreenShare, ScreenShareOff,
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

// Proctoring rules mirror the existing conduct-interview flow
// (client/src/components/Step2Interview.jsx): fullscreen enforced,
// tab-switch/window-blur/fullscreen-exit each count as one violation,
// 3 violations auto-ends the attempt. The actual voice interview is
// conducted by the standalone AI agent (workmate-iq-agent, a Python/
// LiveKit service) - this room connects to it as a LiveKit participant
// and handles the fairness/security + candidate-facing UI layer on top.
function InterviewRoomPage() {
    const { driveId, roundNumber } = useParams()
    const navigate = useNavigate()

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
    const [activeTab, setActiveTab] = useState('question')
    const [notes, setNotes] = useState('')
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    const videoRef = useRef(null)
    const screenVideoRef = useRef(null)
    const agentAudioRef = useRef(null)
    const roomRef = useRef(null)
    const fullscreenEnteredRef = useRef(false)
    const violationCooldownRef = useRef(false)
    const terminatedRef = useRef(false)
    const mediaRecorderRef = useRef(null)
    const recordedChunksRef = useRef([])
    // Guards against two overlapping startAgentInterview() calls (e.g. a fast double-click on
    // Retry, or the initial auto-start racing a manual retry) - without this, both requests can
    // read the candidate's agentInterviewId as still-null before either write lands, so both
    // create a fresh agent-side interview and one of the two Mongoose saves loses a version
    // conflict, surfacing as a generic "Something went wrong" instead of just reusing one.
    const connectingRef = useRef(false)

    // Records the candidate's own camera/mic feed for the length of the
    // session so HR can review it later - a separate concern from the
    // LiveKit publish (which sends the same tracks to the agent), since
    // recording happens locally regardless of what the agent does with them.
    const startRecording = (stream) => {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm'
        try {
            const recorder = new MediaRecorder(stream, { mimeType })
            recordedChunksRef.current = []
            recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
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
        await uploadInterviewRecording(driveId, roundNumber, blob).catch((err) => console.error('Recording upload failed:', err.message))
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

    const registerViolation = useCallback((reason) => {
        if (violationCooldownRef.current || terminatedRef.current) return
        violationCooldownRef.current = true
        setTimeout(() => { violationCooldownRef.current = false }, 1500)

        // A tab/window switch is exactly the kind of violation where the
        // webcam frame (their face) says nothing about what actually
        // happened - the screen-share frame captures what they switched to.
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
    }, [driveId, roundNumber])

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

            room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
                if (participant.identity.startsWith('candidate-')) return // never play back our own track
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

            await room.connect(session.url, session.token)
            await room.localParticipant.setCameraEnabled(true)
            await room.localParticipant.setMicrophoneEnabled(true)

            const camPub = [...room.localParticipant.videoTrackPublications.values()][0]
            if (camPub?.track && videoRef.current) {
                camPub.track.attach(videoRef.current)
                if (videoRef.current.srcObject) startRecording(videoRef.current.srcObject)
            }

            // Screen share is requested but not required to proceed - some
            // OSes/browsers block it entirely, and the interview shouldn't
            // be unusable just because that permission was denied.
            try {
                await room.localParticipant.setScreenShareEnabled(true)
                const screenPub = [...room.localParticipant.videoTrackPublications.values()].find((p) => p.source === Track.Source.ScreenShare)
                if (screenPub?.track && screenVideoRef.current) {
                    screenPub.track.attach(screenVideoRef.current)
                    setScreenShareOn(true)
                    screenPub.track.mediaStreamTrack.addEventListener('ended', () => setScreenShareOn(false))
                }
            } catch (err) {
                console.error('Screen share was not granted:', err.message)
            }

            setConnectState(room.remoteParticipants.size > 0 ? 'connected' : 'agent-joining')
        } catch (err) {
            setConnectState('failed')
            setConnectError(err.message || 'Could not connect to the interview agent. Is the agent service running?')
            connectingRef.current = false // allow a real Retry click after a genuine failure
        }
    }

    const enterFullscreenAndStart = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await Promise.race([
                    document.documentElement.requestFullscreen(),
                    new Promise((resolve) => setTimeout(resolve, 1200)),
                ])
            }
        } catch {
            // Some sandboxed contexts silently disallow fullscreen - proceed anyway.
        }
        setStarted(true)
        await connectToAgent()
    }

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
            const screenPub = [...roomRef.current.localParticipant.videoTrackPublications.values()].find((p) => p.source === Track.Source.ScreenShare)
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

    useEffect(() => {
        if (!started) return
        const handleVisibility = () => { if (document.hidden) registerViolation('You switched away from this tab') }
        const handleBlur = () => { if (!document.hidden) registerViolation('You switched to another window') }
        const handleFullscreenChange = () => {
            if (document.fullscreenElement) {
                fullscreenEnteredRef.current = true
                return
            }
            if (fullscreenEnteredRef.current) registerViolation('You exited fullscreen mode')
        }

        document.addEventListener('visibilitychange', handleVisibility)
        window.addEventListener('blur', handleBlur)
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility)
            window.removeEventListener('blur', handleBlur)
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
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

    // Elapsed-time clock, running once the room connects.
    useEffect(() => {
        if (connectState !== 'connected') return
        const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
        return () => clearInterval(interval)
    }, [connectState])

    // Best-effort "current question" pointer - the real turn-by-turn state
    // lives in the agent's own transcript, which isn't streamed to this UI
    // live, so this paces through the plan proportionally to elapsed time
    // as a rough guide for the candidate, not an authoritative signal.
    const currentQuestionIndex = useMemo(() => {
        if (questions.length === 0) return 0
        const estimatedTotalSeconds = 25 * 60
        const pace = Math.min(elapsedSeconds / estimatedTotalSeconds, 0.98)
        return Math.min(Math.floor(pace * questions.length), questions.length - 1)
    }, [elapsedSeconds, questions.length])

    const currentQuestion = questions[currentQuestionIndex]

    if (!started) {
        return (
            <div className='min-h-screen bg-ink flex items-center justify-center p-6'>
                <Card className='w-full max-w-lg p-8'>
                    <ShieldAlert size={36} className='text-accent mb-4' />
                    <h1 className='font-display text-[20px] font-bold text-ink mb-2'>Before you begin</h1>
                    <p className='text-[13.5px] text-text-secondary mb-4'>
                        This interview is proctored to keep it fair for every candidate, and is conducted live by our AI interviewer. Please read the rules below.
                    </p>
                    <ul className='space-y-2 text-[13.5px] text-text-secondary mb-6'>
                        <li>&bull; The interview runs in fullscreen.</li>
                        <li>&bull; Your camera and microphone must stay on for the full session.</li>
                        <li>&bull; You'll be asked to share your screen too - choose "Entire Screen" for the best coverage.</li>
                        <li>&bull; Switching tabs, windows, or exiting fullscreen counts as a violation.</li>
                        <li>&bull; After {MAX_VIOLATIONS} violations, the interview ends automatically.</li>
                    </ul>
                    <button
                        onClick={enterFullscreenAndStart}
                        className='w-full inline-flex items-center justify-center gap-2 bg-accent text-white font-semibold text-[14.5px] rounded-xl py-3.5 hover:opacity-90 transition-opacity'
                    >
                        <Maximize size={16} /> Enter Fullscreen & Start
                    </button>
                </Card>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-bg flex flex-col'>
            <audio ref={agentAudioRef} autoPlay />
            {/* Not shown to the candidate - exists purely so screen-share frames can be grabbed as proctoring evidence on a violation. */}
            <video ref={screenVideoRef} autoPlay muted playsInline className='fixed w-px h-px opacity-0 pointer-events-none -z-10' />


            {violationMessage && (
                <div className='fixed top-6 left-1/2 -translate-x-1/2 bg-red-500/95 text-white text-[13.5px] font-medium px-5 py-3 rounded-xl flex items-center gap-2 max-w-lg text-center shadow-lg z-50'>
                    <AlertTriangle size={16} className='shrink-0' /> {violationMessage}
                </div>
            )}

            <header className='flex items-center justify-between border-b border-line bg-card px-6 py-3.5 shrink-0'>
                <div className='flex items-center gap-2.5'>
                    <img src={logo} alt='' className='w-8 h-8 rounded-lg' />
                    <div>
                        <p className='font-display text-[15px] font-bold text-ink leading-tight'>AI Interview</p>
                        <p className='text-[12px] text-text-secondary'>Think &bull; Speak &bull; Grow</p>
                    </div>
                </div>
                <div className='flex items-center gap-3'>
                    <span className='inline-flex items-center gap-1.5 text-[12.5px] font-medium text-success'>
                        <span className='w-2 h-2 rounded-full bg-success animate-pulse' /> Live Interview
                    </span>
                    <span className='inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink bg-black/[0.04] dark:bg-white/[0.06] px-3 py-1.5 rounded-full'>
                        <Clock size={13} /> {formatElapsed(elapsedSeconds)}
                    </span>
                    <button
                        onClick={finishInterview}
                        disabled={submitting}
                        className='inline-flex items-center gap-1.5 border border-red-200 text-red-600 font-semibold text-[12.5px] rounded-lg px-3.5 py-2 hover:bg-red-50 transition-colors disabled:opacity-50'
                    >
                        <LogOut size={13} /> {submitting ? 'Ending...' : 'End Interview'}
                    </button>
                </div>
            </header>

            <div className='flex-1 grid lg:grid-cols-[1.6fr_1fr] gap-4 p-4 min-h-0'>
                {/* Left: interviewer + candidate video */}
                <div className='flex flex-col gap-4 min-h-0'>
                    <div className='relative flex-1 min-h-[280px] bg-ink rounded-2xl overflow-hidden flex items-center justify-center'>
                        <div className='absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[11.5px] font-medium px-2.5 py-1 rounded-full'>
                            <Sparkles size={12} /> AI Interviewer
                        </div>
                        {agentSpeaking && (
                            <div className='absolute top-3 right-3 inline-flex items-center gap-1.5 bg-success/90 text-white text-[11.5px] font-medium px-2.5 py-1 rounded-full'>
                                <span className='w-1.5 h-1.5 rounded-full bg-white animate-pulse' /> Speaking
                            </div>
                        )}
                        <div className='flex flex-col items-center gap-3 text-white/70'>
                            <div className='w-24 h-24 rounded-full bg-white/10 flex items-center justify-center'>
                                <Bot size={40} />
                            </div>
                            {(connectState === 'connecting' || connectState === 'agent-joining') && (
                                <span className='inline-flex items-center gap-1.5 text-[13px]'>
                                    <Loader2 size={14} className='animate-spin' /> {connectState === 'connecting' ? 'Connecting...' : 'Waiting for AI interviewer to join...'}
                                </span>
                            )}
                            {connectState === 'connected' && !agentSpeaking && (
                                <span className='text-[13px]'>Listening...</span>
                            )}
                        </div>
                    </div>

                    <div className='grid grid-cols-[1.5fr_1fr] gap-4 h-[220px] shrink-0'>
                        <div className='relative bg-black rounded-2xl overflow-hidden'>
                            <video ref={videoRef} autoPlay muted playsInline className='w-full h-full object-cover' />
                            <div className='absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/70 text-white text-[10.5px] font-medium px-2 py-0.5 rounded-full'>
                                <Video size={10} /> You (Candidate)
                            </div>
                        </div>
                        <Card className='p-4 flex flex-col justify-between'>
                            <div className='flex items-center gap-2 mb-2'>
                                <ShieldAlert size={14} className='text-accent' />
                                <span className='text-[12.5px] font-semibold text-ink'>Violations</span>
                                <span className='ml-auto text-[12.5px] font-bold text-ink'>{violationCount}/{MAX_VIOLATIONS}</span>
                            </div>
                            {screenShareOn ? (
                                <span className='inline-flex items-center gap-1.5 text-[11.5px] font-medium text-success mb-2'>
                                    <ScreenShare size={12} /> Screen sharing active
                                </span>
                            ) : (
                                <button onClick={requestScreenShare} className='inline-flex items-center gap-1.5 text-[11.5px] font-medium text-red-500 mb-2'>
                                    <ScreenShareOff size={12} /> Screen not shared - click to share
                                </button>
                            )}
                            <div className='flex items-center gap-2'>
                                <button onClick={toggleMic} className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-lg py-2 transition-colors ${micOn ? 'bg-black/[0.04] dark:bg-white/[0.06] text-ink' : 'bg-red-50 text-red-600'}`}>
                                    {micOn ? <Mic size={13} /> : <MicOff size={13} />} {micOn ? 'Mute' : 'Muted'}
                                </button>
                                <button onClick={toggleCamera} className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-lg py-2 transition-colors ${cameraOn ? 'bg-black/[0.04] dark:bg-white/[0.06] text-ink' : 'bg-red-50 text-red-600'}`}>
                                    {cameraOn ? <Video size={13} /> : <VideoOff size={13} />} {cameraOn ? 'Camera' : 'Off'}
                                </button>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Right: question / notes panel */}
                <Card className='flex flex-col min-h-0 p-0 overflow-hidden'>
                    <div className='flex border-b border-line shrink-0'>
                        {['question', 'notes'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 text-[13px] font-semibold py-3 capitalize transition-colors ${activeTab === tab ? 'text-accent border-b-2 border-accent' : 'text-text-secondary'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className='flex-1 overflow-y-auto p-5'>
                        {activeTab === 'question' && (
                            <>
                                {connectError && connectState === 'failed' ? (
                                    <div className='p-4 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-600 flex items-center gap-2 mb-4'>
                                        <AlertTriangle size={15} className='shrink-0' /> {connectError}
                                        <button onClick={connectToAgent} className='ml-auto font-semibold underline shrink-0'>Retry</button>
                                    </div>
                                ) : null}
                                {currentQuestion ? (
                                    <>
                                        <p className='text-[11.5px] font-semibold text-text-secondary uppercase tracking-wide mb-2'>
                                            Question {currentQuestionIndex + 1} of {questions.length}
                                        </p>
                                        <h2 className='text-[16px] font-bold text-ink leading-snug mb-4'>{currentQuestion.question_text}</h2>
                                        {currentQuestion.expected_topics?.length > 0 && (
                                            <div className='p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] mb-4'>
                                                <p className='flex items-center gap-1.5 text-[12px] font-semibold text-ink mb-2'><Lightbulb size={13} /> Things to cover</p>
                                                <ul className='space-y-1'>
                                                    {currentQuestion.expected_topics.map((topic) => (
                                                        <li key={topic} className='text-[12.5px] text-text-secondary'>&bull; {topic}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <p className='text-[12.5px] text-text-secondary leading-relaxed'>
                                            Answer out loud - your AI interviewer is listening and will follow up naturally, just like a real conversation.
                                        </p>
                                    </>
                                ) : (
                                    <p className='text-[13.5px] text-text-secondary'>Your AI interviewer will introduce the first question shortly.</p>
                                )}

                                {questions.length > 0 && (
                                    <div className='mt-6'>
                                        <p className='text-[12px] font-semibold text-text-secondary uppercase tracking-wide mb-2.5'>Progress</p>
                                        {/* Only the current and already-answered questions show their text -
                                            upcoming ones are deliberately hidden (just a step dot) so the
                                            candidate can't read ahead and prepare answers in advance. */}
                                        <div className='space-y-1.5'>
                                            {questions.map((q, idx) => (
                                                <div key={q.id || idx} className={`flex items-start gap-2 p-2.5 rounded-lg text-[12.5px] ${idx === currentQuestionIndex ? 'bg-accent/8 text-ink font-medium' : 'text-text-secondary'}`}>
                                                    {idx < currentQuestionIndex ? (
                                                        <CheckCircle2 size={14} className='text-success shrink-0 mt-0.5' />
                                                    ) : (
                                                        <Circle size={14} className='shrink-0 mt-0.5' />
                                                    )}
                                                    <span className='leading-snug'>
                                                        {idx <= currentQuestionIndex ? q.question_text : `Question ${idx + 1} - not revealed yet`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'notes' && (
                            <>
                                <p className='text-[12.5px] text-text-secondary mb-3'>
                                    Private scratchpad for your own thinking - only visible to you, never submitted or scored.
                                </p>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder='Jot down your approach before you answer out loud...'
                                    className='w-full h-64 resize-none bg-card border border-line rounded-xl p-3.5 text-[13.5px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                                />
                            </>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}

export default InterviewRoomPage
