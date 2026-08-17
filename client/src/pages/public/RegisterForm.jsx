import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button } from '../../components/ui'
import { CheckCircle2, Mail, MessageCircle } from 'lucide-react'
import DynamicForm from '../../components/forms/DynamicForm'
import { getRegistrationForm } from '../../api/formsApi'
import { getCaptcha, submitRegistration } from '../../api/registrationsApi'

const STATUS_LABEL = { QUEUED: 'Queued', SENT: 'Sent', MOCK_SENT: 'Sent (test mode)', FAILED: 'Failed', DELIVERED: 'Delivered' }

function RegisterForm() {
    const { type } = useParams()
    const navigate = useNavigate()
    const [schema, setSchema] = useState(null)
    const [captcha, setCaptcha] = useState(null)
    const [captchaAnswer, setCaptchaAnswer] = useState('')
    const [consent, setConsent] = useState(false)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState(null)

    useEffect(() => {
        Promise.all([getRegistrationForm(type), getCaptcha()])
            .then(([formRes, captchaRes]) => { setSchema(formRes); setCaptcha(captchaRes) })
            .catch((err) => setError(err.message))
    }, [type])

    const onSubmit = async (data) => {
        if (!consent) { setError('Please accept the consent checkbox.'); return }
        setError('')
        setSubmitting(true)
        try {
            const res = await submitRegistration({
                type: type.toUpperCase(),
                data,
                consent: true,
                captchaToken: captcha.challengeToken,
                captchaAnswer: Number(captchaAnswer),
            })
            setResult(res)
        } catch (err) {
            setError(err.message || 'Something went wrong, please try again.')
            if (err.code?.startsWith('CAPTCHA')) getCaptcha().then(setCaptcha)
        } finally {
            setSubmitting(false)
        }
    }

    if (result) {
        return (
            <div className='min-h-screen bg-bg flex items-center justify-center px-6 py-16'>
                <Card className='w-full max-w-[480px] p-8 text-center'>
                    <CheckCircle2 size={40} className='text-green-600 mx-auto mb-4' />
                    <h1 className='font-display text-[22px] font-bold text-ink mb-2'>Registration received</h1>
                    <p className='text-text-secondary text-[14px] mb-6'>We've sent your onboarding link. Check the delivery status below.</p>
                    <div className='space-y-2 text-left bg-bg border border-line rounded-xl p-4 mb-6'>
                        <div className='flex items-center gap-2 text-[13.5px] text-ink'><Mail size={14} className='text-accent' /> Email — {STATUS_LABEL[result.communications.email] || result.communications.email}</div>
                        <div className='flex items-center gap-2 text-[13.5px] text-ink'><MessageCircle size={14} className='text-accent' /> WhatsApp — {STATUS_LABEL[result.communications.whatsapp] || result.communications.whatsapp}</div>
                    </div>
                    {result.debugOnboardingUrl && (
                        <a href={result.debugOnboardingUrl} className='block'>
                            <Button className='w-full'>Open onboarding link (local dev)</Button>
                        </a>
                    )}
                </Card>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-bg px-6 py-16'>
            <div className='max-w-[720px] mx-auto'>
                <h1 className='font-display text-[26px] font-bold text-ink mb-1'>{schema?.type ? `${schema.type.charAt(0)}${schema.type.slice(1).toLowerCase()} registration` : 'Registration'}</h1>
                <p className='text-text-secondary text-[14px] mb-8'>Fields marked with <span className='text-red-500'>*</span> are required.</p>

                {error && <p className='text-[13.5px] text-red-500 mb-4'>{error}</p>}

                {!schema ? (
                    <Card className='p-8 h-[300px] animate-pulse' />
                ) : (
                    <Card className='p-8'>
                        <DynamicForm
                            schema={schema}
                            onSubmit={onSubmit}
                            submitting={submitting}
                            submitLabel='Submit registration'
                            extraFooter={
                                <div className='space-y-4 border-t border-line pt-6'>
                                    {captcha && (
                                        <div>
                                            <label className='block text-[13px] font-medium text-ink mb-1.5'>{captcha.question}<span className='text-red-500 ml-0.5'>*</span></label>
                                            <input
                                                type='number'
                                                value={captchaAnswer}
                                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                                className='w-full bg-card border border-line rounded-xl px-4 py-2.5 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                                                placeholder='Your answer'
                                            />
                                        </div>
                                    )}
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
