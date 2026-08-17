import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Button, Card } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth.jsx'
import logo from '../../assets/logo.png'

// Figma copy: "Welcome back / Enter your credentials to access your
// recruitment desk." This is the staff/reviewer login - distinct from the
// candidate-facing Google sign-in used elsewhere in the product.
// Dev-only default credentials, seeded by `npm run seed` in auth-service.
// Never shipped in a production build - import.meta.env.DEV is false once
// the app is actually built, not just "not localhost".
const DEV_ADMIN = { email: 'admin@workmateiq.local', password: 'Agrima123' }

function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState(import.meta.env.DEV ? DEV_ADMIN.email : '')
    const [password, setPassword] = useState(import.meta.env.DEV ? DEV_ADMIN.password : '')
    const [remember, setRemember] = useState(true)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const doLogin = async (creds) => {
        setError('')
        setLoading(true)
        try {
            await login(creds.email, creds.password)
            navigate('/platform/dashboard')
        } catch (err) {
            setError(err.message || 'Invalid email or password.')
        } finally {
            setLoading(false)
        }
    }

    const submit = (e) => {
        e.preventDefault()
        doLogin({ email, password })
    }

    return (
        <div className='min-h-screen bg-bg flex items-center justify-center px-6 py-16'>
            <Card className='w-full max-w-[420px] p-8 sm:p-10'>
                <div className='flex items-center gap-2.5 mb-8'>
                    <img src={logo} alt='' className='w-9 h-9 rounded-full' />
                    <span className='font-display text-[16px] font-bold text-ink'>Workmate.IQ</span>
                </div>

                <h1 className='font-display text-[26px] font-bold text-ink mb-2'>Welcome back</h1>
                <p className='text-text-secondary text-[14px] mb-8'>Enter your credentials to access your recruitment desk.</p>

                <form onSubmit={submit} className='space-y-4'>
                    <Input label='Email address' type='email' placeholder='you@company.com' value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <div>
                        <Input label='Password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <button type='button' className='text-[12.5px] text-accent hover:underline mt-1.5'>Forgot password?</button>
                    </div>
                    <label className='flex items-center gap-2 text-[13.5px] text-text-secondary'>
                        <input type='checkbox' checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                        Remember me on this browser
                    </label>
                    {error && <p className='text-[13px] text-red-500'>{error}</p>}
                    <Button type='submit' size='lg' disabled={loading} className='w-full'>{loading ? 'Signing in...' : 'Sign In'}</Button>
                </form>

                {import.meta.env.DEV && (
                    <Button
                        variant='secondary'
                        size='sm'
                        disabled={loading}
                        onClick={() => doLogin(DEV_ADMIN)}
                        className='w-full mt-3'
                    >
                        Continue as Super Admin (dev)
                    </Button>
                )}

                <div className='flex items-center gap-3 my-6'>
                    <div className='flex-1 h-px bg-line' />
                    <span className='text-[11px] tracking-wide text-text-secondary uppercase'>Or continue with</span>
                    <div className='flex-1 h-px bg-line' />
                </div>
                <div className='grid grid-cols-2 gap-3'>
                    <Button variant='secondary' className='w-full'>Google</Button>
                    <Button variant='secondary' className='w-full'>Microsoft</Button>
                </div>

                <p className='text-[13.5px] text-text-secondary text-center mt-8'>
                    New to Workmate.IQ? <a href='/platform/register' className='text-accent font-medium hover:underline'>Create an account</a>
                </p>
            </Card>
        </div>
    )
}

export default Login
