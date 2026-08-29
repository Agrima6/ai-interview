import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { forgotPassword } from '../../api/authApi'
import AuthLayout from '../../components/auth/AuthLayout'
import AuthHeader from '../../components/auth/AuthHeader'
import AuthBrandPanel from '../../components/auth/AuthBrandPanel'
import AuthCard from '../../components/auth/AuthCard'
import AuthInput from '../../components/auth/AuthInput'
import AuthPasswordInput from '../../components/auth/AuthPasswordInput'
import AuthButton from '../../components/auth/AuthButton'
import RoleSelector from '../../components/auth/RoleSelector'
import RegistrationModal from '../../components/auth/RegistrationModal'
import logo from '../../assets/logo.png'

const DEV_ADMIN = { email: 'admin@workmateiq.local', password: 'Agrima123' }
const STATUS_LABEL = { QUEUED: 'Queued', SENT: 'Sent', MOCK_SENT: 'Sent (test mode)', FAILED: 'Failed', DELIVERED: 'Delivered' }
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@workmateiq.com'

function AuthPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { type } = useParams()
    const { login } = useAuth()

    // Determine initial mode (login or register) from path
    const isRegisterPath = location.pathname.includes('/register')
    const [authMode, setAuthMode] = useState(isRegisterPath ? 'register' : 'login')

    // Local states
    const [email, setEmail] = useState(import.meta.env.DEV ? DEV_ADMIN.email : '')
    const [password, setPassword] = useState(import.meta.env.DEV ? DEV_ADMIN.password : '')
    const [remember, setRemember] = useState(true)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Role Selection / Registration States
    const [selectedRole, setSelectedRole] = useState(null)
    const [registrationModalOpen, setRegistrationModalOpen] = useState(false)
    const [registrationSuccessData, setRegistrationSuccessData] = useState(null)

    // Forgot Password States
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
    const [forgotPasswordStep, setForgotPasswordStep] = useState('input') // input | success

    // Update mode if URL path changes
    useEffect(() => {
        const nextMode = location.pathname.includes('/register') ? 'register' : 'login'
        setAuthMode(nextMode)
        setError('')
    }, [location.pathname])

    // A failed token refresh anywhere in the app hard-redirects here with
    // this flag (see api/client.js) - show why the user landed back on the
    // login screen instead of leaving it unexplained.
    useEffect(() => {
        if (new URLSearchParams(location.search).get('sessionExpired') === '1') {
            setError('Your session has expired. Please sign in again.')
        }
    }, [])

    // Handle routing with type param (e.g. /platform/register/candidate)
    useEffect(() => {
        if (type) {
            const upperRole = type.toUpperCase()
            if (['ORGANIZATION', 'COLLEGE', 'CANDIDATE'].includes(upperRole)) {
                setSelectedRole(upperRole)
                setRegistrationModalOpen(true)
            }
        }
    }, [type])

    // Switch mode manually (via header / footer links)
    const handleSwitchMode = (mode) => {
        setAuthMode(mode)
        setError('')
        setRegistrationSuccessData(null)
        setForgotPasswordStep('input')
        setSelectedRole(null)
        if (mode === 'login') {
            navigate('/platform/login')
        } else if (mode === 'register') {
            navigate('/platform/register')
        }
    }

    // Login Form Submit handler
    const handleLoginSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await login(email, password)
            navigate('/platform/dashboard')
        } catch (err) {
            setError(err.message || 'Invalid email or password.')
        } finally {
            setLoading(false)
        }
    }

    // Dev login shortcut
    const handleDevLogin = async () => {
        setError('')
        setLoading(true)
        try {
            await login(DEV_ADMIN.email, DEV_ADMIN.password)
            navigate('/platform/dashboard')
        } catch (err) {
            setError(err.message || 'Super Admin login failed.')
        } finally {
            setLoading(false)
        }
    }

    // Forgot Password Submit handler
    const handleForgotPasswordSubmit = async (e) => {
        e.preventDefault()
        if (!forgotPasswordEmail) return
        setError('')
        setLoading(true)
        try {
            await forgotPassword(forgotPasswordEmail)
            // Same success state regardless of whether the email matched an
            // account - the backend never reveals that either, on purpose.
            setForgotPasswordStep('success')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Handle successful registration response from modal
    const handleRegistrationSuccess = (data) => {
        setRegistrationModalOpen(false)
        setRegistrationSuccessData(data)
    }

    return (
        <AuthLayout>
            <AuthHeader currentMode={authMode} onSwitchMode={handleSwitchMode} />

            {/* Split layout container */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">
                {/* Left side brand panel (hidden on mobile) */}
                <AuthBrandPanel mode={authMode} />

                {/* Right side form container */}
                <div className="flex-1 bg-white flex items-center justify-center p-6 md:p-12">
                    {/* Render registration success page if set */}
                    {registrationSuccessData ? (
                        <AuthCard className="text-center animate-in fade-in duration-300">
                            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={32} className="text-green-600" />
                            </div>
                            <h2 className="font-display text-[22px] font-bold text-ink mb-2">Thank You!</h2>
                            <p className="text-ink text-[14.5px] font-medium mb-1 leading-relaxed">
                                We've received your registration successfully.
                            </p>
                            <p className="text-text-secondary text-[14px] mb-6 leading-relaxed">
                                We've sent your onboarding link to the email address you provided. Check the delivery status below.
                            </p>

                            <div className="space-y-3.5 text-left bg-bg border border-line rounded-2xl p-5 mb-6">
                                <div className="flex items-center gap-3 text-[14px] text-ink">
                                    <Mail size={16} className="text-accent shrink-0" />
                                    <div>
                                        <span className="font-semibold text-ink">Email</span>
                                        <span className="text-text-secondary ml-2">
                                            — {STATUS_LABEL[registrationSuccessData.communications.email] || registrationSuccessData.communications.email}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[13px] text-text-secondary mb-6">
                                Need help? Contact <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent font-semibold hover:underline">{SUPPORT_EMAIL}</a>.
                            </p>

                            {registrationSuccessData.debugOnboardingUrl && (
                                <a href={registrationSuccessData.debugOnboardingUrl} className="block mb-4">
                                    <AuthButton variant="primary">
                                        Open onboarding link (dev)
                                    </AuthButton>
                                </a>
                            )}
                            <AuthButton variant="secondary" onClick={() => handleSwitchMode('register')}>
                                Back to registration
                            </AuthButton>
                        </AuthCard>
                    ) : authMode === 'login' ? (
                        /* Login Form Container */
                        <AuthCard className="animate-in fade-in duration-200">
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <h2 className="font-display text-[22px] font-bold text-ink">Welcome back</h2>
                                    <p className="text-[14.5px] text-text-secondary">Sign in to your recruitment desk</p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5 flex items-start gap-2.5">
                                        <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                                        <p className="text-red-700 text-[13px] font-medium leading-tight">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleLoginSubmit} className="space-y-4">
                                    <AuthInput
                                        id="login-email"
                                        label="Email address"
                                        type="email"
                                        placeholder="you@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <div className="space-y-1.5 relative">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <label htmlFor="login-password" className="block text-[13.5px] font-semibold text-gray-700">
                                                Password
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAuthMode('forgot-password')
                                                    setError('')
                                                }}
                                                className="text-[12.5px] font-semibold text-accent hover:text-accent-dark hover:underline transition-colors"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                        <AuthPasswordInput
                                            id="login-password"
                                            placeholder="Enter password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <label className="flex items-center gap-2.5 text-[13.5px] text-gray-500 cursor-pointer select-none group">
                                        <input
                                            type="checkbox"
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-200 accent-accent cursor-pointer transition-colors"
                                        />
                                        <span className="group-hover:text-gray-700 transition-colors">Remember me on this browser</span>
                                    </label>

                                    <AuthButton type="submit" loading={loading} className="mt-6">
                                        Sign In
                                    </AuthButton>
                                </form>

                                <div className="text-center text-[13.5px] text-gray-500 pt-2 border-t border-gray-100">
                                    Don't have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchMode('register')}
                                        className="font-bold text-accent hover:text-accent-dark transition-colors hover:underline"
                                    >
                                        Join Now
                                    </button>
                                </div>
                            </div>
                        </AuthCard>
                    ) : authMode === 'register' ? (
                        /* Role Selector Container */
                        <AuthCard className="animate-in fade-in duration-200">
                            <RoleSelector
                                selectedRole={selectedRole}
                                onSelectRole={setSelectedRole}
                                onContinue={() => setRegistrationModalOpen(true)}
                            />
                            <div className="text-center text-[13.5px] text-gray-500 pt-5 mt-6 border-t border-gray-100">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => handleSwitchMode('login')}
                                    className="font-bold text-accent hover:text-accent-dark transition-colors hover:underline"
                                >
                                    Sign in
                                </button>
                            </div>
                        </AuthCard>
                    ) : (
                        /* Forgot Password Screen Container */
                        <AuthCard className="animate-in fade-in duration-200">
                            {forgotPasswordStep === 'input' ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchMode('login')}
                                            className="flex items-center gap-1.5 text-[13.5px] font-semibold text-accent hover:text-accent-dark transition-colors"
                                        >
                                            <ArrowLeft size={16} /> Back to Login
                                        </button>
                                        <h2 className="font-display text-[22px] font-bold text-ink pt-2">Reset Password</h2>
                                        <p className="text-[14px] text-text-secondary leading-normal">
                                            Enter your email address and we'll send you a link to reset your password.
                                        </p>
                                    </div>

                                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                                        <AuthInput
                                            id="forgot-email"
                                            label="Email address"
                                            type="email"
                                            placeholder="you@company.com"
                                            value={forgotPasswordEmail}
                                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                            required
                                        />
                                        <AuthButton type="submit" loading={loading} className="mt-4">
                                            Send Reset Link
                                        </AuthButton>
                                    </form>
                                </div>
                            ) : (
                                <div className="space-y-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto border border-red-100/50">
                                        <CheckCircle2 size={32} className="text-green-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="font-display text-[22px] font-bold text-ink">Reset Link Sent</h2>
                                        <p className="text-[14.5px] text-text-secondary leading-relaxed px-2">
                                            We've sent a password reset link to <span className="font-semibold text-ink">{forgotPasswordEmail}</span>. Please check your inbox.
                                        </p>
                                    </div>
                                    <AuthButton type="button" onClick={() => handleSwitchMode('login')} className="mt-4">
                                        Back to Login
                                    </AuthButton>
                                </div>
                            )}
                        </AuthCard>
                    )}
                </div>
            </div>

            {/* Registration Modal */}
            <RegistrationModal
                open={registrationModalOpen}
                role={selectedRole}
                onClose={() => setRegistrationModalOpen(false)}
                onSubmitSuccess={handleRegistrationSuccess}
            />
        </AuthLayout>
    )
}

export default AuthPage
