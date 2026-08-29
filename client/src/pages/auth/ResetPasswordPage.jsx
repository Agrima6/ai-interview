import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import AuthCard from '../../components/auth/AuthCard'
import AuthPasswordInput from '../../components/auth/AuthPasswordInput'
import AuthButton from '../../components/auth/AuthButton'
import { resetPassword } from '../../api/authApi'
import logo from '../../assets/logo.png'

// Landing page for the link emailed by the "forgot password" flow
// (/platform/login -> Forgot password). Previously that flow only ever
// showed a fake "reset link sent" message with no real email and nowhere
// for the link to actually go - this is the page that was missing.
function ResetPasswordPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        setLoading(true)
        try {
            await resetPassword(token, password)
            setDone(true)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout>
            <div className="flex-1 flex items-center justify-center px-4 py-16">
                <AuthCard>
                    {!token ? (
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto border border-red-100/50">
                                <XCircle size={32} className="text-red-500" />
                            </div>
                            <h2 className="font-display text-[22px] font-bold text-ink">Invalid reset link</h2>
                            <p className="text-[14px] text-text-secondary leading-relaxed">This password reset link is missing its token. Request a new one from the login screen.</p>
                            <AuthButton type="button" onClick={() => navigate('/platform/login')} className="mt-2">
                                Back to login
                            </AuthButton>
                        </div>
                    ) : done ? (
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto border border-red-100/50">
                                <CheckCircle2 size={32} className="text-green-600" />
                            </div>
                            <h2 className="font-display text-[22px] font-bold text-ink">Password reset</h2>
                            <p className="text-[14px] text-text-secondary leading-relaxed">Your password has been changed. All existing sessions have been signed out for your security.</p>
                            <AuthButton type="button" onClick={() => navigate('/platform/login')} className="mt-2">
                                Sign in
                            </AuthButton>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2.5">
                                <img src={logo} alt="" className="w-9 h-9 rounded-full" />
                                <span className="font-display text-[14.5px] font-bold text-ink">WorkmateIQ</span>
                            </div>
                            <div>
                                <h2 className="font-display text-[22px] font-bold text-ink mb-1">Set a new password</h2>
                                <p className="text-[14px] text-text-secondary">Choose a new password for your account.</p>
                            </div>
                            <form onSubmit={submit} className="space-y-4">
                                <AuthPasswordInput
                                    id="new-password"
                                    label="New password"
                                    placeholder="At least 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <AuthPasswordInput
                                    id="confirm-password"
                                    label="Confirm password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                {error && <p className="text-[13px] text-red-600 font-medium">{error}</p>}
                                <AuthButton type="submit" loading={loading} className="mt-2">
                                    Reset password
                                </AuthButton>
                            </form>
                        </div>
                    )}
                </AuthCard>
            </div>
        </AuthLayout>
    )
}

export default ResetPasswordPage
