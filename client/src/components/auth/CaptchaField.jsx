import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getCaptcha } from '../../api/registrationsApi'

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const CHALLENGE_LIFETIME_MS = 4.5 * 60 * 1000          // the server accepts a challenge for 5 minutes; renew just before

let turnstileLoader = null
const loadTurnstile = () => {
    if (window.turnstile) return Promise.resolve(window.turnstile)
    turnstileLoader = turnstileLoader || new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = TURNSTILE_SRC
        script.async = true
        script.onload = () => resolve(window.turnstile)
        script.onerror = () => { turnstileLoader = null; reject(new Error('CAPTCHA could not be loaded.')) }
        document.head.appendChild(script)
    })
    return turnstileLoader
}

// The one CAPTCHA control for the registration forms. The server decides which kind is active:
//  - Cloudflare Turnstile when it is configured there (the token is verified by the backend), otherwise
//  - a built-in arithmetic question.
// Nothing is checked in the browser - the answer is only ever verified by the backend, so this just collects it.
// `onChange` receives the payload to submit with the form, or null while it is incomplete/expired.
// Bump `resetKey` to force a fresh challenge (e.g. after a failed submit - a used challenge cannot be reused).
function CaptchaField({ onChange, resetKey = 0, inputId = 'captcha' }) {
    const [challenge, setChallenge] = useState(null)
    const [answer, setAnswer] = useState('')
    const [loadError, setLoadError] = useState('')
    const [expired, setExpired] = useState(false)
    const [nonce, setNonce] = useState(0)
    const widgetBox = useRef(null)
    const widgetId = useRef(null)

    const refresh = useCallback(() => setNonce((n) => n + 1), [])

    useEffect(() => {
        let cancelled = false
        setChallenge(null); setAnswer(''); setExpired(false); setLoadError(''); onChange(null)
        getCaptcha()
            .then((res) => { if (!cancelled) setChallenge(res) })
            .catch((err) => { if (!cancelled) setLoadError(err.message || 'CAPTCHA could not be loaded.') })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nonce, resetKey])

    // A challenge goes stale on the server after 5 minutes: renew it quietly instead of failing at submit.
    useEffect(() => {
        if (!challenge) return undefined
        const timer = setTimeout(() => { setExpired(true); onChange(null) }, CHALLENGE_LIFETIME_MS)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challenge])

    useEffect(() => {
        if (challenge?.provider !== 'turnstile' || !widgetBox.current) return undefined
        let cancelled = false
        loadTurnstile().then((turnstile) => {
            if (cancelled || !widgetBox.current) return
            widgetId.current = turnstile.render(widgetBox.current, {
                sitekey: challenge.siteKey,
                callback: (token) => { setExpired(false); onChange({ turnstileToken: token }) },
                'expired-callback': () => { setExpired(true); onChange(null) },
                'error-callback': () => { setLoadError('CAPTCHA failed to load. Please refresh.'); onChange(null) },
            })
        }).catch((err) => setLoadError(err.message))
        return () => {
            cancelled = true
            try { if (widgetId.current != null) window.turnstile?.remove(widgetId.current) } catch { /* widget already gone */ }
            widgetId.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challenge])

    const handleAnswer = (value) => {
        setAnswer(value)
        onChange(value !== '' && challenge?.challengeToken ? { captchaToken: challenge.challengeToken, captchaAnswer: Number(value) } : null)
    }

    if (loadError) {
        return (
            <div className="flex items-center justify-between gap-3 text-[13px] text-red-600">
                <span>{loadError}</span>
                <button type="button" onClick={refresh} className="inline-flex items-center gap-1.5 font-medium underline"><RefreshCw size={13} /> Try again</button>
            </div>
        )
    }
    if (!challenge) return <p className="text-[13px] text-gray-500">Loading verification...</p>

    if (challenge.provider === 'turnstile') {
        return (
            <div className="space-y-2">
                <div ref={widgetBox} />
                {expired && <p className="text-[12.5px] text-red-600 font-medium">Verification expired. <button type="button" onClick={refresh} className="underline">Verify again</button></p>}
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <label htmlFor={inputId} className="block text-[13.5px] font-medium text-gray-700">{challenge.question} <span className="text-red-500">*</span></label>
                <button type="button" onClick={refresh} aria-label="Get a new question" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-gray-500 hover:text-gray-800">
                    <RefreshCw size={13} /> New question
                </button>
            </div>
            <input
                id={inputId}
                type="number"
                inputMode="numeric"
                value={answer}
                onChange={(e) => handleAnswer(e.target.value)}
                onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault() }}
                className={`w-full bg-white border rounded-xl py-3 px-4 text-[14.5px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-accent focus:ring-4 focus:ring-accent/10 ${expired ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Enter your answer"
            />
            {expired && <p className="text-[12.5px] text-red-600 font-medium">This question expired. <button type="button" onClick={refresh} className="underline">Get a new one</button></p>}
        </div>
    )
}

export default CaptchaField
