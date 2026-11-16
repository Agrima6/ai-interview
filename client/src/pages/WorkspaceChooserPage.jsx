import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion as M } from 'motion/react'
import { ArrowRight, Bot, ClipboardCheck, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { resolveWorkspacePath } from '../utils/postLoginPath'
import logo from '../assets/logo.png'

const PRODUCTS = [
    {
        key: 'oa', icon: ClipboardCheck, title: 'Online Assessment', to: '/oa/admin',
        text: 'Run a hiring drive round by round: MCQ, written, coding and video questions, with a proctored test room.',
        steps: ['Create a drive', 'Add questions and candidates', 'Publish and read ranked results'], cta: 'Open Online Assessment',
    },
    {
        key: 'ai', icon: Bot, title: 'AI Interview', to: null,
        text: 'Let the AI interviewer speak to every candidate, score the conversation and hand you a report.',
        steps: ['Create an interview drive', 'Invite candidates', 'Review scored interviews'], cta: 'Open AI Interview',
    },
]

// The first screen after an organization signs in: two products, one clear choice.
export default function WorkspaceChooserPage() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [aiPath, setAiPath] = useState('/organization/dashboard')

    useEffect(() => {
        let cancelled = false
        resolveWorkspacePath(user).then((path) => { if (!cancelled) setAiPath(path) })
        return () => { cancelled = true }
    }, [user])

    const signOut = async () => { await logout(); navigate('/') }
    const first = String(user?.name || '').trim().split(' ')[0]

    return (
        <div className='oa-mesh min-h-screen bg-bg flex flex-col'>
            <header className='h-16 px-5 sm:px-8 flex items-center justify-between'>
                <span className='flex items-center gap-2.5'><img src={logo} alt='' className='w-8 h-8 rounded-full' /><span className='font-display text-[16px] font-bold text-ink'>WorkmateIQ</span></span>
                <button onClick={signOut} className='inline-flex items-center gap-2 min-h-[40px] px-3 rounded-xl text-[13.5px] font-medium text-text-secondary hover:text-ink hover:bg-black/[0.04]'><LogOut size={15} /> Sign out</button>
            </header>
            <main className='flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8'>
                <M.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.75, 0.2, 1] }} className='text-center max-w-xl mb-8 sm:mb-10'>
                    <p className='text-[12.5px] font-semibold tracking-wide uppercase text-accent'>{first ? `Welcome, ${first}` : 'Welcome'}</p>
                    <h1 className='font-display text-[28px] sm:text-[36px] leading-tight font-bold text-ink tracking-tight mt-2'>What would you like to run today?</h1>
                    <p className='text-[15px] text-text-secondary mt-2.5'>Pick one to continue. You can switch between them at any time from the menu.</p>
                </M.div>
                <div className='grid md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-[920px]'>
                    {PRODUCTS.map((p, i) => (
                        <M.div key={p.key} initial={{ opacity: 0, y: 26, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.12 + i * 0.12, type: 'spring', duration: 0.7, bounce: 0.22 }} whileHover={{ y: -6 }} whileTap={{ scale: 0.985 }}>
                            <Link to={p.to || aiPath} className='group relative block h-full rounded-3xl border border-line bg-card p-6 sm:p-7 no-underline shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-accent/50 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25'>
                                <M.span initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.3 + i * 0.12, type: 'spring', bounce: 0.5 }} className='w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-accent group-hover:text-white'>
                                    <p.icon size={26} strokeWidth={1.8} />
                                </M.span>
                                <h2 className='font-display text-[21px] font-bold text-ink'>{p.title}</h2>
                                <p className='text-[14px] leading-relaxed text-text-secondary mt-1.5'>{p.text}</p>
                                <ol className='mt-5 space-y-2.5'>
                                    {p.steps.map((step, n) => (
                                        <li key={step} className='flex items-center gap-3 text-[13.5px] text-ink'>
                                            <span className='w-6 h-6 rounded-full border-[1.5px] border-line text-[11.5px] font-bold text-text-secondary flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:border-accent group-hover:text-accent' style={{ transitionDelay: `${n * 70}ms` }}>{n + 1}</span>{step}
                                        </li>
                                    ))}
                                </ol>
                                <span className='mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-accent'>{p.cta}<ArrowRight size={16} className='transition-transform duration-300 group-hover:translate-x-1.5' /></span>
                            </Link>
                        </M.div>
                    ))}
                </div>
            </main>
        </div>
    )
}
