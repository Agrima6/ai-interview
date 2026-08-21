import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button'
import logo from '../../assets/logo.png'
import AmbientBackground from './AmbientBackground'
import CursorSpotlight from './CursorSpotlight'

const NAV_LINKS = [
    { label: 'Home', id: 'home' },
    { label: 'About', id: 'about' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Solutions', id: 'solutions' },
    { label: 'Contact', id: 'contact' },
]

function WorkmateNav() {
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState('home')
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const sections = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(Boolean)
        if (!sections.length) return
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActive(entry.target.id)
                })
            },
            { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
        )
        sections.forEach((s) => observer.observe(s))
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const jump = (id) => (e) => {
        e.preventDefault()
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setOpen(false)
    }

    const goToPlatformLogin = () => navigate('/platform/login')

    return (
        <div className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-card/80 backdrop-blur-xl border-b border-line shadow-soft' : 'bg-card/40 backdrop-blur-sm border-b border-transparent'}`}>
            <div className={`max-w-[1280px] mx-auto px-6 lg:px-8 flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-[62px]' : 'h-[76px]'}`}>
                <a href='#home' onClick={jump('home')} className='flex items-center gap-2.5 shrink-0 group'>
                    <img src={logo} alt='' className='w-9 h-9 rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6' />
                    <span className='font-display text-[16px] font-bold text-ink tracking-tight'>WorkmateIQ</span>
                </a>

                <div className='hidden lg:flex items-center gap-1'>
                    {NAV_LINKS.map((l) => (
                        <a key={l.id} href={`#${l.id}`} onClick={jump(l.id)}
                            className={`px-4 py-2 text-[13.5px] rounded-full transition-colors ${active === l.id ? 'text-accent bg-accent/[0.08] font-medium' : 'text-text-secondary hover:text-ink hover:bg-black/[0.04]'}`}>
                            {l.label}
                        </a>
                    ))}
                </div>

                <div className='hidden md:flex items-center gap-3'>
                    <Button variant='ghost' size='sm' onClick={() => navigate('/login')}>Demo Login</Button>
                    <Button variant='primary' size='sm' onClick={goToPlatformLogin}>Login</Button>
                </div>

                <button className='lg:hidden text-ink' onClick={() => setOpen(!open)} aria-label='Menu'>
                    <span className='block w-5 h-0.5 bg-current mb-1.5 rounded' />
                    <span className='block w-5 h-0.5 bg-current rounded' />
                </button>
            </div>

            {open && (
                <div className='lg:hidden border-t border-line px-6 py-5 space-y-1 bg-card'>
                    {NAV_LINKS.map((l) => (
                        <a key={l.id} href={`#${l.id}`} onClick={jump(l.id)}
                            className='block py-2.5 text-[14.5px] text-text-secondary hover:text-ink'>{l.label}</a>
                    ))}
                    <div className='flex gap-2.5 pt-3'>
                        <Button variant='ghost' size='sm' className='flex-1' onClick={() => navigate('/login')}>Demo Login</Button>
                        <Button variant='primary' size='sm' className='flex-1' onClick={goToPlatformLogin}>Login</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

function WorkmateFooter() {
    const jump = (id) => (e) => {
        e.preventDefault()
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    const columns = [
        { h: 'Solutions', items: [['For Organizations', 'organizations'], ['For Colleges', 'colleges'], ['For Candidates', 'candidates']] },
        { h: 'Company', items: [['About', 'about'], ['How It Works', 'how-it-works'], ['Contact', 'contact']] },
        { h: 'Get Started', items: [['Pricing', 'pricing'], ['Enquiry', 'contact']] },
    ]
    return (
        <footer className='bg-card border-t border-line text-ink pt-20 pb-10'>
            <div className='max-w-[1280px] mx-auto px-6 lg:px-8'>
                <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-16'>
                    <div className='lg:col-span-1'>
                        <div className='flex items-center gap-3 mb-4'>
                            <img src={logo} alt='' className='w-12 h-12 shrink-0 rounded-full' />
                            <span className='font-display text-[16px] font-bold'>WorkmateIQ</span>
                        </div>
                        <p className='text-text-secondary text-[13.5px] leading-relaxed max-w-xs'>
                            A smarter platform for hiring, onboarding and building stronger professional journeys.
                        </p>
                    </div>
                    {columns.map((col) => (
                        <div key={col.h}>
                            <p className='text-ink text-[13px] font-semibold mb-4'>{col.h}</p>
                            <div className='space-y-2.5'>
                                {col.items.map(([label, id]) => (
                                    <a key={label} href={`#${id}`} onClick={jump(id)} className='block text-text-secondary hover:text-ink text-[13.5px] transition-colors cursor-pointer'>{label}</a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <p className='text-text-secondary/70 text-[12.5px] pt-8 border-t border-line'>© 2026 WorkmateIQ. All rights reserved.</p>
            </div>
        </footer>
    )
}

function WorkmateLayout({ children, showCursorSpotlight = true }) {
    return (
        <div className='min-h-screen bg-bg relative'>
            <AmbientBackground />
            {showCursorSpotlight && <CursorSpotlight />}
            <WorkmateNav />
            {children}
            <WorkmateFooter />
        </div>
    )
}

export default WorkmateLayout
