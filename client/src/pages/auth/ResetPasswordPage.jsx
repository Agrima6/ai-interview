import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, XCircle } from 'lucide-react'
import AuthPasswordInput from '../../components/auth/AuthPasswordInput'
import AuthButton from '../../components/auth/AuthButton'
import { resetPassword } from '../../api/authApi'
import logo from '../../assets/logo.png'

// Password rules shown as guidance. Only the length is enforced here (and by the server); the rest feeds the
// strength meter so people can see how to make a stronger one.
const RULES = [
    { label: '8+ characters', test: (p) => p.length >= 8 },
    { label: 'A number', test: (p) => /[0-9]/.test(p) },
    { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'A symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
]
const STRENGTH = [
    { label: '—', color: 'bg-[#D9C4C9]', text: 'text-text-secondary' },
    { label: 'Weak', color: 'bg-orange-700', text: 'text-orange-700' },
    { label: 'Fair', color: 'bg-amber-600', text: 'text-amber-600' },
    { label: 'Good', color: 'bg-emerald-600', text: 'text-emerald-600' },
    { label: 'Strong', color: 'bg-emerald-700', text: 'text-emerald-700' },
]

// Landing page for the link emailed by the "forgot password" flow.
function ResetPasswordPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [linkProblem, setLinkProblem] = useState(false)

    const checks = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password])
    const score = checks.filter((c) => c.ok).length

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
            // An invalid, expired or already-used link cannot be fixed by retyping: offer a fresh one instead.
            if (err?.code === 'INVALID_RESET_TOKEN' || /invalid or has expired/i.test(err?.message || '')) setLinkProblem(true)
            else setError(err?.message || 'We could not reset your password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const showLinkProblem = !token || linkProblem

    return (
        <div className="min-h-screen bg-[#FBF6F4] text-ink font-sans flex flex-col relative overflow-hidden">
            <div aria-hidden="true" className="absolute -top-44 -right-28 w-[520px] h-[520px] rounded-full bg-[#FFE4E8]" />
            <header className="relative max-w-[1240px] w-full mx-auto px-6 py-[18px] flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2.5 text-ink no-underline min-h-[44px]">
                    <img src={logo} alt="" className="w-[38px] h-[38px] rounded-full" />
                    <span className="font-display text-[20px] font-medium">WorkmateIQ</span>
                </Link>
                <button type="button" onClick={() => navigate('/login')} className="text-[14px] font-medium text-accent hover:text-accent-dark min-h-[44px]">
                    ← Back to login
                </button>
            </header>

            <main className="relative flex-1 flex items-center justify-center px-5 pt-10 pb-20">
                <div className="w-full max-w-[480px] bg-white border border-[#EAD7DB] rounded-[32px] px-8 sm:px-10 py-11 shadow-[0_50px_100px_-60px_rgba(35,9,15,0.5)]">
                    {showLinkProblem ? (
                        <div className="text-center space-y-4">
                            <span className="mx-auto w-[88px] h-[88px] rounded-[26px] bg-red-50 flex items-center justify-center border border-red-100/60">
                                <XCircle size={40} strokeWidth={1.7} className="text-red-500" aria-hidden="true" />
                            </span>
                            <h1 className="font-display text-[30px] font-medium tracking-tight">{linkProblem ? 'This link has expired' : 'Invalid reset link'}</h1>
                            <p className="text-[15px] text-text-secondary leading-relaxed">
                                {linkProblem
                                    ? 'This password reset link is invalid, expired or has already been used. Request a new one to continue.'
                                    : 'This password reset link is incomplete. Please request a new one from the sign-in screen.'}
                            </p>
                            <AuthButton type="button" onClick={() => navigate('/login')} className="mt-2">
                                Request a new link
                            </AuthButton>
                        </div>
                    ) : done ? (
                        <div className="text-center">
                            <span className="mx-auto w-[88px] h-[88px] rounded-[26px] bg-[#1F7A4D] flex items-center justify-center">
                                <Check size={44} strokeWidth={2.2} className="text-white" aria-hidden="true" />
                            </span>
                            <h1 className="font-display text-[30px] font-medium tracking-tight mt-7">Password updated</h1>
                            <p className="text-[15px] text-text-secondary leading-relaxed mt-2.5">
                                You can now sign in with your new password. All existing sessions were signed out for your security.
                            </p>
                            <AuthButton type="button" onClick={() => navigate('/login')} className="mt-7">
                                Go to login
                            </AuthButton>
                        </div>
                    ) : (
                        <>
                            <h1 className="font-display text-[30px] font-medium tracking-tight">Set a new password</h1>
                            <p className="text-[15px] text-text-secondary mt-2.5">Choose a new password for your account.</p>
                            <form onSubmit={submit} className="mt-7 space-y-5">
                                <AuthPasswordInput
                                    id="new-password"
                                    label="New password"
                                    placeholder="At least 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />

                                <div>
                                    <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                                        {[0, 1, 2, 3].map((i) => (
                                            <span key={i} className={`h-1.5 rounded-full transition-colors ${i < score ? STRENGTH[score].color : 'bg-[#EFE3E6]'}`} />
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-2 text-[13px]" aria-live="polite">
                                        <span className="text-text-secondary">Strength</span>
                                        <span className={`font-medium ${STRENGTH[score].text}`}>{STRENGTH[score].label}</span>
                                    </div>
                                </div>

                                <ul className="grid grid-cols-2 gap-2 text-[13px]">
                                    {checks.map((c) => (
                                        <li key={c.label} className={`flex items-center gap-2 ${c.ok ? 'text-[#1F7A4D]' : 'text-text-secondary'}`}>
                                            <span className={`w-[18px] h-[18px] rounded-full inline-flex items-center justify-center ${c.ok ? 'bg-[#1F7A4D] text-white' : 'bg-[#D9C4C9] text-white'}`} aria-hidden="true">
                                                <Check size={11} strokeWidth={3} />
                                            </span>
                                            {c.label}
                                        </li>
                                    ))}
                                </ul>

                                <AuthPasswordInput
                                    id="confirm-password"
                                    label="Confirm password"
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                                {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
                                <AuthButton type="submit" loading={loading}>
                                    Update password
                                </AuthButton>
                            </form>
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}

export default ResetPasswordPage
