import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from "motion/react"
import { Sparkles, LogIn } from "lucide-react"
import { setUserData } from '../redux/userSlice'
import { loginWithGoogle, loginAsGuest } from '../utils/authApi'
import Button from '../components/Button'
import ThemeToggle from '../components/ThemeToggle'

function Login() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const redirectTo = location.state?.from || "/"

    const handleGoogle = async () => {
        setError("")
        setLoading(true)
        try {
            const user = await loginWithGoogle()
            dispatch(setUserData(user))
            navigate(redirectTo, { replace: true })
        } catch (err) {
            console.log(err)
            setError("Google sign-in isn't available right now. You can continue as a guest instead.")
        } finally {
            setLoading(false)
        }
    }

    const handleGuest = async () => {
        setError("")
        setLoading(true)
        try {
            const user = await loginAsGuest()
            dispatch(setUserData(user))
            navigate(redirectTo, { replace: true })
        } catch (err) {
            console.log(err)
            setError("Couldn't start a guest session. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='min-h-screen bg-bg flex items-center justify-center px-4 relative'>
            <ThemeToggle className="!absolute top-5 right-5" />
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className='w-full max-w-sm bg-card border border-line rounded-2xl shadow-[var(--shadow-soft)] p-8 text-center'
            >
                <div className='bg-accent text-white w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-5'>
                    <Sparkles size={18} strokeWidth={2.25} />
                </div>
                <h1 className='text-[22px] font-semibold text-ink mb-2'>Sign in to ATS Pro</h1>
                <p className='text-[14px] text-text-secondary mb-7 leading-relaxed'>Practice interviews, get AI feedback, and track your progress.</p>

                <Button size="lg" className='w-full !mb-3' onClick={handleGoogle} disabled={loading}>
                    <LogIn size={17} /> Sign in with Google
                </Button>
                <Button variant="secondary" size="lg" className='w-full' onClick={handleGuest} disabled={loading}>
                    Continue as Guest
                </Button>

                {error && <p className='text-[13px] text-red-500 mt-5 leading-relaxed'>{error}</p>}
            </motion.div>
        </div>
    )
}

export default Login
