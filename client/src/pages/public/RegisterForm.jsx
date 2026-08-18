import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button } from '../../components/ui'
import { CheckCircle2, Mail, MessageCircle, ArrowLeft } from 'lucide-react'
import DynamicForm from '../../components/forms/DynamicForm'
import { getRegistrationForm } from '../../api/formsApi'
import { getCaptcha, submitRegistration } from '../../api/registrationsApi'
import logo from '../../assets/logo.png'

const STATUS_LABEL = { QUEUED: 'Queued', SENT: 'Sent', MOCK_SENT: 'Sent (test mode)', FAILED: 'Failed', DELIVERED: 'Delivered' }
const TYPE_LABELS = { ORGANIZATION: 'Organization', COLLEGE: 'College', CANDIDATE: 'Candidate' }

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
            <div className='min-h-screen bg-gradient-to-br from-bg via-bg to-bg flex items-center justify-center px-6 py-16'>
                <Card className='w-full max-w-[520px] p-10 text-center'>
                    <div className='w-16 h-16 rounded-full bg-gradient-brand/10 flex items-center justify-center mx-auto mb-6'>
                        <CheckCircle2 size={32} className='text-green-600' />
                    </div>
                    <h1 className='font-display text-[28px] font-bold text-ink mb-2'>Registration received</h1>
                    <p className='text-text-secondary text-[15px] mb-8 leading-relaxed'>We've sent your onboarding link to the email address you provided. Check the delivery status below.</p>
                    
                    <div className='space-y-3 text-left bg-bg border border-line rounded-2xl p-5 mb-8'>
                        <div className='flex items-center gap-3 text-[14px] text-ink'>
                            <Mail size={16} className='text-accent flex-shrink-0' /> 
                            <div>
                                <span className='font-medium'>Email</span>
                                <span className='text-text-secondary ml-2'>— {STATUS_LABEL[result.communications.email] || result.communications.email}</span>
                            </div>
                        </div>
                        <div className='flex items-center gap-3 text-[14px] text-ink'>
                            <MessageCircle size={16} className='text-accent flex-shrink-0' /> 
                            <div>
                                <span className='font-medium'>WhatsApp</span>
                                <span className='text-text-secondary ml-2'>— {STATUS_LABEL[result.communications.whatsapp] || result.communications.whatsapp}</span>
                            </div>
                        </div>
                    </div>
                    
                    {result.debugOnboardingUrl && (
                        <a href={result.debugOnboardingUrl} className='block mb-4'>
                            <Button className='w-full'>Open onboarding link (dev)</Button>
                        </a>
                    )}
                    <Button variant='secondary' className='w-full' onClick={() => navigate('/platform/register')}>
                        Back to registration
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-bg via-bg to-bg px-6 py-12'>
            <div className='max-w-[760px] mx-auto'>
                <button
                    onClick={() => navigate('/platform/register')}
                    className='flex items-center gap-2 text-accent hover:text-accent-dark font-medium text-[14px] mb-8 transition-colors'
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <div className='mb-10'>
                    <div className='flex items-center gap-3 mb-2'>
                        <img src={logo} alt='WorkmateIQ' className='w-8 h-8 rounded-lg' />
                        <span className='font-display text-[20px] font-bold text-ink'>WorkmateIQ</span>
                    </div>
                    <h1 className='font-display text-[32px] font-bold text-ink mb-1'>{TYPE_LABELS[type?.toUpperCase()] || type} registration</h1>
                    <p className='text-text-secondary text-[15px]'>Fields marked with <span className='text-red-500 font-medium'>*</span> are required.</p>
                </div>

                {error && (
                    <div className='bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6'>
                        <p className='text-red-700 text-[14px] font-medium'>{error}</p>
                    </div>
                )}

                {!schema ? (
                    <Card className='p-12 h-[400px] bg-card/50 animate-pulse' />
                ) : (
                    <Card className='p-10 shadow-[var(--shadow-lift)]'>
                        <DynamicForm
                            schema={schema}
                            onSubmit={onSubmit}
                            submitting={submitting}
                            submitLabel='Submit registration'
                            extraFooter={
                                <div className='space-y-5 border-t border-line pt-8'>
                                    {captcha && (
                                        <div>
                                            <label className='block text-[13px] font-semibold text-ink mb-2.5'>{captcha.question}<span className='text-red-500 ml-0.5'>*</span></label>
                                            <input
                                                type='number'
                                                value={captchaAnswer}
                                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                                className='w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 transition-all'
                                                placeholder='Enter your answer'
                                            />
                                        </div>
                                    )}
                                    <label className='flex items-start gap-3 text-[14px] text-text-secondary cursor-pointer group'>
                                        <input 
                                            type='checkbox' 
                                            checked={consent} 
                                            onChange={(e) => setConsent(e.target.checked)}
                                            className='mt-1 w-4 h-4 rounded border-line accent-accent cursor-pointer'
                                        />
                                        <span>I agree to be contacted by WorkmateIQ about this registration and understand how my information will be used.</span>
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
