import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from "motion/react"
import { Coins, LogOut, LogIn, User, ShieldCheck, ClipboardList, Mic } from "lucide-react";
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ServerUrl } from '../constants';
import { loginWithGoogle } from '../utils/authApi';
import { setUserData } from '../redux/userSlice';
import Button from './Button';
import ThemeToggle from './ThemeToggle';
import logo from '../assets/logo.png';

const GUEST_EMAIL = "guest@ats-pro.local"

const NAV_LINKS = [
    { label: "Features", id: "features" },
    { label: "Interview Modes", id: "modes" },
]

function Navbar() {
    const { userData } = useSelector((state) => state.user)
    const [showCreditPopup, setShowCreditPopup] = useState(false)
    const [showUserPopup, setShowUserPopup] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const dispatch = useDispatch()

    const handleLogout = async () => {
        try {
            await axios.get(ServerUrl + "/api/auth/logout", { withCredentials: true })
            dispatch(setUserData(null))
            setShowCreditPopup(false)
            setShowUserPopup(false)
            navigate("/")

        } catch (error) {
            console.log(error)
        }
    }

    const handleGoogleLogin = async () => {
        try {
            const user = await loginWithGoogle()
            dispatch(setUserData(user))
            setShowUserPopup(false)
        } catch (error) {
            console.log(error)
        }
    }

    const goToSection = (id) => (e) => {
        e.preventDefault()
        if (location.pathname === '/') {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
            navigate('/')
            setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400)
        }
    }

    return (
        <div className='sticky top-0 z-50 flex justify-center px-4 pt-4'>
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className='glass w-full max-w-[1280px] rounded-2xl border border-line shadow-[var(--shadow-soft)] px-5 md:px-6 py-3 flex justify-between items-center relative'>

                <div onClick={() => navigate('/')} className='flex items-center gap-2.5 cursor-pointer shrink-0'>
                    <img src={logo} alt="WorkMate IQ" className='w-11 h-11 rounded-full shadow-[0_4px_12px_-4px_rgba(99,102,241,0.6)]' />
                    <span className='font-semibold hidden sm:block text-[17px] tracking-tight text-ink'>WorkMate IQ</span>
                </div>

                <div className='hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2'>
                    {NAV_LINKS.map((link) => (
                        <a key={link.id} href={`/#${link.id}`} onClick={goToSection(link.id)}
                            className='px-4 py-2 text-[14px] text-text-secondary hover:text-ink rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors'>
                            {link.label}
                        </a>
                    ))}
                    <a href='/pricing' onClick={(e) => { e.preventDefault(); navigate('/pricing') }}
                        className='px-4 py-2 text-[14px] text-text-secondary hover:text-ink rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors'>
                        Pricing
                    </a>
                    <a href='/history' onClick={(e) => { e.preventDefault(); navigate('/history') }}
                        className='px-4 py-2 text-[14px] text-text-secondary hover:text-ink rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors'>
                        History
                    </a>
                </div>

                <div className='flex items-center gap-2 md:gap-3 relative shrink-0'>
                    <ThemeToggle className="!hidden sm:!flex" />

                    {userData ? (
                        <>
                            <div className='relative'>
                                <button onClick={() => {
                                    setShowCreditPopup(!showCreditPopup);
                                    setShowUserPopup(false)
                                }} className='flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.06] px-3.5 py-2 rounded-full text-[13px] font-medium text-ink hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-colors'>
                                    <Coins size={15} className='text-accent' />
                                    {userData?.credits ?? 0}
                                </button>

                                {showCreditPopup && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className='absolute right-0 mt-3 w-64 bg-card shadow-[var(--shadow-lift)] border border-line rounded-2xl p-5 z-50'>
                                        <p className='text-[13px] text-text-secondary mb-4 leading-relaxed'>Need more credits to continue interviews?</p>
                                        <Button size="md" className="w-full !py-2.5 !text-[14px]" onClick={() => navigate("/pricing")}>Buy more credits</Button>
                                    </motion.div>
                                )}
                            </div>

                            <div className='relative'>
                                <button
                                    onClick={() => {
                                        setShowUserPopup(!showUserPopup);
                                        setShowCreditPopup(false)
                                    }} className='w-9 h-9 bg-accent text-white rounded-full flex items-center justify-center font-semibold text-[13px]'>
                                    {userData?.name?.slice(0, 1).toUpperCase() || <User size={15} />}
                                </button>

                                {showUserPopup && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className='absolute right-0 mt-3 w-52 bg-card shadow-[var(--shadow-lift)] border border-line rounded-2xl p-2 z-50'>
                                        <p className='text-[13px] font-medium text-ink px-3 pt-2 pb-2 border-b border-line mb-1'>{userData?.name}</p>

                                        <button onClick={() => navigate("/interview")}
                                            className='w-full text-left text-[13px] px-3 py-2.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2 text-text-secondary transition-colors'>
                                            <Mic size={14} />
                                            Give an Interview</button>
                                        <button onClick={() => navigate("/history")} className='w-full text-left text-[13px] px-3 py-2.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-text-secondary transition-colors'>Interview History</button>
                                        <button onClick={() => navigate("/admin")}
                                            className='w-full text-left text-[13px] px-3 py-2.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2 text-text-secondary transition-colors'>
                                            <ClipboardList size={14} />
                                            Conduct an Interview</button>
                                        {userData?.role === "superadmin" && (
                                            <button onClick={() => navigate("/admin/employees")}
                                                className='w-full text-left text-[13px] px-3 py-2.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2 text-text-secondary transition-colors'>
                                                <ShieldCheck size={14} />
                                                Manage Employees</button>
                                        )}
                                        {userData?.role === "superadmin" && (
                                            <button onClick={() => navigate("/superadmin")}
                                                className='w-full text-left text-[13px] px-3 py-2.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2 text-text-secondary transition-colors'>
                                                <ShieldCheck size={14} />
                                                Super Admin</button>
                                        )}
                                        {userData?.email === GUEST_EMAIL && (
                                            <button onClick={handleGoogleLogin}
                                                className='w-full text-left text-[13px] px-3 py-2.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2 text-text-secondary transition-colors'>
                                                <LogIn size={14} />
                                                Sign in with Google</button>
                                        )}
                                        <button onClick={handleLogout}
                                            className='w-full text-left text-[13px] px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 text-red-500 transition-colors'>
                                            <LogOut size={14} />
                                            Logout</button>
                                    </motion.div>
                                )}
                            </div>
                        </>
                    ) : (
                        <Button variant="secondary" size="md" className="!px-5 !py-2.5 !text-[13.5px]" onClick={() => navigate('/login')}>
                            Log In
                        </Button>
                    )}

                    <Button size="md" className="!hidden sm:!inline-flex !px-5 !py-2.5 !text-[13.5px]" onClick={() => navigate(userData ? '/interview' : '/login')}>
                        Get Started
                    </Button>
                </div>

            </motion.div>

        </div>
    )
}

export default Navbar
