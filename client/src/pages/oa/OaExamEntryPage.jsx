import React, { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Mail } from 'lucide-react'
import { examApi, oaTokens } from '../../api/oaApi'
import AuthLayout from '../../components/auth/AuthLayout'
import AuthCard from '../../components/auth/AuthCard'
import AuthInput from '../../components/auth/AuthInput'
import AuthButton from '../../components/auth/AuthButton'
import DeviceDetails from '../../components/oa/DeviceDetails'
import { describeDevice, requestLocation } from '../../components/oa/exam/examMedia'
import { FILTERS } from '../../components/oa/oaRules'
import ExamBrand from '../../components/oa/ExamBrand'
import useExamBrand from '../../hooks/useExamBrand'
import usePlaceName from '../../hooks/usePlaceName'

// Where candidates enter their test. The invitation email links here with the test and their email filled in.
export default function OaExamEntryPage() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const [assessmentId, setAssessmentId] = useState(FILTERS.code(params.get('a') || '', 24).toLowerCase())
    const [email, setEmail] = useState(FILTERS.email(params.get('e') || ''))
    const brand = useExamBrand(assessmentId).data
    const [ip, setIp] = useState('')
    const [place, setPlace] = useState({ state: 'asking' })
    const [device] = useState(describeDevice)
    const here = usePlaceName(place.state === 'ok' ? place.latitude : undefined, place.state === 'ok' ? place.longitude : undefined)
    const [code, setCode] = useState('')
    const [error, setError] = useState(params.get('expired') ? 'Your session ended. Please sign in again.' : '')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        examApi.whoami().then((r) => setIp(r.ip || '')).catch(() => setIp(''))
        requestLocation().then((r) => setPlace(r.ok ? { state: 'ok', ...r } : { state: 'denied', message: r.message }))
    }, [])
    const retryLocation = () => { setPlace({ state: 'asking' }); requestLocation().then((r) => setPlace(r.ok ? { state: 'ok', ...r } : { state: 'denied', message: r.message })) }

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
                    {brand?.name ? <ExamBrand brand={brand} size={40} /> : <Link to='/' className='no-underline'><ExamBrand size={36} /></Link>}
                </div>
            </header>
            <main className='oa-mesh relative flex-1 flex items-center justify-center px-4 py-10 pb-14'>
                <AuthCard className='oa-rise'>
                    <h1 className='font-display text-[26px] font-bold text-[#1a1215] mb-1'>Enter your test</h1>
                    {brand?.name && <p className='text-[13px] font-semibold text-accent mb-1'>{brand.name}</p>}
                    <p className='text-[14px] text-gray-500 mb-6'>Use the email your invitation was sent to and the access code from it.</p>
                    <div className='mb-5 rounded-xl border border-line bg-surface-muted/70 p-3.5' aria-label='Details of this device'>
                        <p className='text-[12px] font-bold text-ink mb-2'>Your connection and device</p>
                        <DeviceDetails dense ip={ip} pending={{ ip: !ip, location: place.state === 'asking', place: here.loading }} env={{ ...device, ...(place.state === 'ok' ? { ...place, place: here.place } : {}) }} />
                        {place.state === 'denied' && <p role='status' className='text-[12.5px] text-[var(--color-warning)] mt-2'>{place.message} <button type='button' onClick={retryLocation} className='font-semibold underline'>Try again</button></p>}
                    </div>
                    {error && <div role='alert' className='mb-4 text-[13.5px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-4 py-3'>{error}</div>}
                    <form onSubmit={submit} className='space-y-4' noValidate>
                        {!params.get('a') && <AuthInput id='assessment' label='Test ID' hint='It is in the link from your invitation email.' value={assessmentId} onChange={(e) => setAssessmentId(FILTERS.code(e.target.value, 24).toLowerCase())} required />}
                        <AuthInput id='email' type='email' label='Email' icon={Mail} value={email} onChange={(e) => setEmail(FILTERS.email(e.target.value))} autoComplete='email' required />
                        <AuthInput id='code' label='Access code' icon={KeyRound} value={code} onChange={(e) => setCode(FILTERS.code(e.target.value, 16))} autoComplete='one-time-code' autoCapitalize='characters' spellCheck={false} className='tracking-[0.2em] font-mono' placeholder='XXXXXXXX' required />
                        <AuthButton loading={loading} disabled={!email || !code || !assessmentId}>Continue</AuthButton>
                    </form>
                    <p className='text-[12.5px] text-gray-500 mt-6 leading-relaxed'>Lost your code? Ask your organizer to resend your invitation. Use a laptop or desktop with a webcam, in Chrome or Edge.</p>
                </AuthCard>
                <p className='absolute bottom-3 inset-x-0 text-center text-[12px] text-gray-400 pointer-events-none'>Powered by WorkmateIQ</p>
            </main>
        </AuthLayout>
    )
}
