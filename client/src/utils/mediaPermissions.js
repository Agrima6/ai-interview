// Permission readiness for the interview (docs: workmateiq-bug-review-and-implementation-plan.md, section 1).
//
// Principles:
//  - Only what the interview's configuration requires is ever requested.
//  - "Ready" means a LIVE media stream is being held, never merely that the browser reported "granted": a
//    permission can be granted while the device is missing, busy, muted or unplugged.
//  - Every failure has a specific recovery instruction, and nothing here re-prompts on its own.

export const STATUS = Object.freeze({
    IDLE: 'idle',               // not requested yet
    REQUESTING: 'requesting',   // the browser prompt is open
    READY: 'ready',             // a live stream is held
    BLOCKED: 'blocked',         // the browser/OS denied it: the candidate must change a setting
    CANCELLED: 'cancelled',     // the candidate dismissed the screen-share picker
    UNAVAILABLE: 'unavailable', // no device, or another app is using it
    ENDED: 'ended',             // it was ready, then the stream stopped (unplugged, sharing stopped)
    WRONG_SURFACE: 'wrong-surface', // screen shared, but a tab/window instead of the entire screen
})

// If the interview's configuration can't be read we ask for everything: failing closed keeps the proctoring
// guarantee (a candidate is never let in with less than the organization asked for).
export const FULL_REQUIREMENTS = Object.freeze({ microphone: true, camera: true, screen: true })

export function normalizeRequirements(input) {
    if (!input || typeof input !== 'object') return { ...FULL_REQUIREMENTS }
    return { microphone: true, camera: Boolean(input.camera), screen: Boolean(input.screen) }   // the mic is always required
}

const LABEL = { camera: 'camera', microphone: 'microphone', screen: 'screen' }

/** Turn a getUserMedia / getDisplayMedia error into { status, message, recovery }. */
export function classifyMediaError(kind, err) {
    const name = err?.name || ''
    const thing = LABEL[kind] || 'device'
    if (kind === 'screen') {
        if (name === 'NotAllowedError' || name === 'AbortError' || name === 'PermissionDeniedError') {
            return {
                status: STATUS.CANCELLED,
                message: 'Screen sharing was cancelled.',
                recovery: 'Click "Share screen" and choose Entire Screen to continue.',
            }
        }
        return {
            status: STATUS.UNAVAILABLE,
            message: 'Screen sharing is not available in this browser.',
            recovery: 'Use the latest desktop Chrome, Edge or Firefox, then try again.',
        }
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        return {
            status: STATUS.BLOCKED,
            message: `Your browser is blocking the ${thing}.`,
            recovery: `Allow the ${thing} using the lock icon next to the address bar, then click Retry.`,
        }
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return {
            status: STATUS.UNAVAILABLE,
            message: `No ${thing} was found.`,
            recovery: `Connect a ${thing} or choose another device in your browser settings, then click Retry.`,
        }
    }
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
        return {
            status: STATUS.UNAVAILABLE,
            message: `Your ${thing} is being used by another app.`,
            recovery: `Close other apps using it (for example Google Meet or Zoom), then click Retry.`,
        }
    }
    return {
        status: STATUS.UNAVAILABLE,
        message: `Your ${thing} could not be started.`,
        recovery: 'Check the device and your browser settings, then click Retry.',
    }
}

/** A track only counts if it is still live. `readyState` flips to "ended" when a device is unplugged or sharing stops. */
export const isTrackLive = (track) => Boolean(track) && track.readyState === 'live'

/**
 * Verify that `stream` really is an active stream for `kind`. This is the proof of readiness - not the
 * browser's permission state.
 */
export function verifyStream(kind, stream) {
    if (!stream || typeof stream.getTracks !== 'function') return { ok: false, status: STATUS.IDLE }
    const tracks = kind === 'microphone' ? stream.getAudioTracks() : stream.getVideoTracks()
    if (!tracks.some(isTrackLive)) return { ok: false, status: STATUS.ENDED }
    if (kind === 'screen') {
        // Chrome reports what was shared. A single tab or window would let the candidate hide other applications,
        // so only "the entire screen" counts. Browsers that don't report a surface are given the benefit of the doubt.
        const surface = tracks.find(isTrackLive)?.getSettings?.().displaySurface
        if (surface === 'browser' || surface === 'window') return { ok: false, status: STATUS.WRONG_SURFACE, surface }
    }
    return { ok: true, status: STATUS.READY }
}

export const WRONG_SURFACE_COPY = {
    message: 'You shared a single window or tab instead of your entire screen.',
    recovery: 'Click "Share screen" again and choose Entire Screen.',
}

/** Which required resources are not ready, and whether the candidate may continue. */
export function readiness(required, statuses) {
    const need = normalizeRequirements(required)
    const missing = Object.keys(need).filter((kind) => need[kind] && statuses?.[kind] !== STATUS.READY)
    return { canContinue: missing.length === 0, missing }
}

/** "Camera", "Camera and screen", "Camera, microphone and screen" - used in the "still needed" line. */
export function describeMissing(missing) {
    const names = missing.map((kind) => LABEL[kind])
    if (names.length <= 1) return names[0] || ''
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
