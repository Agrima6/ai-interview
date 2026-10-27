import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button } from '../../components/ui'
import { CheckCircle2, Mail, MessageCircle, ArrowLeft, Home, FileEdit } from 'lucide-react'
import DynamicForm from '../../components/forms/DynamicForm'
import { getRegistrationForm } from '../../api/formsApi'
import { submitRegistration } from '../../api/registrationsApi'
import CaptchaField from '../../components/auth/CaptchaField'
import AmbientBackground from '../workmate/AmbientBackground'
import logo from '../../assets/logo.png'

const STATUS_LABEL = { QUEUED: 'Queued', SENT: 'Sent', MOCK_SENT: 'Sent (test mode)', FAILED: 'Failed', DELIVERED: 'Delivered' }

function RegisterForm() {
    const { type } = useParams()
    const navigate = useNavigate()
    const [schema, setSchema] = useState(null)
    const [captchaPayload, setCaptchaPayload] = useState(null)
    const [captchaReset, setCaptchaReset] = useState(0)
    const [consent, setConsent] = useState(false)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState(null)

    // Guarded against races: if `type` changes again before this resolves,
    // a slower stale response must not overwrite the newer one.
    useEffect(() => {
        let cancelled = false
        getRegistrationForm(type)
            .then((formRes) => { if (!cancelled) setSchema(formRes) })
            .catch((err) => { if (!cancelled) setError(err.message) })
        return () => { cancelled = true }
    }, [type])

    const onSubmit = async (data) => {
        if (!consent) { setError('Please accept the consent checkbox.'); return }
        if (!captchaPayload) { setError('Please complete the verification.'); return }
        setError('')
        setSubmitting(true)
        try {
            const res = await submitRegistration({
                type: type.toUpperCase(),
                data,
                consent: true,
                ...captchaPayload,
            })
            setResult(res)
        } catch (err) {
            setError(err.message || 'Something went wrong, please try again.')
            // A challenge is single-use: whatever went wrong, the next attempt needs a fresh one.
            setCaptchaReset((n) => n + 1)
        } finally {
            setSubmitting(false)
        }
    }

    if (result) {
        return (
            <div className='min-h-screen bg-bg relative overflow-hidden flex items-center justify-center px-6 py-16'>
                <AmbientBackground />
                <img src={logo} alt='' aria-hidden='true' className='pointer-events-none select-none absolute -right-24 -bottom-24 w-[520px] h-[520px] opacity-[0.05] rotate-[-8deg]' />
                <Card className='w-full max-w-[480px] p-8 sm:p-10 text-center relative backdrop-blur-sm bg-card/95 overflow-hidden'>
                    <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/60 via-green-500 to-green-500/60' />
                    <div className='relative w-16 h-16 mx-auto mb-5'>
                        <div className='absolute inset-0 bg-green-500/15 blur-lg rounded-full' />
                        <div className='relative w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center'>
                            <CheckCircle2 size={32} className='text-green-600' />
                        </div>
                    </div>
                    <h1 className='font-display text-[22px] font-bold text-ink mb-2'>Registration received</h1>
                    <p className='text-text-secondary text-[14px] mb-6'>We've sent your onboarding link. Check the delivery status below.</p>
                    <div className='space-y-2 text-left bg-bg border border-line rounded-xl p-4 mb-6'>
                        <div className='flex items-center gap-2 text-[13.5px] text-ink'><Mail size={14} className='text-accent' /> Email — {STATUS_LABEL[result.communications.email] || result.communications.email}</div>
                        <div className='flex items-center gap-2 text-[13.5px] text-ink'><MessageCircle size={14} className='text-accent' /> WhatsApp — {STATUS_LABEL[result.communications.whatsapp] || result.communications.whatsapp}</div>
                    </div>
                    {result.debugOnboardingUrl && (
                        <a href={result.debugOnboardingUrl} className='block mb-3'>
                            <Button className='w-full'>Open onboarding link (local dev)</Button>
                        </a>
                    )}
                    <button
                        onClick={() => navigate('/')}
                        className='flex items-center justify-center gap-1.5 text-[13.5px] font-medium text-text-secondary hover:text-ink transition-colors mx-auto'
                    >
                        <Home size={15} /> Back to home
                    </button>
                </Card>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-bg relative overflow-hidden px-6 py-16'>
            <AmbientBackground />
            <img src={logo} alt='' aria-hidden='true' className='pointer-events-none select-none absolute -right-24 -bottom-24 w-[520px] h-[520px] opacity-[0.05] rotate-[-8deg]' />

            <div className='absolute top-6 left-6 right-6 flex items-center justify-between'>
                <button
                    onClick={() => navigate('/platform/register')}
                    className='flex items-center gap-1.5 text-[13.5px] font-medium text-text-secondary hover:text-ink transition-colors'
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <button
                    onClick={() => navigate('/')}
                    className='flex items-center gap-1.5 text-[13.5px] font-medium text-text-secondary hover:text-ink transition-colors'
                >
                    <Home size={16} /> Home
                </button>
            </div>

            <div className='max-w-[720px] mx-auto relative'>
                <div className='flex flex-col items-center mb-8'>
                    <div className='relative mb-4'>
                        <div className='absolute inset-0 bg-accent/20 blur-xl rounded-full' />
                        <img src={logo} alt='' className='relative w-14 h-14 rounded-full shadow-[var(--shadow-soft)] border-2 border-card' />
                    </div>
                    <span className='font-display text-[15px] font-bold text-ink tracking-tight mb-4'>WorkmateIQ</span>

                    <div className='inline-flex items-center gap-2 bg-accent/10 text-accent rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold mb-4'>
                        <FileEdit size={14} /> Registration form
                    </div>

                    <h1 className='font-display text-[28px] sm:text-[32px] font-bold text-ink mb-2 text-center'>{schema?.type ? `${schema.type.charAt(0)}${schema.type.slice(1).toLowerCase()} registration` : 'Registration'}</h1>
                    <p className='text-text-secondary text-[14px] text-center'>Fields marked with <span className='text-red-500'>*</span> are required.</p>
                </div>

                {error && (
                    <div className='mb-5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center'>
                        <p className='text-[13.5px] text-red-500 font-medium'>{error}</p>
                    </div>
                )}

                {!schema ? (
                    <Card className='p-8 h-[300px] animate-pulse' />
                ) : (
                    <Card className='p-8 sm:p-10 backdrop-blur-sm bg-card/95 relative overflow-hidden'>
                        <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/60 via-accent to-accent/60' />
                        <DynamicForm
                            schema={schema}
                            onSubmit={onSubmit}
                            submitting={submitting}
                            submitLabel='Submit registration'
                            extraFooter={
                                <div className='space-y-5 border-t border-line pt-6'>
                                    <CaptchaField onChange={setCaptchaPayload} resetKey={captchaReset} inputId='register-captcha' />
                                    <label className='flex items-start gap-2 text-[13.5px] text-text-secondary'>
                                        <input type='checkbox' checked={consent} onChange={(e) => setConsent(e.target.checked)} className='mt-0.5' />
                                        I agree to be contacted by WorkmateIQ about this registration.
                                    </label>
                                </div>
                            }
                        />
                    </Card>
                )}
            </div>
        </div>
    )
}

export default RegisterForm
