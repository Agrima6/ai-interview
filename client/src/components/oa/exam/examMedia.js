import { classifyMediaError } from '../../../utils/mediaPermissions'

// Camera and screen access for the exam. Failures come back as a message the student can act on, never a raw error.

// Phones and tablets cannot share a screen, so hard proctoring cannot work on them. iPadOS reports a desktop Mac user agent, hence the touch check.
export const mobileDevice = () => typeof navigator !== 'undefined'
    && (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))

export const requestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return { ok: false, message: 'This browser cannot use a camera. Use the latest desktop Chrome or Edge.' }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
        return { ok: true, stream }
    } catch (error) {
        const c = classifyMediaError('camera', error)
        return { ok: false, message: `${c.message} ${c.recovery}` }
    }
}

// The whole screen only: sharing one window or tab would let the student keep a second window out of sight.
export const requestScreen = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) return { ok: false, message: 'This browser cannot share your screen. Use the latest desktop Chrome or Edge.' }
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' }, audio: false })
        const surface = stream.getVideoTracks()[0]?.getSettings?.().displaySurface
        if (surface && surface !== 'monitor') {
            stream.getTracks().forEach((t) => t.stop())
            return { ok: false, message: 'You shared a window or a tab. Please choose “Entire screen”.' }
        }
        return { ok: true, stream }
    } catch (error) {
        const c = classifyMediaError('screen', error)
        return { ok: false, message: `${c.message} ${c.recovery}` }
    }
}

export const stopStream = (stream) => stream?.getTracks().forEach((t) => t.stop())

const detectBrowser = (ua) => {
    const m = (re) => ua.match(re)?.[1]
    if (/Edg\//.test(ua)) return `Edge ${m(/Edg\/(\d+)/) || ''}`.trim()
    if (/OPR\//.test(ua)) return `Opera ${m(/OPR\/(\d+)/) || ''}`.trim()
    if (/Firefox\//.test(ua)) return `Firefox ${m(/Firefox\/(\d+)/) || ''}`.trim()
    if (/Chrome\//.test(ua)) return `Chrome ${m(/Chrome\/(\d+)/) || ''}`.trim()
    if (/Safari\//.test(ua)) return `Safari ${m(/Version\/(\d+)/) || ''}`.trim()
    return 'Unknown browser'
}
const detectOs = (ua) => /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS'

/** Browser, operating system and device as far as a website can see them. (A website cannot read a MAC address or host name.) */
export const describeDevice = () => {
    const ua = navigator.userAgent
    return {
        userAgent: ua, platform: navigator.platform || '', browser: detectBrowser(ua), os: detectOs(ua),
        device: /iPad|Tablet/i.test(ua) ? 'Tablet' : mobileDevice() ? 'Phone' : 'Laptop / desktop',
        screenCount: window.screen?.isExtended ? 2 : 1, screen: `${window.screen?.width}x${window.screen?.height}`,
        timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } })(), language: navigator.language || '',
    }
}

/** Asks the browser for the position (it shows its own permission prompt). Resolves to `{ ok, latitude, longitude, accuracy }` or `{ ok:false, message }`. */
export const requestLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ ok: false, message: 'This browser cannot share a location. Use the latest Chrome or Edge.' })
    navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ ok: true, latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        (err) => resolve({ ok: false, message: err.code === 1 ? 'Location access is blocked. Click the lock icon next to the address bar, allow Location for this site, then try again.' : 'Your location could not be found. Check that location is switched on for this device and try again.' }),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
})

export const describeEnvironment = (location) => ({
    ...describeDevice(),
    ...(location?.ok ? { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy } : {}),
})
