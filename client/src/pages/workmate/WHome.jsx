import React, { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatePresence, motion as Motion } from 'motion/react'
import WorkmateLayout from './WorkmateLayout'
import useReveal from './useReveal'
import Button from '../../components/Button'
import AIScorePanel from './AIScorePanel'
import NetworkGraphic from './NetworkGraphic'
import JourneySection from './JourneySection'
import HeroThreadsBackground from './HeroThreadsBackground'
import FiberBurstCanvas from './FiberBurstCanvas'
import MarketingIllustration from '../../components/MarketingIllustration'
import { submitPlatformEnquiry } from '../../api/enquiriesApi'
import {
    ArrowRight, ChevronDown,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)
const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

import heroWorkmate from '../../assets/workmate/hero-workmate.png'
import isometricAudience from '../../assets/workmate/isometric-audience.jpg'

const H2 = 'font-display text-[30px] sm:text-[42px] font-bold text-ink leading-[1.1] tracking-tight'
const EYEBROW = 'text-[13px] tracking-[0.16em] uppercase text-accent font-semibold mb-4'

function CTAButton({ children, ...props }) {
    return (
        <Button {...props} className={`group ${props.className || ''}`}>
            {children}
            <ArrowRight size={16} className='transition-transform duration-300 group-hover:translate-x-1' />
        </Button>
    )
}

/* ============================================================ HERO ============================================================ */
function Hero({ jump, experimental = false }) {
    const heroRef = useReveal('.reveal')
    const heroAreaRef = useRef(null)
    const wrapRef = useRef(null)

    useEffect(() => {
        if (REDUCE_MOTION || !wrapRef.current) return
        const el = experimental ? heroAreaRef.current : wrapRef.current
        const image = wrapRef.current.querySelector('.hero-tilt')
        if (!el || !image) return
        const onMove = (e) => {
            const r = el.getBoundingClientRect()
            const px = (e.clientX - r.left) / r.width - 0.5
            const py = (e.clientY - r.top) / r.height - 0.5
            if (experimental) {
                gsap.to(image, {
                    x: px * 7,
                    y: py * 5,
                    rotateY: px * 1.4,
                    rotateX: -py * 1.2,
                    duration: 0.8,
                    ease: 'power2.out',
                    overwrite: 'auto',
                })
            } else {
                gsap.to(image, { rotateY: px * 6, rotateX: -py * 6, duration: 0.6, ease: 'power2.out' })
            }
        }
        const onLeave = () => {
            if (!experimental) return
            gsap.to(image, { x: 0, y: 0, rotateY: 0, rotateX: 0, duration: 0.9, ease: 'power2.out', overwrite: 'auto' })
        }
        el.addEventListener('mousemove', onMove)
        el.addEventListener('mouseleave', onLeave)
        return () => {
            el.removeEventListener('mousemove', onMove)
            el.removeEventListener('mouseleave', onLeave)
        }
    }, [experimental])

    return (
        <section ref={heroAreaRef} id='home' className='scroll-mt-20 relative overflow-hidden'>
            {experimental && <HeroThreadsBackground />}
            <div className={`absolute top-[-160px] left-[8%] w-[620px] h-[560px] rounded-full ${experimental ? 'opacity-[0.08]' : 'opacity-[0.14]'} blur-3xl pointer-events-none`}
                style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
            <div className={`absolute top-[60px] right-[-160px] w-[380px] h-[380px] rounded-full ${experimental ? 'opacity-[0.12]' : 'opacity-[0.07]'} blur-3xl pointer-events-none`}
                style={{ background: 'radial-gradient(closest-side, #e0271b, transparent)' }} />

            <div className='relative max-w-[1280px] mx-auto px-6 lg:px-8 pt-32 sm:pt-36 pb-24 grid lg:grid-cols-[1fr_1.05fr] gap-14 items-center'>
                <div ref={heroRef}>
                    <p className={`reveal ${EYEBROW} inline-flex items-center gap-2`}>
                        <span className='w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow' />
                        WorkmateIQ
                    </p>
                    <h1 className='reveal font-display text-[42px] sm:text-[62px] font-bold text-ink leading-[1.03] tracking-tight mb-6'>
                        Where <span className='gradient-brand-text'>better talent journeys</span> begin.
                    </h1>
                    <p className='reveal text-[18px] text-text-secondary leading-relaxed max-w-lg mb-9'>
                        One intelligent platform for hiring, onboarding and connecting people with opportunity — from first interaction to first day.
                    </p>
                    <div className='reveal flex flex-wrap gap-3'>
                        <CTAButton size='lg' onClick={jump('contact')}>Get Started</CTAButton>
                        <Button size='lg' variant='secondary' onClick={jump('how-it-works')}>Explore WorkmateIQ</Button>
                    </div>
                </div>
                <div ref={wrapRef} className='relative' style={{ perspective: '1200px' }}>
                    <div className='hero-tilt relative' style={{ transformStyle: 'preserve-3d' }}>
                        <div className='rounded-[28px] overflow-hidden border border-line shadow-[0_30px_80px_-24px_rgba(30,10,12,0.25)] bg-card transition-all duration-500 hover:scale-[1.04] hover:border-accent/60 hover:shadow-[0_30px_90px_-10px_rgba(196,22,31,0.55)] group cursor-pointer'>
                            <img src={heroWorkmate} alt='Organizations, colleges and candidates connected through WorkmateIQ' className='w-full h-auto transition-transform duration-500 group-hover:scale-[1.01]' />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ============================================================ QUOTE STRIP ============================================================ */
function QuoteStrip() {
    const ref = useReveal('.quote-reveal', { blur: true, y: 14 })
    return (
        <section ref={ref} className='relative max-w-[1280px] mx-auto px-6 lg:px-8 py-4 sm:py-6'>
            <div className='quote-reveal max-w-[820px] mx-auto rounded-2xl border border-accent/40 bg-accent/[0.03] px-7 py-6 sm:px-10 sm:py-8 text-center shadow-[0_0_35px_rgba(196,22,31,0.18),inset_0_0_15px_rgba(196,22,31,0.05)] transition-all duration-300 hover:scale-[1.015] hover:border-accent/80 hover:shadow-[0_0_55px_rgba(196,22,31,0.42),inset_0_0_20px_rgba(196,22,31,0.12)] group cursor-default'>
                <blockquote className='font-display text-[22px] sm:text-[30px] lg:text-[34px] font-bold text-ink leading-[1.25] tracking-tight text-balance'>
                    &ldquo;Success is where preparation and opportunity meet.&rdquo;
                </blockquote>
                <p className='text-[14px] sm:text-[15.5px] text-accent font-medium tracking-wide mt-3 transition-colors duration-300'>
                    &mdash; Bobby Unser
                </p>
            </div>
        </section>
    )
}

/* ============================================================ ABOUT ============================================================ */
function About() {
    const ref = useReveal('.about-reveal', { blur: true, y: 18, stagger: 0.1 })
    const imgRef = useRef(null)
    useEffect(() => {
        if (REDUCE_MOTION || !imgRef.current) return
        const ctx = gsap.context(() => {
            gsap.fromTo(imgRef.current, { opacity: 0, scale: 0.9, y: 30 }, {
                opacity: 1, scale: 1, y: 0, duration: 1, ease: 'power3.out',
                scrollTrigger: { trigger: imgRef.current, start: 'top 82%', once: true },
            })
        }, imgRef)
        return () => ctx.revert()
    }, [])

    return (
        <section id='about' ref={ref} className='scroll-mt-20 max-w-[1280px] mx-auto px-6 lg:px-8 pt-10 pb-16 sm:pb-20'>
            <div className='grid lg:grid-cols-[0.85fr_1.15fr] gap-16 items-center'>
                <div className='about-reveal'>
                    <p className={EYEBROW}>About Us</p>
                    <h2 className={`${H2} mb-5`}>One hub for every side of hiring.</h2>
                    <p className='text-text-secondary text-[16px] leading-relaxed mb-4'>
                        We believe hiring should be intelligent, fair and fast. WorkmateIQ brings organizations, colleges and candidates into one platform to evaluate and move talent forward — clearly, and without the usual friction.
                    </p>
                    <p className='text-text-secondary text-[15px] leading-relaxed'>
                        Every registration, onboarding link and review moves through the same connected hub — so nothing gets lost between the people trying to find each other.
                    </p>
                </div>
                <div ref={imgRef} className='relative group cursor-pointer'>
                    <div className='absolute inset-0 scale-90 opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-70' style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
                    <img src={isometricAudience} alt='WorkmateIQ connecting organizations, colleges and candidates around one hub' className='relative w-full h-auto animate-float transition-all duration-500 group-hover:scale-[1.04] group-hover:drop-shadow-[0_25px_50px_rgba(196,22,31,0.55)]' style={{ animationDuration: '8s' }} />
                </div>
            </div>
        </section>
    )
}

function ValuesStrip() {
    const ref = useReveal('.value-item', { stagger: 0.06, y: 14 })
    const values = [
        ['intelligence', 'Intelligence First', 'We build for clarity, not complexity — every feature earns its place.'],
        ['fairness', 'Fairness & Inclusion', 'Every organization, college and candidate is treated with the same rigor.'],
        ['speed', 'Speed & Efficiency', 'A journey that used to take weeks should take days.'],
        ['security', 'Security & Trust', 'Professional information is handled with real, structured care.'],
    ]
    return (
        <section ref={ref} className='bg-card border-y border-line py-10 sm:py-12'>
            <div className='max-w-[1280px] mx-auto px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
                {values.map(([illustration, t, d]) => (
                    <div key={t} className='value-item p-5 rounded-2xl transition-all duration-300 hover:bg-bg hover:-translate-y-1'>
                        <MarketingIllustration type={illustration} className='h-14 w-20 mb-2' />
                        <h4 className='font-display text-ink text-[15px] font-bold mb-2'>{t}</h4>
                        <p className='text-text-secondary text-[13.5px] leading-relaxed'>{d}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}

/* ============================================================ HOW IT WORKS ============================================================ */
function HowItWorks() {
    return <JourneySection />
}

/* ============================================================ AI / ENTERPRISE ============================================================ */
const enterpriseCapabilities = [
    ['security', 'Enterprise Security', 'SOC 2-aligned practices, encrypted storage and controlled access at every layer.'],
    ['speed', 'Fast by Design', 'Registrations, onboarding links and reviews move in minutes, not weeks.'],
    ['analytics', 'Real-Time Analytics', 'Every organization, college and candidate sees live progress on their journey.'],
]

function EnterpriseAI() {
    const ref = useReveal('.ent-item', { stagger: 0.08, y: 18 })
    const [activeCapability, setActiveCapability] = useState(0)

    useEffect(() => {
        if (REDUCE_MOTION) return
        const timer = window.setInterval(() => {
            setActiveCapability((current) => (current + 1) % enterpriseCapabilities.length)
        }, 4200)
        return () => window.clearInterval(timer)
    }, [])

    const [illustration, title, description] = enterpriseCapabilities[activeCapability]

    return (
        <section className='bg-card border-y border-line py-28 overflow-hidden relative'>
            <FiberBurstCanvas />
            <div ref={ref} className='relative z-10 max-w-[1280px] mx-auto px-6 lg:px-8'>
                <div className='grid lg:grid-cols-2 gap-16 items-center mb-20'>
                    <div className='ent-item'>
                        <p className={EYEBROW}>Enterprise capabilities</p>
                        <h2 className={`${H2} mb-5`}>Built for real screening speed.</h2>
                        <p className='text-text-secondary text-[16px] leading-relaxed max-w-md'>
                            Every score, note and decision is generated the moment an interview ends — organizations see clear, comparable insight instead of a pile of recordings to review later.
                        </p>
                    </div>
                    <div className='ent-item'>
                        <AIScorePanel />
                    </div>
                </div>
                <div className='mx-auto max-w-[720px]'>
                    <div className='relative min-h-[265px]'>
                        <AnimatePresence mode='wait' initial={false}>
                            <Motion.article
                                key={title}
                                initial={{ opacity: 0, y: 22, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -18, scale: 0.98 }}
                                transition={{ duration: REDUCE_MOTION ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
                                className='capability-card mx-auto flex min-h-[250px] w-full max-w-[520px] flex-col justify-center rounded-2xl border border-line bg-bg p-7 shadow-[0_24px_70px_-35px_rgba(125,39,49,0.38)] sm:p-9'
                                aria-live='polite'
                            >
                                <MarketingIllustration type={illustration} className='mb-4 h-16 w-24 animate-breathe' />
                                <h3 className='font-display text-[21px] font-bold text-ink sm:text-[23px]'>{title}</h3>
                                <p className='mt-2 max-w-[580px] text-[15px] leading-relaxed text-text-secondary'>{description}</p>
                            </Motion.article>
                        </AnimatePresence>
                    </div>
                    <div className='mt-6 flex justify-center gap-2' aria-label='Enterprise capability rotation'>
                        {enterpriseCapabilities.map(([, capabilityTitle], index) => (
                            <span key={capabilityTitle} className={`h-1.5 rounded-full transition-all duration-500 ${index === activeCapability ? 'w-9 bg-accent' : 'w-1.5 bg-accent/20'}`} aria-hidden='true' />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ============================================================ SOLUTIONS ============================================================ */
const workflowModules = {
    colleges: {
        eyebrow: 'Placement pipeline',
        steps: ['Students', 'Verified roles', 'Placement', 'Outcome'],
        note: 'A connected path from campus to opportunity.',
        tags: ['Structured', 'Connected', 'Visible'],
    },
    candidates: {
        eyebrow: 'Candidate journey',
        steps: ['Profile', 'Discover', 'Interview', 'Grow'],
        note: 'Keep every important step in one professional story.',
        tags: ['Experience', 'Potential', 'Progress'],
    },
    organizations: {
        eyebrow: 'Talent workflow',
        steps: ['Discover', 'Screen', 'Interview', 'Onboard'],
        note: 'Move qualified people forward with less friction.',
        tags: ['Clarity', 'Momentum', 'Team fit'],
    },
}

function WorkflowModule({ type }) {
    const module = workflowModules[type]

    return (
        <div className='solution-module relative overflow-hidden rounded-[24px] border border-accent/15 bg-white/55 p-5 sm:p-6'>
            <div className='flex items-center justify-between gap-4'>
                <span className='font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent'>{module.eyebrow}</span>
                <span className='inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.04] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-text-secondary'>
                    <span className='h-1.5 w-1.5 rounded-full bg-accent' aria-hidden='true' />
                    Connected path
                </span>
            </div>

            <div className='relative mt-7'>
                <div className='absolute left-[7%] right-[7%] top-4 hidden h-px bg-accent/15 sm:block' aria-hidden='true' />
                <div className='absolute left-[7%] top-4 hidden h-px w-[29%] bg-accent/65 sm:block' aria-hidden='true' />
                <ol className='relative grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-2'>
                    {module.steps.map((step, index) => (
                        <li key={step} className='group flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center'>
                            <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-300 group-hover:-translate-y-0.5 ${index === 0 ? 'border-accent bg-accent text-white shadow-[0_0_0_5px_rgba(196,22,31,0.08)]' : 'border-accent/25 bg-[#fffafa] text-accent group-hover:border-accent/60'}`}>
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className='text-[12px] font-semibold leading-tight text-ink'>{step}</span>
                        </li>
                    ))}
                </ol>
            </div>

            <div className='mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line/70 pt-4'>
                <p className='max-w-[360px] text-[12px] leading-relaxed text-text-secondary'>{module.note}</p>
                <div className='flex flex-wrap gap-2'>
                    {module.tags.map((tag) => <span key={tag} className='rounded-full bg-accent/[0.06] px-2.5 py-1 text-[10px] font-medium text-accent/80'>{tag}</span>)}
                </div>
            </div>
        </div>
    )
}

function FeaturePoint({ feature, index }) {
    const [illustration, title, description] = feature
    return (
        <div className='solution-feature group rounded-2xl border border-line/80 bg-white/45 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:bg-white hover:shadow-[0_16px_34px_-24px_rgba(125,39,49,0.45)]'>
            <div className='flex items-start justify-between gap-3'>
                <MarketingIllustration type={illustration} className='h-11 w-14 text-accent transition-transform duration-300 group-hover:scale-[1.04]' />
                <span className='font-mono text-[10px] font-semibold tracking-[0.16em] text-accent/65'>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <h4 className='mt-3 font-display text-[15px] font-bold leading-tight text-ink'>{title}</h4>
            <p className='mt-1.5 text-[12.5px] leading-relaxed text-text-secondary'>{description}</p>
        </div>
    )
}

function SolutionPanel({ p, i, jump }) {
    const panelRef = useRef(null)
    const cardRef = useRef(null)

    useEffect(() => {
        if (REDUCE_MOTION || !panelRef.current || !cardRef.current) return

        const ctx = gsap.context(() => {
            const introItems = cardRef.current.querySelectorAll('.solution-intro > *')
            const featureItems = cardRef.current.querySelectorAll('.solution-feature')
            const module = cardRef.current.querySelector('.solution-module')

            gsap.set([...introItems, ...featureItems, module], { opacity: 0, y: 18 })
            ScrollTrigger.create({
                trigger: panelRef.current,
                start: 'top 78%',
                once: true,
                onEnter: () => {
                    gsap.to(introItems, { opacity: 1, y: 0, duration: 0.65, stagger: 0.07, ease: 'power3.out' })
                    gsap.to(featureItems, { opacity: 1, y: 0, duration: 0.55, delay: 0.16, stagger: 0.08, ease: 'power3.out' })
                    gsap.to(module, { opacity: 1, y: 0, duration: 0.7, delay: 0.1, ease: 'power3.out' })
                },
            })
            gsap.to(cardRef.current, {
                scale: 0.975,
                opacity: 0.86,
                y: -8,
                ease: 'none',
                scrollTrigger: {
                    trigger: panelRef.current,
                    start: 'top 12%',
                    end: 'top -12%',
                    scrub: 0.8,
                },
            })
        }, panelRef)

        return () => ctx.revert()
    }, [])

    return (
        <article ref={panelRef} id={p.id} className={`panel sticky top-24 relative scroll-mt-20 pt-4 lg:top-28 ${i < 2 ? 'min-h-[86vh] lg:min-h-[90vh]' : 'min-h-0'}`} style={{ zIndex: i + 1 }}>
                <div ref={cardRef} className={`solution-card relative overflow-hidden rounded-[28px] border border-line/80 p-6 shadow-[0_24px_70px_-42px_rgba(125,39,49,0.48)] sm:p-8 lg:p-10 xl:p-12 ${p.surface}`}>
                    <div className='pointer-events-none absolute right-[-80px] top-[-100px] h-[250px] w-[250px] rounded-full border border-accent/10' aria-hidden='true' />
                    <div className='pointer-events-none absolute bottom-[-120px] left-[32%] h-[220px] w-[220px] rounded-full bg-accent/[0.035] blur-3xl' aria-hidden='true' />

                    <div className='relative grid gap-9 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 xl:gap-16'>
                        <div className='solution-intro flex flex-col'>
                            <div className='flex items-start justify-between gap-5'>
                                <MarketingIllustration type={p.icon} className='h-16 w-24' />
                                <span className='rounded-full border border-accent/15 bg-white/55 px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-accent'>0{i + 1} / AUDIENCE</span>
                            </div>
                            <p className='mt-7 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent/75'>{p.eyebrow}</p>
                            <h3 className='mt-3 max-w-[460px] font-display text-[29px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[36px]'>{p.label}</h3>
                            <p className='mt-5 max-w-[480px] text-[15.5px] leading-relaxed text-text-secondary'>{p.copy}</p>
                            <div className='mt-8 lg:mt-auto lg:pt-12'>
                                <CTAButton variant='secondary' onClick={jump('contact')}>{p.label}</CTAButton>
                            </div>
                        </div>

                        <div className='min-w-0'>
                            <WorkflowModule type={p.module} />
                            <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                                {p.features.map((feature, index) => <FeaturePoint key={feature[1]} feature={feature} index={index} />)}
                            </div>
                        </div>
                    </div>
                </div>
        </article>
    )
}

/* ============================================================ FAQ ============================================================ */
function FaqItem({ q, a }) {
    const [open, setOpen] = useState(false)
    return (
        <div className='faq-item border-b border-line'>
            <button onClick={() => setOpen(!open)} className='w-full flex items-center justify-between text-left py-5 px-3 -mx-3 rounded-xl transition-colors hover:bg-card cursor-pointer group'>
                <span className='text-[15.5px] font-medium text-ink group-hover:text-accent transition-colors'>{q}</span>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${open ? 'bg-accent text-white rotate-180' : 'bg-accent/10 text-accent'}`}>
                    <ChevronDown size={14} />
                </span>
            </button>
            <div className='grid transition-[grid-template-rows] duration-300 ease-out' style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                <div className='overflow-hidden'>
                    <p className='text-text-secondary text-[14.5px] leading-relaxed pb-5 px-3 -mx-3 max-w-2xl'>{a}</p>
                </div>
            </div>
        </div>
    )
}

/* ============================================================ CONTACT FORM ============================================================ */
function EnquiryForm() {
    const ref = useReveal('.form-el')
    const [form, setForm] = useState({ name: '', email: '', mobile: '', clientType: 'Organization', subject: '', message: '' })
    const [status, setStatus] = useState('idle')
    const [error, setError] = useState('')
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
    const inputCls = 'w-full bg-bg border border-line rounded-xl px-4 py-3.5 text-[15px] text-ink placeholder-text-secondary/60 focus:ring-2 focus:ring-accent/25 focus:border-accent outline-none transition-all'

    const submit = async (e) => {
        e.preventDefault()
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return
        setStatus('sending')
        setError('')
        try {
            await submitPlatformEnquiry({
                name: form.name,
                email: form.email,
                phone: form.mobile || undefined,
                type: form.clientType.toUpperCase(),
                message: form.subject ? `${form.subject}\n\n${form.message}` : form.message,
            })
            setStatus('done')
        } catch (err) {
            setError(err.message || 'Failed to submit enquiry.')
            setStatus('error')
        }
    }

    return (
        <div ref={ref} className='max-w-[640px] mx-auto'>
            {status === 'done' ? (
                <div className='form-el bg-bg border border-line rounded-2xl p-8 text-center'>
                    <p className='text-ink text-[19px] font-semibold mb-2'>Thank you, {form.name}.</p>
                    <p className='text-text-secondary text-[14.5px]'>Your enquiry has been received. Our team will contact you shortly.</p>
                </div>
            ) : (
                <form onSubmit={submit} className='form-el space-y-4'>
                    <div className='grid sm:grid-cols-2 gap-4'>
                        <input required placeholder='Name' value={form.name} onChange={set('name')} className={inputCls} />
                        <input required type='email' placeholder='Email' value={form.email} onChange={set('email')} className={inputCls} />
                    </div>
                    <div className='grid sm:grid-cols-2 gap-4'>
                        <input placeholder='Mobile number' value={form.mobile} onChange={set('mobile')} className={inputCls} />
                        <select value={form.clientType} onChange={set('clientType')} className={inputCls}>
                            <option value='Organization'>Company / Organization</option>
                            <option value='College'>College / Institution</option>
                            <option value='Candidate'>Candidate</option>
                        </select>
                    </div>
                    <input placeholder='Subject' value={form.subject} onChange={set('subject')} className={inputCls} />
                    <textarea required rows={4} placeholder='Message' value={form.message} onChange={set('message')} className={`${inputCls} resize-none`} />
                    {status === 'error' && <p className='text-[13px] text-red-500'>{error}</p>}
                    <Button type='submit' size='lg' disabled={status === 'sending'} className='w-full'>
                        {status === 'sending' ? 'Submitting...' : 'Submit Enquiry'}
                    </Button>
                </form>
            )}
        </div>
    )
}

/* ============================================================ PAGE ============================================================ */
function WHome() {
    const [showThreadsHero] = useState(() => (
        typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('hero') === 'threads'
    ))
    const planRef = useReveal('.plan')
    const faqRef = useReveal('.faq-item', { y: 12 })

    const jump = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

    const panels = [
        {
            id: 'colleges', icon: 'college', eyebrow: 'For education', module: 'colleges', surface: 'bg-[#fff8f8]', label: 'For Colleges & Institutions',
            copy: 'Connect students with organizations and create structured pathways from education to opportunity.',
            features: [['resume', 'Student Opportunities', 'Connect students to verified organizations and roles.'], ['organization', 'Institutional Tools', 'Manage placements, drives and communications.'], ['candidate', 'Better Outcomes', 'Improve placement rates and student success.']],
        },
        {
            id: 'candidates', icon: 'candidate', eyebrow: 'For people building what is next', module: 'candidates', surface: 'bg-[#fffafa]', label: 'For Candidates',
            copy: 'Present your potential, experience and aspirations in one professional journey.',
            features: [['resume', 'Build Your Profile', 'Highlight skills, experience and achievements.'], ['speed', 'Discover Opportunities', 'Find relevant roles at verified organizations.'], ['analytics', 'Grow Your Career', 'Track progress and unlock new possibilities.']],
        },
        {
            id: 'organizations', icon: 'organization', eyebrow: 'For teams that move talent forward', module: 'organizations', surface: 'bg-[#fbf7f7]', label: 'For Organizations',
            copy: 'Build stronger talent pipelines, simplify onboarding and create a clearer path from candidate to contributor.',
            features: [['speed', 'Streamline Hiring', 'End-to-end hiring workflow that saves time.'], ['security', 'Smart Onboarding', 'Personalized onboarding that boosts engagement.'], ['analytics', 'Stronger Teams', 'Data-driven insights for better team decisions.']],
        },
    ]

    const plans = [
        { name: 'Starter', price: '₹4,999', period: '/month', desc: 'For smaller teams getting started.', features: ['Up to 25 active journeys', 'Email support', 'Standard onboarding flows'] },
        { name: 'Growth', price: '₹9,999', period: '/month', desc: 'For growing organizations managing larger talent journeys.', features: ['Unlimited active journeys', 'Priority support', 'Custom onboarding flows', 'WhatsApp + email delivery'], featured: true },
        { name: 'Enterprise', price: 'Custom', period: '', desc: 'For organizations requiring a tailored deployment.', features: ['Dedicated onboarding', 'Custom integrations', 'SLA-backed support'] },
    ]

    const faqs = [
        ['Can I upgrade or downgrade my plan at any time?', 'Yes — changes take effect from your next billing cycle, and we\'ll prorate the difference.'],
        ['Do you offer special pricing for academic institutions?', 'Yes — mention your institution in the enquiry form below for tailored pricing.'],
        ['Is candidate data encrypted?', 'All data in transit and at rest is encrypted; access is scoped per organization.'],
    ]

    return (
        <WorkmateLayout>
            <Hero jump={jump} experimental={showThreadsHero} />
            <QuoteStrip />
            <About />
            <ValuesStrip />
            <HowItWorks />
            <EnterpriseAI />

            {/* ============ SOLUTIONS ============ */}
            <section id='solutions' className='scroll-mt-20 max-w-[1280px] mx-auto px-6 lg:px-8 pt-28 pb-10'>
                <p className={`${EYEBROW} justify-center flex`}>Solutions</p>
                <h2 className={`${H2} max-w-2xl mx-auto text-center`}>Built around the people who move work forward.</h2>
            </section>

            <div className='max-w-[1280px] mx-auto px-6 lg:px-8 pb-28 space-y-0'>
                {panels.map((p, i) => <SolutionPanel key={p.id} p={p} i={i} jump={jump} />)}
            </div>

            {/* ============ PRICING ============ */}
            <section id='pricing' className='scroll-mt-20 max-w-[1280px] mx-auto px-6 lg:px-8 py-28'>
                <p className={`${EYEBROW} justify-center flex`}>Pricing</p>
                <h2 className={`${H2} mb-4 text-center`}>Simple, transparent pricing.</h2>
                <p className='text-text-secondary text-[16px] mb-16 text-center'>Choose the plan that fits how you hire, place or apply.</p>

                <div ref={planRef} className='grid md:grid-cols-3 gap-6 mb-20'>
                    {plans.map((p) => (
                        <div key={p.name} className={`plan pricing-card rounded-2xl p-8 border ${p.featured ? 'pricing-card-growth gradient-border-sweep border-transparent bg-accent/[0.03]' : 'border-line bg-card'}`}>
                            {p.featured && <p className='text-[11px] text-accent font-semibold uppercase tracking-wide mb-3'>Most popular</p>}
                            <h3 className='font-display text-ink text-[19px] font-bold mb-1'>{p.name}</h3>
                            <p className='text-text-secondary text-[13.5px] mb-5'>{p.desc}</p>
                            <p className='font-display text-ink text-[34px] font-bold mb-6'>{p.price}<span className='text-[15px] text-text-secondary font-normal'>{p.period}</span></p>
                            <ul className='space-y-2.5 mb-8'>
                                {p.features.map((f) => <li key={f} className='text-text-secondary text-[13.5px] flex items-start gap-2'><span className='text-accent mt-0.5'>—</span>{f}</li>)}
                            </ul>
                            <Button variant={p.featured ? 'primary' : 'secondary'} className={`pricing-card-cta w-full`} onClick={jump('contact')}>
                                {p.name === 'Enterprise' ? 'Talk to us' : 'Get Started'}
                            </Button>
                        </div>
                    ))}
                </div>

                <div ref={faqRef} className='max-w-[720px] mx-auto'>
                    <h3 className='font-display text-[20px] font-bold text-ink mb-6'>Frequently asked questions</h3>
                    {faqs.map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}
                </div>
            </section>

            {/* ============ CONTACT ============ */}
            <section id='contact' className='scroll-mt-20 relative pt-28 pb-28 overflow-hidden'>
                <div className='absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[460px] rounded-full opacity-[0.10] blur-3xl pointer-events-none'
                    style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
                <NetworkGraphic className='absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[420px] opacity-60 pointer-events-none' />
                <div className='relative max-w-[900px] mx-auto px-6 text-center mb-14'>
                    <p className={`${EYEBROW} justify-center flex`}>Contact</p>
                    <h2 className={`${H2} mb-5`}>Let's build better talent journeys.</h2>
                    <p className='text-text-secondary text-[16px]'>Start your WorkmateIQ journey today — tell us a bit about you below.</p>
                </div>
                <div className='relative px-6'>
                    <div className='max-w-[640px] mx-auto bg-card border border-line rounded-3xl p-8 sm:p-10 shadow-lift'>
                        <EnquiryForm />
                    </div>
                </div>
            </section>
        </WorkmateLayout>
    )
}

export default WHome
