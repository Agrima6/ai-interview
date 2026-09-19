import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, Input, Button } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth.jsx'
import { forgotPassword } from '../../api/authApi'
import logo from '../../assets/logo.png'

function CandidateLoginPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [forgotMode, setForgotMode] = useState(false)
    const [forgotSent, setForgotSent] = useState(false)

    const submitForgotPassword = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await forgotPassword(email)
            setForgotSent(true)
        } catch (err) {
            setError(err.message || 'Could not send reset link.')
        } finally {
            setLoading(false)
        }
    }

    if (forgotMode) {
        return (
            <div className='min-h-screen bg-bg flex items-center justify-center px-6 py-16'>
                <Card className='w-full max-w-[420px] p-8 sm:p-10'>
                    {forgotSent ? (
                        <div className='text-center space-y-3'>
                            <CheckCircle2 size={36} className='mx-auto text-success' />
                            <h1 className='font-display text-[20px] font-bold text-ink'>Check your email</h1>
                            <p className='text-[13.5px] text-text-secondary'>If an account exists for {email}, a reset link is on its way.</p>
                            <Button variant='secondary' onClick={() => { setForgotMode(false); setForgotSent(false) }} className='w-full mt-2'>Back to sign in</Button>
                        </div>
                    ) : (
                        <>
                            <h1 className='font-display text-[20px] font-bold text-ink mb-1'>Reset your password</h1>
                            <p className='text-text-secondary text-[13.5px] mb-6'>We'll email you a link to set a new password.</p>
                            <form onSubmit={submitForgotPassword} className='space-y-4'>
                                <Input label='Email' type='email' value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                                {error && <p className='text-[13px] text-red-500'>{error}</p>}
                                <Button type='submit' size='lg' disabled={loading} className='w-full'>{loading ? 'Sending...' : 'Send reset link'}</Button>
                                <button type='button' onClick={() => setForgotMode(false)} className='block mx-auto text-[12.5px] text-text-secondary hover:text-ink transition-colors'>Back to sign in</button>
                            </form>
                        </>
                    )}
                </Card>
            </div>
        )
    }

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const user = await login(email, password)
            if (!user?.roles?.includes('CANDIDATE')) {
                setError('This login is for candidates only. Please use the organization login instead.')
                return
            }
            navigate(user.mustChangePassword ? '/candidate/change-password' : '/candidate/room')
        } catch (err) {
            setError(err.message || 'Invalid email or password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='min-h-screen bg-bg flex items-center justify-center px-6 py-16'>
            <Card className='w-full max-w-[420px] p-8 sm:p-10'>
                <div className='flex items-center gap-2.5 mb-6'>
                    <img src={logo} alt='' className='w-8 h-8 rounded-lg' />
                    <span className='font-display text-[16px] font-bold text-ink'>WorkmateIQ</span>
                </div>
                <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Candidate sign in</h1>
                <p className='text-text-secondary text-[13.5px] mb-7'>
                    Use the login details from your application confirmation email.
                </p>

                <form onSubmit={submit} className='space-y-4'>
                    <Input label='Email' type='email' value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                    <Input label='Password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} required />
                    {error && (
                        <p className='text-[13px] text-red-500 flex items-center gap-1.5'>
                            <AlertCircle size={14} /> {error}
                        </p>
                    )}
                    <Button type='submit' size='lg' disabled={loading} className='w-full'>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    <button type='button' onClick={() => setForgotMode(true)} className='block mx-auto text-[12.5px] text-text-secondary hover:text-ink transition-colors'>
                        Forgot your password?
                    </button>
                </form>
            </Card>
        </div>
    )
}

export default CandidateLoginPage
