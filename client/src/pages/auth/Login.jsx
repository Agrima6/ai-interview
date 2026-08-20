import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { Input, Button, Card } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth.jsx'
import { auth, googleProvider } from '../../firebase'
import logo from '../../assets/logo.png'

// Single login for both staff/admin and approved organizations/colleges -
// one form, no separate "Admin Login" / "Client Login" split. The backend
// tells us which kind of account it is (tenantId set = a client account),
// so we route to the right dashboard after a successful sign-in instead of
// making the user pick a login type up front.
function Login() {
    const navigate = useNavigate()
    const { login, loginWithGoogle } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const afterLogin = (user) => {
        if (user.tenantId) {
            navigate(user.mustChangePassword ? '/platform/client/change-password' : '/platform/client/dashboard')
        } else {
            navigate('/platform/dashboard')
        }
    }

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const user = await login(email, password)
            afterLogin(user)
        } catch (err) {
            setError(err.message || 'Invalid email or password.')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogle = async () => {
        setError('')
        setLoading(true)
        try {
            const result = await signInWithPopup(auth, googleProvider)
            const idToken = await result.user.getIdToken()
            const user = await loginWithGoogle(idToken)
            afterLogin(user)
        } catch (err) {
            setError(err.message || 'Google sign-in failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='min-h-screen bg-bg flex items-center justify-center px-6 py-16'>
            <Card className='w-full max-w-[420px] p-8 sm:p-10'>
                <div className='flex items-center gap-2.5 mb-8'>
                    <img src={logo} alt='' className='w-9 h-9 rounded-full' />
                    <span className='font-display text-[16px] font-bold text-ink'>WorkmateIQ</span>
                </div>

                <h1 className='font-display text-[26px] font-bold text-ink mb-2'>Log in</h1>
                <p className='text-text-secondary text-[14px] mb-8'>Enter your credentials to continue.</p>

                <form onSubmit={submit} className='space-y-4'>
                    <Input label='Email address' type='email' placeholder='you@company.com' value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <Input label='Password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} required />
                    {error && <p className='text-[13px] text-red-500'>{error}</p>}
                    <Button type='submit' size='lg' disabled={loading} className='w-full'>{loading ? 'Signing in...' : 'Log in'}</Button>
                </form>

                <div className='flex items-center gap-3 my-5'>
                    <div className='h-px bg-line flex-1' />
                    <span className='text-[12px] text-text-secondary'>or</span>
                    <div className='h-px bg-line flex-1' />
                </div>

                <Button variant='secondary' size='lg' disabled={loading} onClick={handleGoogle} className='w-full'>
                    Continue with Google
                </Button>
            </Card>
        </div>
    )
}

export default Login
