import React, { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import WorkmateLayout from './WorkmateLayout'
import useReveal, { useParallax } from './useReveal'
import Button from '../../components/Button'
import AIScorePanel from './AIScorePanel'
import NetworkGraphic from './NetworkGraphic'
import { submitEnquiry } from '../../utils/enquiryApi'
import {
    ArrowRight, Building2, GraduationCap, User, ShieldCheck, Zap, LineChart,
    FileText, Users, Star, ChevronDown, Sparkles, Scale, Lock, TrendingUp,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)
const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

import handsConnect from '../../assets/workmate/hands-connect.jpg'
import isometricAudience from '../../assets/workmate/isometric-audience.jpg'
import journeyPath from '../../assets/workmate/journey-path.jpg'
import journeyDesk from '../../assets/workmate/journey-desk.jpg'
import collegeNetwork from '../../assets/workmate/college-network.jpg'
import candidateInterview from '../../assets/workmate/candidate-interview.jpg'
import journeyArch from '../../assets/workmate/journey-arch.jpg'

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
function Hero({ jump }) {
    const heroRef = useReveal('.reveal')
    const wrapRef = useRef(null)

    useEffect(() => {
        if (REDUCE_MOTION || !wrapRef.current) return
        const el = wrapRef.current
        const onMove = (e) => {
            const r = el.getBoundingClientRect()
            const px = (e.clientX - r.left) / r.width - 0.5
            const py = (e.clientY - r.top) / r.height - 0.5
            gsap.to('.hero-tilt', { rotateY: px * 6, rotateX: -py * 6, duration: 0.6, ease: 'power2.out' })
        }
        el.addEventListener('mousemove', onMove)
        return () => el.removeEventListener('mousemove', onMove)
    }, [])

    return (
        <section id='home' className='scroll-mt-20 relative overflow-hidden'>
            <div className='absolute top-[-160px] left-[8%] w-[620px] h-[560px] rounded-full opacity-[0.14] blur-3xl pointer-events-none'
                style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
            <div className='absolute top-[60px] right-[-160px] w-[380px] h-[380px] rounded-full opacity-[0.07] blur-3xl pointer-events-none'
                style={{ background: 'radial-gradient(closest-side, #e0271b, transparent)' }} />

            <div className='relative max-w-[1280px] mx-auto px-6 lg:px-8 pt-32 sm:pt-36 pb-24 grid lg:grid-cols-[1fr_1.05fr] gap-14 items-center'>
                <div ref={heroRef}>
                    <p className={`reveal ${EYEBROW} inline-flex items-center gap-2`}>
                        <span className='w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow' />
                        Workmate.IQ
                    </p>
                    <h1 className='reveal font-display text-[42px] sm:text-[62px] font-bold text-ink leading-[1.03] tracking-tight mb-6'>
                        Where <span className='gradient-brand-text'>better talent journeys</span> begin.
                    </h1>
                    <p className='reveal text-[18px] text-text-secondary leading-relaxed max-w-lg mb-9'>
                        One intelligent platform for hiring, onboarding and connecting people with opportunity — from first interaction to first day.
                    </p>
                    <div className='reveal flex flex-wrap gap-3'>
                        <CTAButton size='lg' onClick={jump('contact')}>Get Started</CTAButton>
                        <Button size='lg' variant='secondary' onClick={jump('how-it-works')}>Explore Workmate.IQ</Button>
                    </div>
                </div>

                <div ref={wrapRef} className='relative' style={{ perspective: '1200px' }}>
                    <div className='hero-tilt relative' style={{ transformStyle: 'preserve-3d' }}>
                        <div className='rounded-[28px] overflow-hidden border border-line shadow-[0_30px_80px_-24px_rgba(30,10,12,0.25)] bg-card'>
                            <img src={handsConnect} alt='Organizations, colleges and candidates connected through Workmate.IQ' className='w-full h-auto' style={{ filter: 'contrast(1.12) saturate(1.18) brightness(1.02)' }} />
                        </div>
                    </div>
                </div>
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
        <section id='about' ref={ref} className='scroll-mt-20 max-w-[1280px] mx-auto px-6 lg:px-8 py-28'>
            <div className='grid lg:grid-cols-[0.85fr_1.15fr] gap-16 items-center'>
                <div className='about-reveal'>
                    <p className={EYEBROW}>About Us</p>
                    <h2 className={`${H2} mb-5`}>One hub for every side of hiring.</h2>
                    <p className='text-text-secondary text-[16px] leading-relaxed mb-4'>
                        We believe hiring should be intelligent, fair and fast. Workmate.IQ brings organizations, colleges and candidates into one platform to evaluate and move talent forward — clearly, and without the usual friction.
                    </p>
                    <p className='text-text-secondary text-[15px] leading-relaxed'>
                        Every registration, onboarding link and review moves through the same connected hub — so nothing gets lost between the people trying to find each other.
                    </p>
                </div>
                <div ref={imgRef} className='relative'>
                    <div className='absolute inset-0 scale-90 opacity-30 blur-2xl' style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
                    <img src={isometricAudience} alt='Workmate.IQ connecting organizations, colleges and candidates around one hub' className='relative w-full h-auto animate-float' style={{ animationDuration: '8s' }} />
                </div>
            </div>
        </section>
    )
}

function ValuesStrip() {
    const ref = useReveal('.value-item', { stagger: 0.06, y: 14 })
    const values = [
        [Sparkles, 'Intelligence First', 'We build for clarity, not complexity — every feature earns its place.'],
        [Scale, 'Fairness & Inclusion', 'Every organization, college and candidate is treated with the same rigor.'],
        [Zap, 'Speed & Efficiency', 'A journey that used to take weeks should take days.'],
        [Lock, 'Security & Trust', 'Professional information is handled with real, structured care.'],
    ]
    return (
        <section ref={ref} className='bg-card border-y border-line py-16'>
            <div className='max-w-[1280px] mx-auto px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
                {values.map(([Icon, t, d]) => (
                    <div key={t} className='value-item p-5 rounded-2xl transition-all duration-300 hover:bg-bg hover:-translate-y-1'>
                        <div className='w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3.5'>
                            <Icon size={16} />
                        </div>
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
    const ref = useReveal('.hiw-reveal', { y: 20 })
    const imgRef = useRef(null)
    useEffect(() => {
        if (REDUCE_MOTION || !imgRef.current) return
        const ctx = gsap.context(() => {
            gsap.fromTo(imgRef.current, { opacity: 0, y: 50, scale: 0.96 }, {
                opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out',
                scrollTrigger: { trigger: imgRef.current, start: 'top 85%', once: true },
            })
        }, imgRef)
        return () => ctx.revert()
    }, [])

    const steps = ['Discover', 'Connect', 'Register', 'Onboard', 'Review', 'Move Forward']

    return (
        <section id='how-it-works' ref={ref} className='scroll-mt-20 max-w-[1280px] mx-auto px-6 lg:px-8 py-28'>
            <div className='hiw-reveal text-center mb-14'>
                <p className={`${EYEBROW} justify-center flex`}>The Platform Journey</p>
                <h2 className={`${H2} max-w-2xl mx-auto`}>From first conversation to first opportunity.</h2>
            </div>

            <div ref={imgRef} className='relative'>
                <div className='absolute inset-x-10 -bottom-6 top-10 rounded-[32px] opacity-40 blur-3xl' style={{ background: 'radial-gradient(closest-side, #f0938f, transparent)' }} />
                <div className='relative rounded-[28px] overflow-hidden border border-line shadow-[0_30px_80px_-24px_rgba(30,10,12,0.2)]'>
                    <img src={journeyPath} alt='The Workmate.IQ journey: discover, connect, register, onboard, review, move forward' className='w-full h-auto' />
                </div>
            </div>

            <div className='hiw-reveal flex flex-wrap justify-center gap-2 mt-8'>
                {steps.map((s, i) => (
                    <span key={s} className='inline-flex items-center gap-2 text-[12.5px] text-text-secondary'>
                        <span className='text-accent font-mono font-semibold'>{String(i + 1).padStart(2, '0')}</span> {s}
                        {i < steps.length - 1 && <span className='text-line mx-1'>—</span>}
                    </span>
                ))}
            </div>
        </section>
    )
}

/* ============================================================ AI / ENTERPRISE ============================================================ */
function EnterpriseAI() {
    const ref = useReveal('.ent-item', { stagger: 0.08, y: 18 })
    const capabilities = [
        [ShieldCheck, 'Enterprise Security', 'SOC 2-aligned practices, encrypted storage and controlled access at every layer.'],
        [Zap, 'Fast by Design', 'Registrations, onboarding links and reviews move in minutes, not weeks.'],
        [TrendingUp, 'Real-Time Analytics', 'Every organization, college and candidate sees live progress on their journey.'],
    ]
    return (
        <section className='bg-card border-y border-line py-28 overflow-hidden'>
            <div ref={ref} className='max-w-[1280px] mx-auto px-6 lg:px-8'>
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
                <div className='grid sm:grid-cols-3 gap-6'>
                    {capabilities.map(([Icon, t, d]) => (
                        <div key={t} className='ent-item bg-bg border border-line rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift hover:border-accent/25'>
                            <div className='w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4 animate-breathe'>
                                <Icon size={17} />
                            </div>
                            <h3 className='font-display text-[16.5px] font-bold text-ink mb-2'>{t}</h3>
                            <p className='text-text-secondary text-[14px] leading-relaxed'>{d}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ============================================================ SOLUTIONS ============================================================ */
function SolutionPanel({ p, i, jump }) {
    const cardRef = useRef(null)
    useEffect(() => {
        if (REDUCE_MOTION || !cardRef.current) return
        const el = cardRef.current
        const onMove = (e) => {
            const r = el.getBoundingClientRect()
            const px = (e.clientX - r.left) / r.width - 0.5
            const py = (e.clientY - r.top) / r.height - 0.5
            gsap.to(el.querySelector('.tilt-img'), { rotateY: px * 8, rotateX: -py * 8, duration: 0.5, ease: 'power2.out' })
        }
        const onLeave = () => gsap.to(el.querySelector('.tilt-img'), { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power2.out' })
        el.addEventListener('mousemove', onMove)
        el.addEventListener('mouseleave', onLeave)
        return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave) }
    }, [])

    return (
        <div key={p.id} id={p.id} className='panel scroll-mt-20'>
            <div className={`grid lg:grid-cols-2 gap-12 items-center mb-8 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div ref={cardRef} className='relative' style={{ perspective: '1000px' }}>
                    <div className='tilt-img rounded-2xl overflow-hidden border border-line shadow-soft' style={{ transformStyle: 'preserve-3d' }}>
                        <img src={p.img} alt={p.label} className='w-full h-auto' />
                    </div>
                </div>
                <div>
                    <div className='w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-5'>
                        <p.icon size={19} />
                    </div>
                    <h3 className='font-display text-[25px] font-bold text-ink mb-4'>{p.label}</h3>
                    <p className='text-text-secondary text-[16px] leading-relaxed max-w-md mb-7'>{p.copy}</p>
                    <CTAButton variant='secondary' onClick={jump('contact')}>{p.label}</CTAButton>
                </div>
            </div>
            <div className='grid sm:grid-cols-3 gap-6 border-t border-line pt-8'>
                {p.features.map(([Icon, t, d]) => (
                    <div key={t}>
                        <div className='w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3 transition-transform duration-300 hover:scale-110'>
                            <Icon size={14} />
                        </div>
                        <h4 className='font-display text-[14.5px] font-bold text-ink mb-1'>{t}</h4>
                        <p className='text-text-secondary text-[13.5px] leading-relaxed'>{d}</p>
                    </div>
                ))}
            </div>
        </div>
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
            await submitEnquiry(form)
            setStatus('done')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit enquiry.')
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
    const panelRef = useReveal('.panel')
    const planRef = useReveal('.plan')
    const faqRef = useReveal('.faq-item', { y: 12 })
    const ctaImgRef = useParallax('.cta-parallax', { distance: 50 })

    const jump = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

    const panels = [
        {
            id: 'organizations', icon: Building2, label: 'For Organizations', img: journeyDesk,
            copy: 'Build stronger talent pipelines, simplify onboarding and create a clearer path from candidate to contributor.',
            features: [[Zap, 'Streamline Hiring', 'End-to-end hiring workflow that saves time.'], [ShieldCheck, 'Smart Onboarding', 'Personalized onboarding that boosts engagement.'], [LineChart, 'Stronger Teams', 'Data-driven insights for better team decisions.']],
        },
        {
            id: 'colleges', icon: GraduationCap, label: 'For Colleges & Institutions', img: collegeNetwork,
            copy: 'Connect students with organizations and create structured pathways from education to opportunity.',
            features: [[FileText, 'Student Opportunities', 'Connect students to verified organizations and roles.'], [Users, 'Institutional Tools', 'Manage placements, drives and communications.'], [Star, 'Better Outcomes', 'Improve placement rates and student success.']],
        },
        {
            id: 'candidates', icon: User, label: 'For Candidates', img: candidateInterview,
            copy: 'Present your potential, experience and aspirations in one professional journey.',
            features: [[FileText, 'Build Your Profile', 'Highlight skills, experience and achievements.'], [Zap, 'Discover Opportunities', 'Find relevant roles at verified organizations.'], [Star, 'Grow Your Career', 'Track progress and unlock new possibilities.']],
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
            <Hero jump={jump} />
            <About />
            <ValuesStrip />
            <HowItWorks />
            <EnterpriseAI />

            {/* ============ SOLUTIONS ============ */}
            <section id='solutions' className='scroll-mt-20 max-w-[1280px] mx-auto px-6 lg:px-8 pt-28 pb-10'>
                <p className={`${EYEBROW} justify-center flex`}>Solutions</p>
                <h2 className={`${H2} max-w-2xl mx-auto text-center`}>Built around the people who move work forward.</h2>
            </section>

            <div ref={panelRef} className='max-w-[1280px] mx-auto px-6 lg:px-8 pb-28 space-y-28'>
                {panels.map((p, i) => <SolutionPanel key={p.id} p={p} i={i} jump={jump} />)}
            </div>

            {/* ============ VISUAL STORY ============ */}
            <section ref={ctaImgRef} className='parallax-wrap relative py-32 overflow-hidden'>
                <img src={journeyArch} alt='' className='cta-parallax absolute inset-0 w-full h-[130%] -top-[15%] object-cover will-change-transform' />
                <div className='absolute inset-0 bg-white/72' />
                <div className='relative max-w-[900px] mx-auto px-6 text-center'>
                    <h2 className='font-display text-[28px] sm:text-[42px] font-bold text-ink mb-4 leading-[1.15]'>Potential is everywhere. The right connection changes everything.</h2>
                    <p className='text-text-secondary text-[16px] mb-8'>Join the organizations, colleges and candidates already building better journeys with Workmate.IQ.</p>
                    <CTAButton size='lg' onClick={jump('contact')}>Get Started</CTAButton>
                </div>
            </section>

            {/* ============ PRICING ============ */}
            <section id='pricing' className='scroll-mt-20 max-w-[1280px] mx-auto px-6 lg:px-8 py-28'>
                <p className={`${EYEBROW} justify-center flex`}>Pricing</p>
                <h2 className={`${H2} mb-4 text-center`}>Simple, transparent pricing.</h2>
                <p className='text-text-secondary text-[16px] mb-16 text-center'>Choose the plan that fits how you hire, place or apply.</p>

                <div ref={planRef} className='grid md:grid-cols-3 gap-6 mb-20'>
                    {plans.map((p) => (
                        <div key={p.name} className={`plan rounded-2xl p-8 border transition-transform duration-300 hover:-translate-y-1.5 ${p.featured ? 'gradient-border-sweep border-transparent bg-accent/[0.03]' : 'border-line bg-card'}`}>
                            {p.featured && <p className='text-[11px] text-accent font-semibold uppercase tracking-wide mb-3'>Most popular</p>}
                            <h3 className='font-display text-ink text-[19px] font-bold mb-1'>{p.name}</h3>
                            <p className='text-text-secondary text-[13.5px] mb-5'>{p.desc}</p>
                            <p className='font-display text-ink text-[34px] font-bold mb-6'>{p.price}<span className='text-[15px] text-text-secondary font-normal'>{p.period}</span></p>
                            <ul className='space-y-2.5 mb-8'>
                                {p.features.map((f) => <li key={f} className='text-text-secondary text-[13.5px] flex items-start gap-2'><span className='text-accent mt-0.5'>—</span>{f}</li>)}
                            </ul>
                            <Button variant={p.featured ? 'primary' : 'secondary'} className='w-full' onClick={jump('contact')}>
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
                    <p className='text-text-secondary text-[16px]'>Start your Workmate.IQ journey today — tell us a bit about you below.</p>
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
