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

export const describeEnvironment = () => ({
    userAgent: navigator.userAgent, platform: navigator.platform || '',
    screenCount: window.screen?.isExtended ? 2 : 1, screen: `${window.screen?.width}x${window.screen?.height}`,
    timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } })(), language: navigator.language || '',
})
