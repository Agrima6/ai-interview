import React, { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'

const CHECK_INTERVAL_MS = 1000
// A single bad reading can just be a blink or a quick glance at the keyboard -
// require it to persist across several checks before it counts as a real violation.
const SUSTAINED_CHECKS_REQUIRED = 3
// How far the nose can drift from center (as a fraction of face width) before
// the head is considered turned away from the screen rather than just facing it.
const LOOK_AWAY_RATIO_MARGIN = 0.16

const VIOLATION_MESSAGES = {
    "no-face": "No face detected in your camera",
    "multiple-faces": "Multiple faces detected in your camera",
    "looking-away": "You looked away from the screen",
}

// Runs MediaPipe's FaceLandmarker entirely client-side (no video/frames ever
// leave the browser) to flag common proctoring signals: nobody in frame,
// more than one person in frame, or the candidate's head turned away from
// the screen for a sustained period. Reuses Step2Interview's existing
// violation/warning system via onViolation - this is just another source
// feeding into the same 3-strikes flow as tab-switching etc.
function ProctoringCamera({ active, onViolation, className = "" }) {
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const landmarkerRef = useRef(null)
    const intervalRef = useRef(null)
    const badStreakRef = useRef(0)
    const [status, setStatus] = useState("initializing") // initializing | ok | no-face | multiple-faces | looking-away | unavailable

    useEffect(() => {
        if (!active) return
        let cancelled = false

        const evaluate = (result) => {
            const faces = result.faceLandmarks || []
            let current = "ok"

            if (faces.length === 0) {
                current = "no-face"
            } else if (faces.length > 1) {
                current = "multiple-faces"
            } else {
                // Landmark indices 234/454/1 are the left cheek, right cheek, and nose
                // tip in MediaPipe's face mesh - a simple, robust way to estimate
                // left/right head turn without needing full 3D pose math.
                const lm = faces[0]
                const left = lm[234], right = lm[454], nose = lm[1]
                const width = right.x - left.x
                const ratio = width !== 0 ? (nose.x - left.x) / width : 0.5
                if (ratio < 0.5 - LOOK_AWAY_RATIO_MARGIN || ratio > 0.5 + LOOK_AWAY_RATIO_MARGIN) {
                    current = "looking-away"
                }
            }

            if (current === "ok") {
                badStreakRef.current = 0
                setStatus("ok")
                return
            }

            setStatus(current)
            badStreakRef.current += 1
            if (badStreakRef.current >= SUSTAINED_CHECKS_REQUIRED) {
                badStreakRef.current = 0
                onViolation(VIOLATION_MESSAGES[current])
            }
        }

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
                if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    await videoRef.current.play()
                }

                const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision")
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.0/wasm"
                )
                const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numFaces: 2,
                })
                if (cancelled) { landmarker.close(); return }
                landmarkerRef.current = landmarker
                setStatus("ok")

                intervalRef.current = setInterval(() => {
                    if (!videoRef.current || videoRef.current.readyState < 2) return
                    evaluate(landmarkerRef.current.detectForVideo(videoRef.current, performance.now()))
                }, CHECK_INTERVAL_MS)
            } catch (error) {
                console.log("Proctoring camera unavailable:", error)
                if (!cancelled) setStatus("unavailable")
            }
        }

        init()

        return () => {
            cancelled = true
            clearInterval(intervalRef.current)
            streamRef.current?.getTracks().forEach((t) => t.stop())
            landmarkerRef.current?.close()
        }
    }, [active])

    const ringColor = status === "ok" ? "ring-success"
        : status === "initializing" ? "ring-line"
        : "ring-red-500"

    const statusLabel = {
        initializing: "Starting camera...",
        ok: "Face detected",
        "no-face": "No face detected",
        "multiple-faces": "Multiple faces detected",
        "looking-away": "Please face the screen",
        unavailable: "Camera unavailable",
    }[status]

    return (
        <div className={`relative rounded-xl overflow-hidden ring-2 ${ringColor} transition-colors bg-black ${className}`}>
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />

            <div className='absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[11.5px] font-medium px-2.5 py-1 rounded-full'>
                <Camera size={11} /> Your Camera
            </div>

            <div className={`absolute bottom-3 left-3 flex items-center gap-1.5 backdrop-blur-sm text-[11.5px] font-medium px-2.5 py-1 rounded-full ${status === "ok" ? "bg-black/70 text-white" : status === "initializing" ? "bg-black/70 text-white/70" : "bg-red-600 text-white"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status === "ok" ? "bg-success" : status === "initializing" ? "bg-white/50" : "bg-white animate-pulse"}`} />
                {statusLabel}
            </div>

            {status === "unavailable" && (
                <div className='absolute inset-0 bg-black/85 flex items-center justify-center'>
                    <CameraOff size={20} className='text-white/70' />
                </div>
            )}
        </div>
    )
}

export default ProctoringCamera
