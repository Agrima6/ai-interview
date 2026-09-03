import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'
import { Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
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
    const [active, setActive] = useState('home')
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

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

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [menuOpen])

    const jump = (id) => (e) => {
        e.preventDefault()
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const goToPlatformLogin = () => navigate('/platform/login')

    return (
        <>
            <div className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled || menuOpen ? 'bg-card/85 backdrop-blur-xl border-b border-line shadow-soft' : 'bg-card/40 backdrop-blur-sm border-b border-transparent'}`}>
                <div className={`workmate-shell workmate-nav__shell ${scrolled || menuOpen ? 'workmate-nav__shell--scrolled' : ''} flex items-center justify-between transition-all duration-300 ${scrolled || menuOpen ? 'h-[62px] lg:h-[66px]' : 'h-[76px] lg:h-[80px]'}`}>
                    <a href='#home' onClick={jump('home')} className='workmate-nav__identity flex items-center gap-2.5 shrink-0 group'>
                        <img src={logo} alt='' className='workmate-nav__logo h-9 w-9 rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 lg:h-11 lg:w-11' />
                        <span className='workmate-nav__brand type-brand text-ink tracking-tight'>WorkmateIQ</span>
                    </a>

                    <div className='hidden lg:flex items-center gap-1'>
                        {NAV_LINKS.map((l) => (
                            <a key={l.id} href={`#${l.id}`} onClick={jump(l.id)}
                                className={`type-nav rounded-full px-4 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/25 ${active === l.id ? 'text-accent bg-accent/[0.08] font-semibold' : 'text-text-secondary hover:text-ink hover:bg-black/[0.04]'}`}>
                                {l.label}
                            </a>
                        ))}
                    </div>

                    <div className='workmate-nav__auth hidden lg:flex items-center gap-3 ml-auto lg:ml-0 shrink-0 mr-3 lg:mr-0'>
                        <Button variant='ghost' size='sm' className='workmate-nav__auth-button workmate-nav__auth-button--demo lg:!px-5 lg:!py-2.5 hidden sm:inline-flex' onClick={() => navigate('/login')}>Demo Login</Button>
                        <Button variant='primary' size='sm' className='workmate-nav__auth-button workmate-nav__auth-button--login lg:!px-5 lg:!py-2.5' onClick={goToPlatformLogin}>Login</Button>
                    </div>

                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className='lg:hidden p-2 text-text-secondary hover:text-ink hover:bg-black/[0.04] rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent/25 outline-none shrink-0 ml-auto'
                        aria-expanded={menuOpen}
                        aria-label='Toggle navigation menu'
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className='fixed inset-x-0 bottom-0 z-40 bg-card/95 backdrop-blur-xl border-t border-line lg:hidden flex flex-col p-6 overflow-y-auto workmate-mobile-menu'
                    >
                        <nav className='flex flex-col gap-2 mt-4' aria-label='Mobile navigation'>
                            {NAV_LINKS.map((l) => (
                                <a
                                    key={l.id}
                                    href={`#${l.id}`}
                                    onClick={(e) => {
                                        setMenuOpen(false)
                                        jump(l.id)(e)
                                    }}
                                    className={`type-nav text-lg rounded-xl px-4 py-3 outline-none transition-colors ${active === l.id ? 'text-accent bg-accent/[0.08] font-semibold' : 'text-text-secondary hover:text-ink hover:bg-black/[0.04]'}`}
                                >
                                    {l.label}
                                </a>
                            ))}
                        </nav>
                        <div className='mt-auto pt-6 border-t border-line flex flex-col gap-3'>
                            <Button
                                variant='ghost'
                                size='lg'
                                className='w-full !justify-center py-3'
                                onClick={() => {
                                    setMenuOpen(false)
                                    navigate('/login')
                                }}
                            >
                                Demo Login
                            </Button>
                            <Button
                                variant='primary'
                                size='lg'
                                className='w-full !justify-center py-3'
                                onClick={() => {
                                    setMenuOpen(false)
                                    goToPlatformLogin()
                                }}
                            >
                                Login
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

function WorkmateFooter() {
    const jump = (id) => (e) => {
        e.preventDefault()
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    const columns = [
        { key: 'solutions', h: 'Solutions', items: [['For Organizations', 'organizations'], ['For Colleges', 'colleges'], ['For Candidates', 'candidates']] },
        { key: 'company', h: 'Company', items: [['About', 'about'], ['Solution', 'how-it-works'], ['Contact', 'contact']] },
        { key: 'get-started', h: 'Get Started', items: [['Pricing', 'pricing'], ['Register', '/platform/register'], ['Enquiry', 'contact']] },
    ]
    return (
        <footer className='workmate-footer bg-accent-dark border-t border-white/20 text-bg pt-12 pb-10'>
            <div className='workmate-shell'>
                <div className='workmate-footer__main grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-16'>
                    <div className='workmate-footer__identity lg:col-span-1'>
                        <div className='workmate-footer__brand flex items-center gap-3 mb-4'>
                            <img src={logoFooter} alt='' className='w-12 h-12 shrink-0 rounded-full' />
                            <span className='type-brand text-bg'>WorkmateIQ</span>
                        </div>
                        <p className='type-body-small text-bg/75 max-w-xs'>
                            A smarter platform for hiring, onboarding and building stronger professional journeys.
                        </p>
                    </div>
                    {columns.map((col) => (
                        <div key={col.key} className={`workmate-footer__column workmate-footer__column--${col.key}`}>
                            <p className='type-footer-heading text-bg mb-4'>{col.h}</p>
<div className='workmate-footer__links space-y-2.5'>
                                {col.items.map(([label, id]) => {
                                    const isExternal = id.startsWith('/') || id.startsWith('http')
                                    return (
                                        <a
                                            key={label}
                                            href={isExternal ? id : `#${id}`}
                                            onClick={isExternal ? undefined : jump(id)}
                                            className='type-footer-link block text-bg/75 hover:text-bg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/60'
                                        >
                                            {label}
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className='workmate-footer__bottom-row flex flex-col items-center gap-4 border-t border-white/20 pt-8'>
                    <nav className='workmate-footer__social-nav flex items-center justify-center gap-4' aria-label='Social and contact links'>
                        <a
                            href='https://www.instagram.com/wcsplgroup'
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label='Instagram'
                            title='Instagram'
                            className='workmate-footer__social-button flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#fffafa] text-accent transition-all duration-200 hover:scale-105 hover:bg-[#fff1f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/70'
                        >
                            <FaInstagram size={22} aria-hidden='true' />
                        </a>
                        <a
                            href={NEXA_CONTACTS.whatsapp.href}
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label='WhatsApp'
                            title='WhatsApp'
                            className='workmate-footer__social-button flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#fffafa] text-accent transition-all duration-200 hover:scale-105 hover:bg-[#fff1f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/70'
                        >
                            <FaWhatsapp size={22} aria-hidden='true' />
                        </a>
                        <a
                            href={NEXA_CONTACTS.gmail.href}
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label='Gmail'
                            title='Gmail'
                            className='workmate-footer__social-button flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#fffafa] text-accent transition-all duration-200 hover:scale-105 hover:bg-[#fff1f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/70'
                        >
                            <SiGmail size={22} aria-hidden='true' />
                        </a>
                    </nav>
                    <p className='type-caption text-bg/60 text-center w-full'>© 2026 WorkmateIQ. All rights reserved.</p>
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
