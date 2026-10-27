import React, { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import DynamicForm from '../forms/DynamicForm'
import { submitRegistration } from '../../api/registrationsApi'
import CaptchaField from './CaptchaField'
import { getRegistrationForm } from '../../api/formsApi'
import AuthInput from './AuthInput'
import AuthButton from './AuthButton'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

const ROLE_LABELS = {
    ORGANIZATION: 'Organization',
    COLLEGE: 'College',
    CANDIDATE: 'Candidate'
}

// `inline` renders the same form in the page (the register screen's right-hand panel) instead of a popup.
function RegistrationModal({ open, role, onClose, onSubmitSuccess, inline = false }) {
    const [schema, setSchema] = useState(null)
    const [captchaPayload, setCaptchaPayload] = useState(null)
    const [captchaReset, setCaptchaReset] = useState(0)
    const [consent, setConsent] = useState(false)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Load schema and captcha on open/role change. Guarded against races:
    // if role changes again before this fetch resolves (e.g. the user
    // switches role quickly), a slower stale response must not overwrite
    // the newer one - otherwise the modal title (bound directly to the
    // current `role` prop) can show one role while `schema` silently holds
    // a different role's fields, and submission fails with "Unknown field."
    useEffect(() => {
        if (!open || !role) return
        let cancelled = false

        setSchema(null)
        setCaptchaReset((n) => n + 1)
        setConsent(false)
        setError('')

        getRegistrationForm(role.toLowerCase())
            .then((schemaRes) => {
                if (cancelled) return
                setSchema(schemaRes)
            })
            .catch((err) => {
                if (cancelled) return
                setError(err.message || 'Failed to load form settings.')
            })

        return () => { cancelled = true }
    }, [open, role])

    const handleFormSubmit = async (formData) => {
        if (!consent) {
            setError('Please accept the consent checkbox.')
            return
        }
        if (!captchaPayload) {
            setError('Please complete the verification.')
            return
        }

        setError('')
        setSubmitting(true)
        try {
            const res = await submitRegistration({
                type: role.toUpperCase(),
                data: formData,
                consent: true,
                ...captchaPayload,
            })
            onSubmitSuccess(res)
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.')
            // A challenge is single-use: whatever went wrong, the next attempt needs a fresh one.
            setCaptchaReset((n) => n + 1)
        } finally {
            setSubmitting(false)
        }
    }

    const roleLabel = ROLE_LABELS[role] || role

    // Extra footer for CAPTCHA & Consent
    const extraFooter = (
        <div className="space-y-5 border-t border-gray-100 pt-6 mt-6">
            <CaptchaField onChange={setCaptchaPayload} resetKey={captchaReset} inputId="modal-captcha" />

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

    const content = (
            <div className="space-y-6">
                {inline ? (
                    <div>
                        <div className="flex gap-1.5 justify-center mb-6" aria-hidden="true">
                            <span className="h-1.5 w-2.5 rounded-full bg-accent" />
                            <span className="h-1.5 w-[34px] rounded-full bg-accent" />
                            <span className="h-1.5 w-2.5 rounded-full bg-[#EAD9DE]" />
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-[14px] font-medium text-accent hover:text-accent-dark min-h-[44px] -mt-2"
                        >
                            ← Change role
                        </button>
                        <h2 className="font-display text-[26px] font-medium tracking-tight text-ink mt-1">{roleLabel} registration</h2>
                        <p className="text-[15px] font-normal text-gray-500 mt-1.5">
                            Please fill in the details below to register as a partner with WorkmateIQ.
                        </p>
                    </div>
                ) : (
                    <div className="text-left">
                        <p className="text-[14.5px] text-gray-500">
                            Please fill in the details below to register as a partner with WorkmateIQ.
                        </p>
                    </div>
                )}

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
                        submitDisabled={!consent || !captchaPayload}
                        submitFullWidth={inline}
                    />
                )}
            </div>
    )

    if (inline) return open ? content : null
    return (
        <Modal open={open} onClose={onClose} title={`${roleLabel} Registration`} size="lg">
            {content}
        </Modal>
    )
}

export default RegistrationModal
