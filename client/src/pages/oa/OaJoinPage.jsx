import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Hash, Mail, Phone, ShieldCheck, User } from 'lucide-react'
import { joinApi } from '../../api/oaApi'
import AuthLayout from '../../components/auth/AuthLayout'
import AuthCard from '../../components/auth/AuthCard'
import AuthInput from '../../components/auth/AuthInput'
import AuthButton from '../../components/auth/AuthButton'
import ExamBrand from '../../components/oa/ExamBrand'
import { FILTERS, LIMITS, emailError, nameError, phoneError, settlePhone, tidyPhone } from '../../components/oa/oaRules'

/**
 * The open registration page a candidate reaches from the link an organizer shared. They enter their details and wait:
 * nothing is emailed and they cannot sit the test until the organizer approves them.
 */
export default function OaJoinPage() {
    const { token } = useParams()
    const info = useQuery({ queryKey: ['oa-join', token], queryFn: () => joinApi.info(token), retry: false })
    const [form, setForm] = useState({ name: '', email: '', phone: '', rollNumber: '', website: '' })
    const [fields, setFields] = useState({})
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const clean = { name: (v) => FILTERS.personName(v, LIMITS.studentName.max), email: FILTERS.email, phone: tidyPhone, rollNumber: FILTERS.rollNumber }
    const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: clean[key] ? clean[key](e.target.value) : e.target.value })); setFields((f) => ({ ...f, [key]: undefined })); setError('') }

    const submit = async (e) => {
        e.preventDefault()
        if (loading) return
        const problems = {
            name: nameError(form.name, { label: 'Your name' }), email: emailError(form.email), phone: phoneError(form.phone),
        }
        const first = Object.values(problems).find(Boolean)
        if (first) { setFields(Object.fromEntries(Object.entries(problems).filter(([, v]) => v))); setError(first); return }
        setError(''); setLoading(true)
        try {
            await joinApi.register(token, { ...form, name: form.name.trim(), email: form.email.trim(), phone: settlePhone(form.phone) })
            setDone(true)
        } catch (err) { setError(err.message); if (err.fields) setFields(err.fields) } finally { setLoading(false) }
    }

    const data = info.data
    const heading = data?.roundLabel ? `${data.title} · Round ${data.round} (${data.roundLabel})` : data?.title

    return (
        <AuthLayout>
            <header className='border-b border-[#F3E8EB]'>
                <div className='max-w-[1100px] mx-auto px-5 h-16 flex items-center'><ExamBrand brand={data?.brand} size={40} /></div>
            </header>
            <main className='oa-mesh relative flex-1 flex items-center justify-center px-4 py-10 pb-14'>
                <AuthCard className='oa-rise'>
                    {info.isLoading && <p role='status' className='text-[14px] text-gray-500'>Opening the registration page…</p>}
                    {info.isError && (
                        <div role='alert'>
                            <h1 className='font-display text-[24px] font-bold text-[#1a1215] mb-2'>This link does not work</h1>
                            <p className='text-[14px] text-gray-500'>{info.error.message}</p>
                        </div>
                    )}
                    {data && !data.open && (
                        <div role='status'>
                            <h1 className='font-display text-[24px] font-bold text-[#1a1215] mb-2'>Registration is not open</h1>
                            <p className='text-[14px] text-gray-500'>{data.reason}</p>
                        </div>
                    )}
                    {data?.open && done && (
                        <div role='status' className='text-center py-2'>
                            <CheckCircle2 size={44} className='mx-auto text-[var(--color-success)] mb-3' aria-hidden='true' />
                            <h1 className='font-display text-[24px] font-bold text-[#1a1215] mb-2'>You are registered</h1>
                            <p className='text-[14px] text-gray-500 leading-relaxed'>Your details were sent to {data.brand?.name || 'the organizer'}. Once they approve your registration, you will get an email with your access code and the link to take the test. Check your spam folder too.</p>
                        </div>
                    )}
                    {data?.open && !done && (
                        <>
                            <h1 className='font-display text-[26px] font-bold text-[#1a1215] mb-1'>Register for the test</h1>
                            {heading && <p className='text-[13.5px] font-semibold text-accent mb-1 break-words'>{heading}</p>}
                            <p className='text-[14px] text-gray-500 mb-5'>Enter your details. {data.brand?.name || 'The organizer'} will review them and email you if you are approved.</p>
                            {error && <div role='alert' className='mb-4 text-[13.5px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-4 py-3'>{error}</div>}
                            <form onSubmit={submit} className='space-y-4' noValidate>
                                <AuthInput id='name' label='Full name' icon={User} value={form.name} onChange={set('name')} error={fields.name} autoComplete='name' maxLength={LIMITS.studentName.max} required />
                                <AuthInput id='email' type='email' label='Email' icon={Mail} value={form.email} onChange={set('email')} error={fields.email} autoComplete='email' maxLength={200} hint='Your access code is sent here once you are approved.' required />
                                <AuthInput id='phone' type='tel' inputMode='numeric' label='Mobile (optional)' icon={Phone} value={form.phone} onChange={set('phone')} error={fields.phone} hint='10 digits' autoComplete='tel-national' maxLength={10} />
                                <AuthInput id='roll' label='Roll number or employee ID (optional)' icon={Hash} value={form.rollNumber} onChange={set('rollNumber')} error={fields.rollNumber} maxLength={LIMITS.rollNumber.max} />
                                {/* A field real people never see or fill in; bots do. */}
                                <div aria-hidden='true' style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                                    <label>Website<input tabIndex={-1} autoComplete='off' value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></label>
                                </div>
                                <AuthButton loading={loading} disabled={!form.name || !form.email}>Register</AuthButton>
                            </form>
                            <p className='text-[12px] text-gray-500 mt-5 flex items-start gap-2'><ShieldCheck size={14} className='mt-0.5 shrink-0' aria-hidden='true' /> Registering does not start the test. You can only sit it after you are approved.</p>
                        </>
                    )}
                </AuthCard>
                <p className='absolute bottom-3 inset-x-0 text-center text-[12px] text-gray-400 pointer-events-none'>Powered by WorkmateIQ</p>
            </main>
        </AuthLayout>
    )
}
