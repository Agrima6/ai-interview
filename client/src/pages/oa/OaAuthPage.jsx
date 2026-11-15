import React, { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, Mail, Phone, ShieldCheck, User } from 'lucide-react'
import { oaApi, oaTokens } from '../../api/oaApi'
import AuthLayout from '../../components/auth/AuthLayout'
import AuthCard from '../../components/auth/AuthCard'
import AuthInput from '../../components/auth/AuthInput'
import AuthPasswordInput from '../../components/auth/AuthPasswordInput'
import AuthButton from '../../components/auth/AuthButton'
import { LIMITS, emailError, lengthError, nameError, phoneError, settlePhone, tidyPhone } from '../../components/oa/oaRules'
import logo from '../../assets/landing/logo.webp'

const MESSAGES = {
    expired: 'Your session has expired. Please sign in again.',
    inactive: 'This account is not active. Please contact support.',
}

// Sign in / register for people who RUN online assessments. Separate from the platform login: the same email can
// also be an organization, a college or a candidate. A new account waits for a super admin's approval.
export default function OaAuthPage({ mode = 'login' }) {
    const navigate = useNavigate()
    const params = new URLSearchParams(useLocation().search)
    const notice = params.get('expired') ? MESSAGES.expired : params.get('inactive') ? MESSAGES.inactive : ''
    const [form, setForm] = useState({ orgName: '', contactName: '', email: '', phone: '', purpose: '', password: '' })
    const [fields, setFields] = useState({})
    const [error, setError] = useState(notice)
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const isRegister = mode === 'register'

    if (oaTokens.get('admin') && !isRegister) return <Navigate to='/oa/admin' replace />

    const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setFields((f) => ({ ...f, [key]: undefined })) }

    // Checked here first so the person sees every problem at once; the server checks again.
    const check = () => {
        const e = { email: emailError(form.email) }
        if (isRegister) {
            e.orgName = lengthError(form.orgName, { ...LIMITS.orgName, label: 'Organization name' })
            e.contactName = nameError(form.contactName, { ...LIMITS.personName, label: 'Your name' })
            e.phone = phoneError(form.phone)
            e.password = form.password.length < 8 ? 'Use at least 8 characters.' : form.password.length > 128 ? 'Use at most 128 characters.' : !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password) ? 'Include at least one letter and one number.' : ''
        } else if (!form.password) e.password = 'Enter your password.'
        return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
    }

    const submit = async (e) => {
        e.preventDefault()
        if (loading) return
        const problems = check()
        if (Object.keys(problems).length) { setFields(problems); setError(Object.values(problems)[0]); return }
        setError(''); setFields({}); setLoading(true)
        try {
            if (isRegister) {
                await oaApi.register({ ...form, email: form.email.trim() })
                setSubmitted(true)
            } else {
                await oaApi.login({ email: form.email.trim(), password: form.password })
                navigate('/oa/admin', { replace: true })
            }
        } catch (err) {
            setError(err.message)
            if (err.fields) setFields(err.fields)
        } finally { setLoading(false) }
    }

    return (
        <AuthLayout>
            <header className='border-b border-[#F3E8EB]'>
                <div className='max-w-[1100px] mx-auto px-5 h-16 flex items-center justify-between'>
                    <Link to='/' className='flex items-center gap-2.5 text-[#1F1417] no-underline'>
                        <img src={logo} alt='' className='w-9 h-9 rounded-full' />
                        <span className='text-[19px] font-medium tracking-tight'>WorkmateIQ</span>
                        <span className='hidden sm:inline text-[12px] font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full'>Online Assessment</span>
                    </Link>
                    <Link to='/oa/exam' className='text-[14px] font-medium text-accent hover:underline'>I'm taking a test →</Link>
                </div>
            </header>

            <main className='oa-mesh flex-1 flex items-center justify-center px-4 py-10'>
                {submitted ? (
                    <AuthCard className='text-center'>
                        <CheckCircle2 size={44} className='mx-auto text-[var(--color-success)] mb-4' />
                        <h1 className='font-display text-[24px] font-bold mb-2'>Registration submitted</h1>
                        <p className='text-[14.5px] text-gray-600 leading-relaxed mb-6'>
                            Our team will review <b>{form.orgName}</b> and email <b>{form.email}</b> once you are approved. You can sign in after that, using the password you just chose.
                        </p>
                        <Link to='/oa/login' className='text-accent font-medium text-[14.5px] hover:underline'>Back to sign in</Link>
                    </AuthCard>
                ) : (
                    <AuthCard className={`oa-rise ${isRegister ? '!max-w-[520px]' : ''}`}>
                        <div className='flex items-center gap-2 text-accent text-[12.5px] font-semibold mb-3'><ShieldCheck size={15} /> Secure assessments with live proctoring</div>
                        <h1 className='font-display text-[26px] font-bold text-[#1a1215] mb-1'>{isRegister ? 'Register to run assessments' : 'Sign in to Online Assessment'}</h1>
                        <p className='text-[14px] text-gray-500 mb-6'>
                            {isRegister ? 'Tell us who you are. A WorkmateIQ admin approves every new account.' : 'For organizers who create and schedule tests.'}
                        </p>

                        {error && <div role='alert' className='mb-4 text-[13.5px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-4 py-3'>{error}</div>}

                        <form onSubmit={submit} className='space-y-4' noValidate>
                            {isRegister && (
                                <>
                                    <AuthInput id='orgName' label='Organization, college or company' icon={Building2} value={form.orgName} onChange={set('orgName')} error={fields.orgName} autoComplete='organization' maxLength={LIMITS.orgName.max} required />
                                    <div className='grid sm:grid-cols-2 gap-4'>
                                        <AuthInput id='contactName' label='Your name' icon={User} value={form.contactName} onChange={set('contactName')} error={fields.contactName} autoComplete='name' maxLength={LIMITS.personName.max} required />
                                        <AuthInput id='phone' type='tel' inputMode='tel' label='Mobile (optional)' icon={Phone} value={form.phone} onChange={(e) => { setForm((f) => ({ ...f, phone: tidyPhone(e.target.value) })); setFields((f) => ({ ...f, phone: undefined })) }} error={fields.phone} hint='10 digits' autoComplete='tel-national' maxLength={18} onBlur={() => setForm((f) => ({ ...f, phone: settlePhone(f.phone) }))} />
                                    </div>
                                </>
                            )}
                            <AuthInput id='email' type='email' label='Work email' icon={Mail} value={form.email} onChange={set('email')} error={fields.email} autoComplete='email' maxLength={200} required />
                            <AuthPasswordInput id='password' label='Password' value={form.password} onChange={set('password')} error={fields.password} hint={isRegister ? 'At least 8 characters, with a letter and a number.' : undefined} autoComplete={isRegister ? 'new-password' : 'current-password'} required />
                            {isRegister && (
                                <div>
                                    <label htmlFor='purpose' className='block text-[14px] font-medium text-ink mb-2'>What will you use it for? <span className='text-gray-400 font-normal'>(optional)</span></label>
                                    <textarea id='purpose' rows={2} maxLength={LIMITS.purpose.max} value={form.purpose} onChange={set('purpose')} placeholder='e.g. campus hiring tests for 500 students'
                                        className='w-full bg-white border border-[#D9C4C9] rounded-[14px] py-3 px-4 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10' />
                                </div>
                            )}
                            <AuthButton loading={loading}>{isRegister ? 'Submit for approval' : 'Sign in'}</AuthButton>
                        </form>

                        <p className='text-[14px] text-gray-500 text-center mt-6'>
                            {isRegister ? <>Already approved? <Link to='/oa/login' className='text-accent font-medium hover:underline'>Sign in</Link></>
                                : <>New here? <Link to='/oa/register' className='text-accent font-medium hover:underline'>Register your organization</Link></>}
                        </p>
                    </AuthCard>
                )}
            </main>
        </AuthLayout>
    )
}
