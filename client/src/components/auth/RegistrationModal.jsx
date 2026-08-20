import React, { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import DynamicForm from '../forms/DynamicForm'
import { getCaptcha, submitRegistration } from '../../api/registrationsApi'
import { getRegistrationForm } from '../../api/formsApi'
import AuthInput from './AuthInput'
import AuthButton from './AuthButton'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

const ROLE_LABELS = {
    ORGANIZATION: 'Organization',
    COLLEGE: 'College',
    CANDIDATE: 'Candidate'
}

function RegistrationModal({ open, role, onClose, onSubmitSuccess }) {
    const [schema, setSchema] = useState(null)
    const [captcha, setCaptcha] = useState(null)
    const [captchaAnswer, setCaptchaAnswer] = useState('')
    const [consent, setConsent] = useState(false)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Load schema and captcha on open/role change
    useEffect(() => {
        if (!open || !role) return

        setSchema(null)
        setCaptcha(null)
        setCaptchaAnswer('')
        setConsent(false)
        setError('')

        Promise.all([
            getRegistrationForm(role.toLowerCase()),
            getCaptcha()
        ])
            .then(([schemaRes, captchaRes]) => {
                setSchema(schemaRes)
                setCaptcha(captchaRes)
            })
            .catch((err) => {
                setError(err.message || 'Failed to load form settings.')
            })
    }, [open, role])

    // Real-time client-side captcha check
    const checkCaptchaAnswer = () => {
        if (!captcha || !captchaAnswer) return false
        try {
            const [encoded] = captcha.challengeToken.split('.')
            const payload = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))
            // Check expiry
            if (Date.now() > payload.exp) {
                return 'EXPIRED'
            }
            return Number(captchaAnswer) === (payload.a + payload.b)
        } catch (e) {
            return false
        }
    }

    const captchaStatus = checkCaptchaAnswer()
    const isCaptchaCorrect = captchaStatus === true
    const isCaptchaExpired = captchaStatus === 'EXPIRED'

    const handleFormSubmit = async (formData) => {
        if (!consent) {
            setError('Please accept the consent checkbox.')
            return
        }
        if (!isCaptchaCorrect) {
            setError('Please complete the CAPTCHA correctly.')
            return
        }

        setError('')
        setSubmitting(true)
        try {
            const res = await submitRegistration({
                type: role.toUpperCase(),
                data: formData,
                consent: true,
                captchaToken: captcha.challengeToken,
                captchaAnswer: Number(captchaAnswer)
            })
            onSubmitSuccess(res)
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.')
            // Refresh captcha on failure
            getCaptcha().then(setCaptcha)
            setCaptchaAnswer('')
        } finally {
            setSubmitting(false)
        }
    }

    const roleLabel = ROLE_LABELS[role] || role

    // Extra footer for CAPTCHA & Consent
    const extraFooter = (
        <div className="space-y-5 border-t border-gray-100 pt-6 mt-6">
            {/* CAPTCHA Field */}
            {captcha && (
                <div className="space-y-2">
                    <label htmlFor="modal-captcha" className="block text-[13.5px] font-semibold text-gray-700">
                        {captcha.question} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            id="modal-captcha"
                            type="number"
                            value={captchaAnswer}
                            onChange={(e) => setCaptchaAnswer(e.target.value)}
                            onKeyDown={(e) => {
                                if (['e', 'E', '+', '-'].includes(e.key)) {
                                    e.preventDefault()
                                }
                            }}
                            className={`w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14.5px] text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-accent focus:ring-4 focus:ring-accent/10 ${
                                isCaptchaCorrect
                                    ? '!border-green-500 focus:!ring-green-500/10'
                                    : isCaptchaExpired
                                    ? '!border-red-500 focus:!ring-red-500/10'
                                    : ''
                            }`}
                            placeholder="Enter your answer"
                        />
                        {isCaptchaCorrect && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 font-medium text-[12px] flex items-center gap-1">
                                <CheckCircle2 size={16} /> Verified
                            </span>
                        )}
                    </div>
                    {isCaptchaExpired && (
                        <p className="text-[12.5px] text-red-600 font-medium">
                            CAPTCHA verification expired. Please complete the CAPTCHA again.
                        </p>
                    )}
                </div>
            )}

            {/* Consent checkbox */}
            <label className="flex items-start gap-3 text-[13.5px] text-gray-500 cursor-pointer select-none group">
                <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-200 accent-accent cursor-pointer transition-colors"
                />
                <span className="leading-snug group-hover:text-gray-700 transition-colors">
                    I agree to be contacted by WorkmateIQ about this registration and understand how my information will be used.
                </span>
            </label>
        </div>
    )

    return (
        <Modal open={open} onClose={onClose} title={`${roleLabel} Registration`} size="lg">
            <div className="space-y-6">
                {/* Descriptive subheader */}
                <div className="text-left">
                    <p className="text-[14.5px] text-gray-500">
                        Please fill in the details below to register as a partner with WorkmateIQ.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3 animate-in fade-in duration-200">
                        <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                        <p className="text-red-700 text-[13.5px] font-medium leading-normal">{error}</p>
                    </div>
                )}

                {!schema ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                                    <div className="h-11 bg-gray-50 rounded-xl animate-pulse" />
                                </div>
                            ))}
                        </div>
                        <div className="h-28 bg-gray-50 rounded-2xl animate-pulse mt-6" />
                    </div>
                ) : (
                    <DynamicForm
                        schema={schema}
                        onSubmit={handleFormSubmit}
                        submitting={submitting}
                        submitLabel="Create Account"
                        extraFooter={extraFooter}
                        submitDisabled={!consent || !isCaptchaCorrect}
                    />
                )}
            </div>
        </Modal>
    )
}

export default RegistrationModal
