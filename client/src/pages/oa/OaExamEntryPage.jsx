import React, { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Mail } from 'lucide-react'
import { examApi, oaTokens } from '../../api/oaApi'
import AuthLayout from '../../components/auth/AuthLayout'
import AuthCard from '../../components/auth/AuthCard'
import AuthInput from '../../components/auth/AuthInput'
import AuthButton from '../../components/auth/AuthButton'
import logo from '../../assets/landing/logo.webp'

// Where students enter their test. The invitation email links here with the test and their email filled in.
export default function OaExamEntryPage() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const [assessmentId, setAssessmentId] = useState(params.get('a') || '')
    const [email, setEmail] = useState(params.get('e') || '')
    const [code, setCode] = useState('')
    const [error, setError] = useState(params.get('expired') ? 'Your session ended. Please sign in again.' : '')
    const [loading, setLoading] = useState(false)

    if (oaTokens.get('student') && !params.get('expired')) return <Navigate to='/oa/exam/test' replace />

    const submit = async (e) => {
        e.preventDefault()
        if (loading) return
        setError(''); setLoading(true)
        try {
            await examApi.login({ assessmentId: assessmentId.trim(), email: email.trim(), code: code.trim() })
            navigate('/oa/exam/test', { replace: true })
        } catch (err) { setError(err.message) } finally { setLoading(false) }
    }

    return (
        <AuthLayout>
            <header className='border-b border-[#F3E8EB]'>
                <div className='max-w-[1100px] mx-auto px-5 h-16 flex items-center justify-between'>
                    <Link to='/' className='flex items-center gap-2.5 text-[#1F1417] no-underline'><img src={logo} alt='' className='w-9 h-9 rounded-full' /><span className='text-[19px] font-medium tracking-tight'>WorkmateIQ</span></Link>
                    <Link to='/oa/login' className='text-[14px] font-medium text-accent hover:underline'>Organizer sign in →</Link>
                </div>
            </header>
            <main className='flex-1 flex items-center justify-center px-4 py-10'>
                <AuthCard>
                    <h1 className='font-display text-[26px] font-bold text-[#1a1215] mb-1'>Enter your test</h1>
                    <p className='text-[14px] text-gray-500 mb-6'>Use the email your invitation was sent to and the access code from it.</p>
                    {error && <div role='alert' className='mb-4 text-[13.5px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-4 py-3'>{error}</div>}
                    <form onSubmit={submit} className='space-y-4' noValidate>
                        {!params.get('a') && <AuthInput id='assessment' label='Test ID' hint='It is in the link from your invitation email.' value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} required />}
                        <AuthInput id='email' type='email' label='Email' icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete='email' required />
                        <AuthInput id='code' label='Access code' icon={KeyRound} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete='one-time-code' autoCapitalize='characters' spellCheck={false} className='tracking-[0.2em] font-mono' placeholder='XXXXXXXX' required />
                        <AuthButton loading={loading} disabled={!email || !code || !assessmentId}>Continue</AuthButton>
                    </form>
                    <p className='text-[12.5px] text-gray-500 mt-6 leading-relaxed'>Lost your code? Ask your organizer to resend your invitation. Use a laptop or desktop with a webcam, in Chrome or Edge.</p>
                </AuthCard>
            </main>
        </AuthLayout>
    )
}
