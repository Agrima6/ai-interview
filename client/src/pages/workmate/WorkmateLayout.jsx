import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'
import Button from '../../components/Button'
import logo from '../../assets/logo.png'
import logoFooter from '../../assets/logo-footer.png'
import AmbientBackground from './AmbientBackground'
import CursorSpotlight from './CursorSpotlight'
import { NEXA_CONTACTS } from '../../components/interviewFaqConfig'

const NAV_LINKS = [
    { label: 'Home', id: 'home' },
    { label: 'About', id: 'about' },
    { label: 'Who It Works For', id: 'who-it-works-for' },
    { label: 'Solution', id: 'how-it-works' },
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
            <div className={`workmate-shell flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-[62px] lg:h-[66px]' : 'h-[76px] lg:h-[80px]'}`}>
                <a href='#home' onClick={jump('home')} className='flex items-center gap-2.5 shrink-0 group'>
                    <img src={logo} alt='' className='h-9 w-9 rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 lg:h-11 lg:w-11' />
                    <span className='type-brand text-ink tracking-tight'>WorkmateIQ</span>
                </a>

                <div className='hidden lg:flex items-center gap-1'>
                    {NAV_LINKS.map((l) => (
                        <a key={l.id} href={`#${l.id}`} onClick={jump(l.id)}
                            className={`type-nav rounded-full px-4 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/25 ${active === l.id ? 'text-accent bg-accent/[0.08] font-semibold' : 'text-text-secondary hover:text-ink hover:bg-black/[0.04]'}`}>
                            {l.label}
                        </a>
                    ))}
                </div>

                <div className='hidden md:flex items-center gap-3'>
                    <Button variant='ghost' size='sm' className='lg:!px-5 lg:!py-2.5' onClick={() => navigate('/login')}>Demo Login</Button>
                    <Button variant='primary' size='sm' className='lg:!px-5 lg:!py-2.5' onClick={goToPlatformLogin}>Login</Button>
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
                            className='type-nav block py-2.5 text-text-secondary outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/25'>{l.label}</a>
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
        { h: 'Company', items: [['About', 'about'], ['Solution', 'how-it-works'], ['Contact', 'contact']] },
        { h: 'Get Started', items: [['Pricing', 'pricing'], ['Enquiry', 'contact']] },
    ]
    return (
        <footer className='bg-accent-dark border-t border-white/20 text-bg pt-12 pb-10'>
            <div className='workmate-shell'>
                <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-16'>
                    <div className='lg:col-span-1'>
                        <div className='flex items-center gap-3 mb-4'>
                            <img src={logoFooter} alt='' className='w-12 h-12 shrink-0 rounded-full' />
                            <span className='type-brand text-bg'>WorkmateIQ</span>
                        </div>
                        <p className='type-body-small text-bg/75 max-w-xs'>
                            A smarter platform for hiring, onboarding and building stronger professional journeys.
                        </p>
                    </div>
                    {columns.map((col) => (
                        <div key={col.h}>
                            <p className='type-footer-heading text-bg mb-4'>{col.h}</p>
                            <div className='space-y-2.5'>
                                {col.items.map(([label, id]) => (
                                    <a key={label} href={`#${id}`} onClick={jump(id)} className='type-footer-link block text-bg/75 hover:text-bg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/60'>{label}</a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className='flex flex-col gap-4 border-t border-white/20 pt-8 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center'>
                    <p className='type-caption text-bg/60'>© 2026 WorkmateIQ. All rights reserved.</p>
                    <nav className='flex items-center justify-self-center gap-4' aria-label='Social and contact links'>
                        <a
                            href='https://www.instagram.com/wcsplgroup'
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label='Instagram'
                            title='Instagram'
                            className='flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#fffafa] text-accent transition-all duration-200 hover:scale-105 hover:bg-[#fff1f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/70'
                        >
                            <FaInstagram size={34} aria-hidden='true' />
                        </a>
                        <a
                            href={NEXA_CONTACTS.whatsapp.href}
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label='WhatsApp'
                            title='WhatsApp'
                            className='flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#fffafa] text-accent transition-all duration-200 hover:scale-105 hover:bg-[#fff1f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/70'
                        >
                            <FaWhatsapp size={34} aria-hidden='true' />
                        </a>
                        <a
                            href={NEXA_CONTACTS.gmail.href}
                            aria-label='Gmail'
                            title='Gmail'
                            className='flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#fffafa] text-accent transition-all duration-200 hover:scale-105 hover:bg-[#fff1f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/70'
                        >
                            <SiGmail size={34} aria-hidden='true' />
                        </a>
                    </nav>
                </div>
            </div>
        </footer>
    )
}

function WorkmateLayout({ children, showCursorSpotlight = true }) {
    return (
        <div className='workmate-marketing min-h-screen bg-bg relative'>
            <AmbientBackground />
            {showCursorSpotlight && <CursorSpotlight />}
            <WorkmateNav />
            {children}
            <WorkmateFooter />
        </div>
    )
}

export default WorkmateLayout
