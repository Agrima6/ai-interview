import React, { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatePresence, motion as Motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import WorkmateLayout from './WorkmateLayout'
import useReveal from './useReveal'
import Button from '../../components/Button'
import AIScorePanel from './AIScorePanel'
import NetworkGraphic from './NetworkGraphic'
import JourneySection from './JourneySection'
import HeroThreadsBackground from './HeroThreadsBackground'
import FiberBurstCanvas from './FiberBurstCanvas'
import MarketingIllustration from '../../components/MarketingIllustration'
import NexaChatbot from '../../components/NexaChatbot'
import InterviewPreview from './InterviewPreview'
import VerticalScrollShowcase from './VerticalScrollShowcase'
import PowerfulFeatures from './PowerfulFeatures'
import institutionImage from '../../assets/workmate/institution-student-screening.png'
import audienceCandidatesImage from '../../assets/workmate/audience-candidates.png'
import organizationRecruitmentImage from '../../assets/workmate/organization-recruitment.png'
import securityIcon from '../../assets/workmate/security.png'
import reliableIcon from '../../assets/workmate/security2.png'
import { submitPlatformEnquiry } from '../../api/enquiriesApi'
import {
    ArrowRight, Building2, Check, ChevronDown, GraduationCap, Network, ShieldCheck, UserRound,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)
const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const H2 = 'type-h2 text-ink'
const EYEBROW = 'type-eyebrow text-accent mb-4'

function CTAButton({ children, ...props }) {
    return (
        <Button {...props} className={`group ${props.className || ''}`}>
            {children}
            <ArrowRight size={16} className='transition-transform duration-300 group-hover:translate-x-1' />
        </Button>
    )
}

function HeroFeatureIcon({ type }) {
    if (type === 'secure') {
        return <img src={securityIcon} alt='' width='15' height='15' className='shrink-0 object-contain' />
    }

    if (type === 'reliable') {
        return <img src={reliableIcon} alt='' width='15' height='15' className='shrink-0 object-contain' />
    }

    return (
        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' className='shrink-0 text-[#ab2323]' aria-hidden='true'>
            {type === 'smart' && (
                <>
                    <path d='m12 3 1.4 4.1a2 2 0 0 0 1.2 1.2L18.7 9.7l-4.1 1.4a2 2 0 0 0-1.2 1.2L12 16.4l-1.4-4.1a2 2 0 0 0-1.2-1.2L5.3 9.7l4.1-1.4a2 2 0 0 0 1.2-1.2L12 3Z' />
                    <path d='m5 16 .5 1.5L7 18l-1.5.5L5 20l-.5-1.5L3 18l1.5-.5L5 16Z' />
                </>
            )}
        </svg>
    )
}

function AboutPointer({ icon: IconComponent, children }) {
    const PointerIcon = IconComponent

    return (
        <div className='about-pointer group flex min-h-[82px] items-start gap-3 transition-transform duration-300 hover:-translate-y-0.5'>
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/[0.07] text-accent transition-all duration-300 group-hover:bg-accent/[0.12] group-hover:shadow-[0_8px_18px_-12px_rgba(196,22,31,0.5)]'>
                <PointerIcon size={19} strokeWidth={1.8} aria-hidden='true' />
            </span>
            <p className='type-body-small pt-0.5 leading-relaxed text-ink'>{children}</p>
        </div>
    )
}

/* ============================================================ HERO ============================================================ */
function Hero({ jump, experimental = false }) {
    const heroRef = useReveal('.reveal')
    const heroAreaRef = useRef(null)
    const wrapRef = useRef(null)
    const navigate = useNavigate()

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

            <div className='workmate-shell relative grid items-center gap-14 pb-16 pt-24 sm:pt-28 lg:grid-cols-[1fr_1.05fr] lg:pb-20 lg:pt-32 xl:gap-16'>
                <div ref={heroRef}>
                    <h1 className='reveal type-display mb-6 max-w-[760px] text-ink'>
                        AI Interviews. <span className='whitespace-nowrap text-accent-dark'>Better Decisions.</span> Faster Hiring.
                    </h1>
                    <p className='reveal type-lead mb-6 max-w-[640px] text-text-secondary'>
                        WorkmateIQ helps organizations, colleges, and candidates conduct AI-powered interviews with full security, evaluate performance, and benchmark results to find the right people faster and and with greater transparency.
                    </p>
                    <div className='reveal mb-8 flex flex-wrap gap-2.5' aria-label='WorkmateIQ platform benefits'>
                        <span className='inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.04] px-3 py-2 type-body-small font-semibold text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent/[0.07]'>
                            <HeroFeatureIcon type='secure' />
                            Secure
                        </span>
                        <span className='inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.04] px-3 py-2 type-body-small font-semibold text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent/[0.07]'>
                            <HeroFeatureIcon type='reliable' />
                            Reliable
                        </span>
                        <span className='inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.04] px-3 py-2 type-body-small font-semibold text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent/[0.07]'>
                            <HeroFeatureIcon type='smart' />
                            Smart
                        </span>
                    </div>
                    <div className='reveal flex flex-wrap gap-3'>
                        <CTAButton size='lg' className='lg:!px-10 lg:!py-[17px]' onClick={jump('contact')}>Send an Enquiry</CTAButton>
                        <Button size='lg' variant='secondary' className='!duration-200 hover:!border-accent hover:!bg-accent/[0.08] hover:!text-accent hover:!shadow-[0_8px_20px_-12px_rgba(196,22,31,0.24)] hover:-translate-y-0.5 lg:!px-10 lg:!py-[17px]' onClick={() => navigate('/platform/register')}>Register</Button>
                        <Button size='lg' variant='secondary' className='!border-accent/15 !bg-accent/[0.025] !duration-200 backdrop-blur-sm hover:!border-accent/30 hover:!bg-accent/[0.06] lg:!px-10 lg:!py-[17px]' onClick={jump('how-it-works')}>Explore WorkmateIQ</Button>
                    </div>
                </div>
                <div ref={wrapRef} className='relative' style={{ perspective: '1200px' }}>
                    <div className='hero-tilt relative' style={{ transformStyle: 'preserve-3d' }}>
                        <InterviewPreview />
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
        <section ref={ref} className='workmate-shell relative py-4 sm:py-6 lg:py-8'>
            <div className='quote-reveal max-w-[820px] mx-auto rounded-2xl border border-accent/40 bg-accent/[0.03] px-7 py-6 sm:px-10 sm:py-8 text-center shadow-[0_0_35px_rgba(196,22,31,0.18),inset_0_0_15px_rgba(196,22,31,0.05)] transition-all duration-300 hover:scale-[1.015] hover:border-accent/80 hover:shadow-[0_0_55px_rgba(196,22,31,0.42),inset_0_0_20px_rgba(196,22,31,0.12)] group cursor-default'>
                <blockquote className='type-h3 text-ink text-balance'>
                    &ldquo;Success is where preparation and opportunity meet.&rdquo;
                </blockquote>
                <p className='type-body-small text-accent font-medium tracking-wide mt-3 transition-colors duration-300'>
                    &mdash; Bobby Unser
                </p>
            </div>
        </section>
    )
}

/* ============================================================ ABOUT ============================================================ */
function About() {
    const ref = useReveal('.about-reveal', { blur: true, y: 18, stagger: 0.1 })
    const valuePoints = [
        [Building2, 'Intelligent and efficient hiring for organizations'],
        [GraduationCap, 'Better preparation and career connections for colleges'],
        [UserRound, 'Skill improvement and personalized feedback for candidates'],
        [Network, 'All workflows connected in one seamless platform'],
        [ShieldCheck, 'Committed to fairness, transparency and a better hiring experience'],
    ]

    return (
        <section id='about' ref={ref} className='workmate-shell scroll-mt-20 pb-12 pt-8 sm:pb-16 lg:pb-20 lg:pt-10'>
            <div className='about-reveal rounded-[28px] border border-accent/[0.08] bg-white/55 px-6 py-9 shadow-[0_24px_70px_-52px_rgba(125,39,49,0.35)] sm:px-10 sm:py-12 lg:px-14 lg:py-14'>
                <p className={EYEBROW}>About Us</p>
                <h2 className={`${H2} mb-6`}>One hub for every side of hiring.</h2>
                <p className='type-body max-w-none text-text-secondary'>
                    We believe hiring should be intelligent, fair and fast. WorkmateIQ brings organizations, colleges and candidates into one platform to evaluate and move talent forward clearly, without the usual friction. Every registration, onboarding link and review happens through the same connected hub, so nothing gets lost between the people trying to find each other.
                </p>
                <div className='my-8 h-px bg-accent/15 sm:my-9' aria-hidden='true' />
                <p className='type-body max-w-none text-text-secondary'>
                    Organizations can discover and evaluate the right talent through a structured and efficient hiring process. Colleges can help students prepare better and connect them with relevant career opportunities. Candidates can practice, improve and showcase their skills with personalized feedback that truly helps them grow. By keeping registration, evaluation, feedback and hiring workflows connected in one place, we make the entire journey smooth, transparent and efficient for everyone involved. We are committed to using technology to make hiring more intelligent, fair and fast for all.
                </p>
                <div className='mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-7'>
                    {valuePoints.map(([icon, text]) => <AboutPointer key={text} icon={icon}>{text}</AboutPointer>)}
                </div>
            </div>
        </section>
    )
}

/* ============================================================ SOLUTION ============================================================ */
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
    const [overallScore, setOverallScore] = useState(76)

    useEffect(() => {
        if (REDUCE_MOTION) return
        const timer = window.setInterval(() => {
            setActiveCapability((current) => (current + 1) % enterpriseCapabilities.length)
        }, 4200)
        return () => window.clearInterval(timer)
    }, [])

    const [illustration, title, description] = enterpriseCapabilities[activeCapability]

    return (
        <section id='ai-evaluation' className='relative overflow-hidden border-y border-line bg-card py-12 sm:py-16 lg:py-8'>
            <FiberBurstCanvas overallScore={overallScore} />
            <div ref={ref} className='relative z-10 mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-10'>
                <div className='ent-item mx-auto w-full'>
                    <AIScorePanel onOverallScoreChange={setOverallScore} />
                </div>
                <div className='mx-auto mt-10 max-w-[720px] sm:mt-12 lg:mt-5'>
                    <div className='relative min-h-[220px] lg:min-h-[170px]'>
                        <AnimatePresence mode='sync' initial={false}>
                            <Motion.article
                                key={title}
                                initial={{ opacity: 0, y: 22, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                whileHover={!REDUCE_MOTION ? { y: -8, scale: 1.015 } : undefined}
                                exit={{ opacity: 0, y: -18, scale: 0.98 }}
                                transition={{ duration: REDUCE_MOTION ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                                className='capability-card group absolute inset-x-0 top-0 isolate mx-auto flex min-h-[210px] w-full max-w-[520px] flex-col justify-center overflow-hidden rounded-2xl border border-line bg-bg p-7 shadow-[0_24px_70px_-35px_rgba(125,39,49,0.38)] transition-[border-color,background-color,box-shadow] duration-300 ease-out hover:border-accent/35 hover:bg-white hover:shadow-[0_34px_78px_-28px_rgba(125,39,49,0.46),0_10px_28px_-18px_rgba(196,22,31,0.24)] sm:p-9 lg:min-h-[160px] lg:p-6'
                                aria-live='polite'
                            >
                                <span className='pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/[0.1] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100' aria-hidden='true' />
                                <span className='pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' aria-hidden='true' />
                                <MarketingIllustration type={illustration} className='relative z-10 mb-4 h-16 w-24 animate-breathe transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:scale-110' />
                                <h3 className='relative z-10 type-card-title text-ink transition-colors duration-300 group-hover:text-accent'>{title}</h3>
                                <p className='relative z-10 mt-2 max-w-[580px] type-body-small text-text-secondary transition-colors duration-300 group-hover:text-ink/75'>{description}</p>
                            </Motion.article>
                        </AnimatePresence>
                    </div>
                    <div className='mt-4 flex justify-center gap-2' aria-label='Enterprise capability rotation'>
                        {enterpriseCapabilities.map(([, capabilityTitle], index) => (
                            <span key={capabilityTitle} className={`h-1.5 rounded-full transition-all duration-500 ${index === activeCapability ? 'w-9 bg-accent' : 'w-1.5 bg-accent/20'}`} aria-hidden='true' />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

function CategoryBadgeIcon({ type }) {
    if (type === 'college') {
        return (
            <svg className='h-14 w-14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                <path d='m3 8.5 9-4 9 4-9 4-9-4Z' />
                <path d='M6.5 10.3v4.2c3.6 2.7 7.4 2.7 11 0v-4.2' />
                <path d='M21 9v5.2' />
                <path d='M19.5 18.5c.8-1 1.2-2.1 1.2-3.3' />
            </svg>
        )
    }

    return (
        <svg className='h-14 w-14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
            <circle cx='12' cy='7.5' r='3.2' />
            <path d='M5.2 20c.5-3.8 2.8-6 6.8-6s6.3 2.2 6.8 6' />
            <path d='M18.2 4.8a3.2 3.2 0 0 1 0 5.4' />
        </svg>
    )
}

/* ============================================================ SOLUTIONS ============================================================ */
function SolutionPanel({ p, i }) {
    const panelRef = useRef(null)
    const cardRef = useRef(null)

    useEffect(() => {
        if (REDUCE_MOTION || !panelRef.current || !cardRef.current) return undefined

        const context = gsap.context(() => {
            const introItems = cardRef.current.querySelectorAll('.solution-intro > *')
            const pointerItems = cardRef.current.querySelectorAll('.solution-pointer')
            const visual = cardRef.current.querySelector('.solution-audience-visual')

            gsap.set([...introItems, ...pointerItems, visual], { opacity: 0, y: 18 })
            ScrollTrigger.create({
                trigger: panelRef.current,
                start: 'top 78%',
                once: true,
                onEnter: () => {
                    gsap.to(introItems, { opacity: 1, y: 0, duration: 0.65, stagger: 0.07, ease: 'power3.out' })
                    gsap.to(pointerItems, { opacity: 1, y: 0, duration: 0.55, delay: 0.16, stagger: 0.08, ease: 'power3.out' })
                    gsap.to(visual, { opacity: 1, y: 0, duration: 0.7, delay: 0.1, ease: 'power3.out' })
                },
            })
            gsap.to(cardRef.current, {
                scale: 0.975,
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

        return () => context.revert()
    }, [])

    return (
        <article ref={panelRef} id={p.id} className={`panel sticky top-24 scroll-mt-20 pt-4 lg:top-28 ${i < 2 ? 'min-h-[86vh] lg:min-h-[90vh]' : 'min-h-0'}`} style={{ zIndex: i + 1 }}>
            <div ref={cardRef} className={`solution-card relative overflow-hidden rounded-[28px] border border-line/80 p-6 shadow-[0_24px_70px_-42px_rgba(125,39,49,0.48)] sm:p-8 lg:p-10 xl:p-12 ${p.surface}`}>
                <div className='pointer-events-none absolute right-[-80px] top-[-100px] h-[250px] w-[250px] rounded-full border border-accent/10' aria-hidden='true' />
                <div className='pointer-events-none absolute bottom-[-120px] left-[32%] h-[220px] w-[220px] rounded-full bg-accent/[0.035] blur-3xl' aria-hidden='true' />
                <div className='relative z-10 grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 xl:gap-16'>
                    <div className='solution-intro flex flex-col'>
                        <div className='flex items-start justify-end'>
                            <span className='rounded-full border border-accent/15 bg-white/55 px-3 py-1.5 type-caption font-semibold tracking-[0.16em] text-accent'>0{i + 1} / AUDIENCE</span>
                        </div>
                        <p className='mt-7 type-eyebrow text-accent/75'>{p.eyebrow}</p>
                        <h3 className='mt-3 max-w-[460px] type-h3 text-ink'>{p.label}</h3>
                        <p className='mt-5 max-w-[480px] type-component-title font-semibold text-ink'>{p.statement}</p>
                        <ul className='mt-6 grid gap-3.5'>
                            {p.features.map((feature) => (
                                <li key={feature} className='solution-pointer flex items-start gap-3 type-body-small text-text-secondary'>
                                    <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/[0.09] text-accent'>
                                        <Check size={13} strokeWidth={2.5} aria-hidden='true' />
                                    </span>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className='solution-audience-visual relative flex min-h-[360px] items-end justify-center overflow-hidden rounded-[24px] bg-[#fff8f8] px-4 pt-6 lg:min-h-[470px] xl:min-h-[560px]'>
                        {p.category === 'candidate' && (
                            <div className='solution-visual-decorations pointer-events-none absolute inset-0 z-[11] hidden sm:block' aria-hidden='true'>
                                <span className='absolute right-[9%] top-[9%] flex h-28 w-28 items-center justify-center rounded-full bg-[#8b0e16] text-[#fff8f8] shadow-[0_8px_18px_-12px_rgba(30,8,12,0.65)]'>
                                    <CategoryBadgeIcon type={p.category} />
                                </span>
                            </div>
                        )}
                        <img className={`relative z-10 block h-full max-h-[470px] w-full max-w-[520px] object-contain ${p.category === 'college' ? 'object-center mix-blend-multiply' : 'object-bottom'} xl:max-h-[560px] xl:max-w-[620px]`} src={p.image} alt={p.imageAlt} />
                    </div>
                </div>
            </div>
        </article>
    )
}

function AudienceCards({ panels }) {
    return (
        <section id='who-it-works-for' className='workmate-shell scroll-mt-20 space-y-0 pb-8 lg:pb-12' aria-label='Who it works for'>
            {panels.map((panel, index) => (
                <SolutionPanel key={panel.id} p={panel} i={index} />
            ))}
        </section>
    )
}

/* ============================================================ FAQ ============================================================ */
function FaqItem({ q, a }) {
    const [open, setOpen] = useState(false)
    return (
        <div className='faq-item border-b border-line'>
            <button onClick={() => setOpen(!open)} className='w-full flex items-center justify-between text-left py-5 px-3 -mx-3 rounded-xl transition-colors hover:bg-card cursor-pointer group'>
                <span className='type-component-title text-ink group-hover:text-accent transition-colors'>{q}</span>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${open ? 'bg-accent text-white rotate-180' : 'bg-accent/10 text-accent'}`}>
                    <ChevronDown size={14} />
                </span>
            </button>
            <div className='grid transition-[grid-template-rows] duration-300 ease-out' style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                <div className='overflow-hidden'>
                    <p className='type-body text-text-secondary pb-5 px-3 -mx-3 max-w-2xl'>{a}</p>
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
    const inputCls = 'type-body w-full bg-bg border border-line rounded-xl px-4 py-3.5 text-ink placeholder-text-secondary/60 focus:ring-2 focus:ring-accent/25 focus:border-accent outline-none transition-all'

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
                    <p className='type-card-title text-ink mb-2'>Thank you, {form.name}.</p>
                    <p className='type-body-small text-text-secondary'>Your enquiry has been received. Our team will contact you shortly.</p>
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
                    {status === 'error' && <p className='type-body-small text-red-500'>{error}</p>}
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
            id: 'colleges', eyebrow: 'For education', surface: 'bg-[#fff8f8]', label: 'For Colleges & Institutions',
            statement: 'Prepare students for real interview success.', image: institutionImage, imageAlt: 'Institution recruitment and candidate screening illustration', category: 'college',
            features: [
                'Identify interview-ready students through structured AI scores and reports',
                'Give students timed, role-specific practice in a realistic interview environment',
                'Assess answer quality, communication, confidence, and correctness consistently',
                'Use personalized feedback to surface strengths and clear improvement areas',
                'Support placement preparation with more consistent readiness signals',
            ],
        },
        {
            id: 'candidates', eyebrow: 'For people building what is next', surface: 'bg-[#fffafa]', label: 'For Candidates',
            statement: 'Practice with purpose. Improve with clarity.', image: audienceCandidatesImage, imageAlt: 'Candidate in a maroon hoodie working beside a monitor', category: 'candidate',
            features: [
                'Practice role- and experience-specific AI interviews using resume-informed questions',
                'Prepare for HR and technical interview modes with realistic time limits',
                'Receive personalized feedback on confidence, communication, and correctness',
                'Review detailed scores, answer feedback, and past interview reports',
                'Focus on strengths and gaps before the real interview',
            ],
        },
        {
            id: 'organizations', eyebrow: 'For teams that move talent forward', surface: 'bg-[#fbf7f7]', label: 'For Organizations',
            statement: 'Evaluate the right talent, faster.', image: organizationRecruitmentImage, imageAlt: 'Professional reviewing candidate resumes on a laptop', category: 'organization',
            features: [
                'Build role-specific interview templates with structured rounds and question sources',
                'Invite candidates and track progress from sent to completed',
                'Run consistent AI interviews with timed questions and security checks',
                'Review detailed scores, feedback, reports, and organization-level trends',
                'Benchmark and shortlist candidates against the role’s evaluation criteria',
            ],
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
            <VerticalScrollShowcase />
            <AudienceCards panels={panels} />
            <HowItWorks />
            <PowerfulFeatures />
            <EnterpriseAI />

            {/* ============ PRICING ============ */}
            <section id='pricing' className='workmate-shell scroll-mt-20 pb-12 pt-16 sm:pb-14 sm:pt-20 lg:pb-16 lg:pt-24'>
                <p className={`${EYEBROW} justify-center flex`}>Pricing</p>
                <h2 className={`${H2} mb-4 text-center`}>Simple, transparent pricing.</h2>
                <p className='type-body text-text-secondary mb-16 text-center'>Choose the plan that fits how you hire, place or apply.</p>

                <div ref={planRef} className='grid md:grid-cols-3 gap-6 mb-14'>
                    {plans.map((p) => (
                        <div key={p.name} className={`plan pricing-card rounded-2xl p-8 border ${p.featured ? 'pricing-card-growth gradient-border-sweep border-transparent bg-accent/[0.03]' : 'border-line bg-card'}`}>
                            {p.featured && <p className='type-eyebrow text-accent mb-3'>Most popular</p>}
                            <h3 className='type-card-title text-ink mb-1'>{p.name}</h3>
                            <p className='type-body-small text-text-secondary mb-5'>{p.desc}</p>
                            <p className='type-metric text-ink mb-6'>{p.price}<span className='type-body-small text-text-secondary'>{p.period}</span></p>
                            <ul className='space-y-2.5 mb-8'>
                                {p.features.map((f) => <li key={f} className='type-body-small text-text-secondary flex items-start gap-2'><span className='text-accent mt-0.5'>—</span>{f}</li>)}
                            </ul>
                            <Button variant={p.featured ? 'primary' : 'secondary'} className={`pricing-card-cta w-full`} onClick={jump('contact')}>
                                {p.name === 'Enterprise' ? 'Talk to us' : 'Send an Enquiry'}
                            </Button>
                        </div>
                    ))}
                </div>

                <div ref={faqRef} className='max-w-[720px] mx-auto'>
                    <h3 className='type-card-title text-ink mb-6'>Frequently asked questions</h3>
                    {faqs.map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}
                </div>
            </section>

            {/* ============ CONTACT ============ */}
            <section id='contact' className='scroll-mt-20 relative pt-16 pb-20 sm:pt-20 sm:pb-24 overflow-hidden'>
                <div className='absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[460px] rounded-full opacity-[0.10] blur-3xl pointer-events-none'
                    style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
                <NetworkGraphic className='absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[420px] opacity-60 pointer-events-none' />
                <div className='relative max-w-[900px] mx-auto px-6 text-center mb-10'>
                    <p className={`${EYEBROW} justify-center flex`}>Contact</p>
                    <h2 className={`${H2} mb-5`}>Let's build better talent journeys.</h2>
                    <p className='type-body text-text-secondary'>Start your WorkmateIQ journey today — tell us a bit about you below.</p>
                </div>
                <div className='relative px-6'>
                    <div className='max-w-[640px] mx-auto bg-card border border-line rounded-3xl p-8 sm:p-10 shadow-lift'>
                        <EnquiryForm />
                    </div>
                </div>
            </section>
            <NexaChatbot />
        </WorkmateLayout>
    )
}

export default WHome
