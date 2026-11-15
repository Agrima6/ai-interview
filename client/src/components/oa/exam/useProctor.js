import { useCallback, useEffect, useRef, useState } from 'react'
import { examApi } from '../../../api/oaApi'

// Everything the browser can tell us about a student leaving the test. The server decides what counts and when a
// student is out; this file only observes, reports, and shows the student what was seen.

const FOCUS_FAMILY = new Set(['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT'])   // one act often fires all three
const COOLDOWN = { DEFAULT: 3000, DEVTOOLS: 60000, MULTIPLE_MONITORS: 60000, NO_FACE: 15000, MULTIPLE_FACES: 15000, LOOKING_AWAY: 15000 }

export const VIOLATION_TEXT = {
    TAB_SWITCH: 'You switched to another tab or window.', WINDOW_BLUR: 'You left the test window.', FULLSCREEN_EXIT: 'You left full screen.',
    COPY_PASTE: 'Copy, cut and paste are not allowed.', SCREEN_SHARE_STOPPED: 'Screen sharing was stopped.', CAMERA_OFF: 'Your camera was turned off.',
    NO_FACE: 'We could not see your face.', MULTIPLE_FACES: 'More than one face was seen.', LOOKING_AWAY: 'You looked away from the screen.',
    DEVTOOLS: 'Developer tools appear to be open.', MULTIPLE_MONITORS: 'A second monitor was detected.',
}

/** A small JPEG of the webcam, kept tiny: it is evidence for a human reviewer, not a recording. */
export const grabFrame = (video, width = 240, height = 180, quality = 0.5) => {
    try {
        // currentTime > 0: a video can report data before it has decoded a frame, and drawing it then gives a black picture.
        if (!video || video.readyState < 2 || !video.videoWidth || !(video.currentTime > 0)) return null
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(video, 0, 0, width, height)
        return canvas.toDataURL('image/jpeg', quality)
    } catch { return null }
}

export default function useProctor({ cfg, cameraStream, screenStream, active, onState }) {
    const [lost, setLost] = useState({ fullscreen: false, screen: false, camera: false })
    const [notice, setNotice] = useState(null)       // the last thing we told the student off for
    const last = useRef({})
    const pending = useRef([])
    const video = useRef(null)
    const cfgRef = useRef(cfg)
    const stateRef = useRef(onState)
    useEffect(() => { cfgRef.current = cfg; stateRef.current = onState })

    // A hidden <video> on the camera stream, so snapshots do not depend on the visible preview.
    useEffect(() => {
        if (!cameraStream) { video.current = null; return undefined }
        const el = document.createElement('video')
        el.muted = true; el.playsInline = true; el.srcObject = cameraStream
        el.play().catch(() => {})
        video.current = el
        return () => { el.srcObject = null; video.current = null }
    }, [cameraStream])

    const snapshot = useCallback(() => grabFrame(video.current), [])

    const send = useCallback((payload) => examApi.violation(payload).then((s) => { stateRef.current?.(s); return s }), [])

    const report = useCallback((type, detail = '') => {
        const now = Date.now()
        const family = FOCUS_FAMILY.has(type) ? 'focus' : type
        if (now - (last.current[family] || 0) < (COOLDOWN[type] || COOLDOWN.DEFAULT)) return
        last.current[family] = now
        if (VIOLATION_TEXT[type]) setNotice({ text: VIOLATION_TEXT[type], at: now })
        const payload = { type, detail, image: VIOLATION_TEXT[type] ? snapshot() : null }
        send(payload).catch(() => pending.current.push(payload))     // sent with the next heartbeat if the network blipped
    }, [send, snapshot])

    const flushPending = useCallback(async () => {
        const queued = pending.current.splice(0)
        for (const p of queued) { try { await send(p) } catch { pending.current.push(p) } }
    }, [send])

    // ---- browser events ----
    useEffect(() => {
        if (!active) return undefined
        const c = () => cfgRef.current
        const onVisibility = () => { if (document.hidden) report('TAB_SWITCH', 'Switched to another tab or window') }
        const onBlur = () => setTimeout(() => { if (!document.hidden && !document.hasFocus()) report('WINDOW_BLUR', 'The test window lost focus') }, 300)
        const onFullscreen = () => {
            if (!c().requireFullscreen) return
            const out = !document.fullscreenElement
            setLost((l) => ({ ...l, fullscreen: out }))
            if (out) report('FULLSCREEN_EXIT', 'Left full screen')
        }
        const block = (e) => { if (c().blockCopyPaste) { e.preventDefault(); report('COPY_PASTE', e.type) } }
        const onContext = (e) => { if (c().blockCopyPaste) { e.preventDefault(); report('RIGHT_CLICK', 'Right-click') } }
        const onKey = (e) => {
            const k = e.key?.toLowerCase()
            const ctrl = e.ctrlKey || e.metaKey
            const devtools = k === 'f12' || (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (ctrl && k === 'u') || (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k))
            const other = (ctrl && ['s', 'p', 'r'].includes(k)) || k === 'f5' || k === 'printscreen'
            if (devtools || other) { e.preventDefault(); report('SHORTCUT_BLOCKED', e.key) }
            if (ctrl && ['c', 'v', 'x'].includes(k) && c().blockCopyPaste) { e.preventDefault(); report('COPY_PASTE', `Ctrl+${k.toUpperCase()}`) }
        }
        const onUnload = (e) => { e.preventDefault(); e.returnValue = '' }
        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('blur', onBlur)
        document.addEventListener('fullscreenchange', onFullscreen)
        for (const ev of ['copy', 'cut', 'paste']) document.addEventListener(ev, block)
        document.addEventListener('contextmenu', onContext)
        document.addEventListener('keydown', onKey, true)
        window.addEventListener('beforeunload', onUnload)

        // Heuristics that need polling: docked developer tools shrink the viewport; a second screen shows in screen.isExtended.
        const poll = setInterval(() => {
            const wide = window.outerWidth - window.innerWidth > 160
            const tall = window.outerHeight - window.innerHeight > 220
            if (!document.fullscreenElement && (wide || tall)) report('DEVTOOLS', 'The browser window layout suggests developer tools are open')
            if (window.screen?.isExtended) report('MULTIPLE_MONITORS', 'More than one display is connected')
        }, 2000)

        return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            window.removeEventListener('blur', onBlur)
            document.removeEventListener('fullscreenchange', onFullscreen)
            for (const ev of ['copy', 'cut', 'paste']) document.removeEventListener(ev, block)
            document.removeEventListener('contextmenu', onContext)
            document.removeEventListener('keydown', onKey, true)
            window.removeEventListener('beforeunload', onUnload)
            clearInterval(poll)
        }
    }, [active, report])

    // ---- the camera and the screen share can be stopped from outside the page ----
    useEffect(() => {
        if (!active || !screenStream) return undefined
        const track = screenStream.getVideoTracks()[0]
        const ended = () => { setLost((l) => ({ ...l, screen: true })); report('SCREEN_SHARE_STOPPED', 'Screen sharing ended') }
        track?.addEventListener('ended', ended)
        return () => track?.removeEventListener('ended', ended)
    }, [active, screenStream, report])

    useEffect(() => {
        if (!active || !cameraStream) return undefined
        const track = cameraStream.getVideoTracks()[0]
        const ended = () => { setLost((l) => ({ ...l, camera: true })); report('CAMERA_OFF', 'Camera stopped') }
        track?.addEventListener('ended', ended)
        return () => track?.removeEventListener('ended', ended)
    }, [active, cameraStream, report])

    const clearLost = useCallback((key) => setLost((l) => ({ ...l, [key]: false })), [])
    return { report, snapshot, flushPending, lost, clearLost, notice, dismissNotice: () => setNotice(null) }
}
