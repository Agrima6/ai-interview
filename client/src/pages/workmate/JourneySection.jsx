import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

const MotionDiv = motion.div
const MotionLi = motion.li
const MotionPath = motion.path

const journeySteps = [
    { number: '01', title: 'Discover', description: 'Learn how Workmate IQ fits your hiring or placement flow.', illustration: 'discover', popover: 'aboveRight' },
    { number: '02', title: 'Register', description: 'A short, structured registration tailored to the participant joining.', illustration: 'register', popover: 'aboveLeft' },
    { number: '03', title: 'Onboard', description: 'A personalized onboarding path guides each participant forward.', illustration: 'onboard', popover: 'above' },
    { number: '04', title: 'Review', description: 'Documents and information are reviewed together in one place.', illustration: 'review', popover: 'aboveRight' },
    { number: '05', title: 'Move Forward', description: 'Approved journeys continue toward the right opportunity.', illustration: 'forward', popover: 'aboveLeft' },
]

const desktopJourneyLayout = [
    { left: '9%', top: '24%' },
    { left: '30.5%', top: '65%' },
    { left: '51%', top: '23%' },
    { left: '72%', top: '65%' },
    { left: '92%', top: '24%' },
]

const tabletJourneyLayout = [
    { left: '18%', top: '13%' },
    { left: '79%', top: '31%' },
    { left: '20%', top: '51%' },
    { left: '79%', top: '70%' },
    { left: '49%', top: '90%' },
]

const routePath = 'M 100 150 C 210 150 230 390 350 410 C 470 430 470 155 600 150 C 730 145 730 400 850 410 C 970 420 980 200 1100 170'
const tabletRoutePath = 'M 140 100 C 500 100 560 220 490 315 C 420 410 170 365 170 510 C 170 655 560 620 500 775 C 455 850 290 875 350 1015'

const svgProps = {
    viewBox: '0 0 120 80',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
}

const stroke = '#c4161f'
const strokeSoft = '#a34b51'
const strokeLight = '#6b3035'
const strokeMuted = '#8b6b6d'

function DiscoverIllustration() {
    return (
        <svg {...svgProps}>
            <circle cx='42' cy='35' r='15' stroke={strokeLight} strokeWidth='2' />
            <path d='m53 46 11 11' stroke={stroke} strokeWidth='3' strokeLinecap='round' />
            <rect x='68' y='18' width='31' height='42' rx='5' stroke={strokeSoft} strokeWidth='1.8' />
            <circle cx='78' cy='30' r='5' stroke={stroke} strokeWidth='1.8' />
            <path d='M87 28h6M87 33h6M74 43h19M74 48h14' stroke={strokeMuted} strokeWidth='1.8' strokeLinecap='round' />
            <circle cx='42' cy='35' r='5' fill={stroke} fillOpacity='.18' />
        </svg>
    )
}

function RegisterIllustration() {
    return (
        <svg {...svgProps}>
            <rect x='25' y='12' width='53' height='57' rx='6' fill='#fffafa' stroke={strokeSoft} strokeWidth='1.8' />
            <circle cx='39' cy='26' r='6' stroke={strokeLight} strokeWidth='1.8' />
            <path d='M33 37c2-5 10-5 12 0M52 23h17M52 29h12M33 47h36M33 54h26' stroke={strokeMuted} strokeWidth='1.8' strokeLinecap='round' />
            <path d='m86 49 5 5 9-11' stroke={stroke} strokeWidth='2.8' strokeLinecap='round' strokeLinejoin='round' />
            <circle cx='91' cy='48' r='13' stroke={stroke} strokeOpacity='.28' strokeWidth='1.5' />
        </svg>
    )
}

function OnboardIllustration() {
    return (
        <svg {...svgProps}>
            <path d='M17 53c15-21 25-25 38-14 9 8 16 7 27-5' stroke={strokeSoft} strokeWidth='2' strokeLinecap='round' />
            <circle cx='18' cy='53' r='5' fill={stroke} />
            <circle cx='55' cy='39' r='5' fill={strokeMuted} />
            <circle cx='82' cy='34' r='5' fill={strokeLight} />
            <circle cx='39' cy='22' r='8' stroke={strokeLight} strokeWidth='1.8' />
            <path d='M29 42c1-8 19-8 21 0M94 26v22M89 31l5-5 5 5' stroke={stroke} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M17 63h78' stroke={strokeMuted} strokeWidth='1.4' strokeDasharray='2 5' strokeLinecap='round' />
        </svg>
    )
}

function ReviewIllustration() {
    return (
        <svg {...svgProps}>
            <rect x='23' y='20' width='44' height='49' rx='5' fill='#fffafa' stroke={strokeSoft} strokeWidth='1.8' />
            <path d='M31 33h27M31 40h22M31 47h17' stroke={strokeMuted} strokeWidth='1.8' strokeLinecap='round' />
            <path d='m31 57 4 4 7-8' stroke={stroke} strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' />
            <circle cx='83' cy='36' r='13' fill='#fffafa' stroke={strokeLight} strokeWidth='1.8' />
            <path d='m92 46 9 9' stroke={strokeLight} strokeWidth='2.4' strokeLinecap='round' />
            <path d='M77 36h12M77 42h7' stroke={strokeMuted} strokeWidth='1.8' strokeLinecap='round' />
        </svg>
    )
}

function ForwardIllustration() {
    return (
        <svg {...svgProps}>
            <path d='M19 61 38 49l13 7 28-31' stroke={stroke} strokeWidth='2.8' strokeLinecap='round' strokeLinejoin='round' />
            <path d='m71 25 8 0 0 8' stroke={strokeLight} strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M18 66h82' stroke={strokeSoft} strokeWidth='1.6' strokeLinecap='round' />
            <circle cx='38' cy='49' r='4' fill='#fffafa' stroke={strokeMuted} strokeWidth='1.8' />
            <circle cx='51' cy='56' r='4' fill='#fffafa' stroke={strokeMuted} strokeWidth='1.8' />
            <circle cx='79' cy='25' r='6' fill={stroke} fillOpacity='.22' stroke={strokeLight} strokeWidth='1.8' />
            <path d='M93 15v10M88 20h10' stroke={strokeLight} strokeWidth='1.5' strokeLinecap='round' />
        </svg>
    )
}

function JourneyIllustration({ type }) {
    const illustrations = { discover: DiscoverIllustration, register: RegisterIllustration, onboard: OnboardIllustration, review: ReviewIllustration, forward: ForwardIllustration }
    const Illustration = illustrations[type]
    return Illustration ? <Illustration /> : null
}

function JourneyHeader({ reducedMotion, isActive }) {
    return (
        <MotionDiv
            className='relative z-10 mx-auto max-w-2xl text-center'
            initial={false}
            animate={reducedMotion || isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: reducedMotion || isActive ? 0.6 : 0, ease: [0.16, 1, 0.3, 1] }}
        >
            <p className='mb-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-accent'>The Platform Journey</p>
            <h2 className='font-display text-[32px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[46px]'>From discovery to opportunity.</h2>
            <p className='mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-text-secondary sm:text-[17px]'>A simple, connected journey designed for organizations, institutions and candidates.</p>
            <div className='mt-6 flex flex-wrap justify-center gap-x-3 gap-y-2 text-[10px] font-medium uppercase tracking-[0.16em] text-text-secondary sm:text-[11px]'>
                <span>Organizations</span><span className='text-accent/70'>•</span>
                <span>Colleges &amp; Institutions</span><span className='text-accent/70'>•</span>
                <span>Candidates</span>
            </div>
        </MotionDiv>
    )
}

const popoverPosition = {
    aboveRight: {
        position: { left: '-4px', bottom: 'calc(100% + 18px)' },
        arrow: { left: '4px', bottom: '-8px' },
    },
    aboveLeft: {
        position: { right: '-4px', bottom: 'calc(100% + 18px)' },
        arrow: { right: '4px', bottom: '-8px' },
    },
    above: {
        position: { left: '50%', marginLeft: '-115px', bottom: 'calc(100% + 18px)' },
        arrow: { left: '50%', marginLeft: '-8px', bottom: '-8px' },
    },
    mobile: {
        position: { left: 0, top: 'calc(100% + 12px)' },
        arrow: { left: 0, top: '-8px' },
    },
}

function JourneyBubble({ step, mobile }) {
    const placement = mobile ? popoverPosition.mobile : popoverPosition[step.popover]
    return (
        <MotionDiv
            className='journey-bubble pointer-events-auto absolute z-50 w-[230px] rounded-[42%] border border-accent/35 bg-[#fffafa] px-7 py-6 text-center shadow-[0_24px_55px_-24px_rgba(125,39,49,0.42)]'
            style={placement.position}
            initial={{ opacity: 0, y: mobile ? -8 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
            <span className='font-mono text-[10px] font-semibold tracking-[0.18em] text-accent'>{step.number}</span>
            <strong className='mt-1 block font-display text-[18px] font-bold tracking-tight text-ink'>{step.title}</strong>
            <p className='mt-2 text-[12.5px] leading-relaxed text-text-secondary'>{step.description}</p>
            <span className={`pointer-events-none absolute h-0 w-0 border-x-[8px] border-x-transparent ${mobile ? 'border-b-[8px] border-b-[#fffafa]' : 'border-t-[8px] border-t-[#fffafa]'}`} style={placement.arrow} aria-hidden='true' />
        </MotionDiv>
    )
}

function JourneyMilestone({ step, index, layout, reducedMotion, isActive, activeStep, setActiveStep, hoverStep, setHoverStep, mobile = false }) {
    const isPinned = activeStep === index
    const isOpen = isPinned || (activeStep === null && hoverStep === index)
    const toggleStep = () => {
        setHoverStep(null)
        setActiveStep(isPinned ? null : index)
    }
    const handleHoverEnter = mobile ? undefined : () => setHoverStep(index)
    const handleHoverLeave = mobile ? undefined : () => setHoverStep((current) => current === index ? null : current)
    const positionClasses = mobile ? 'translate-x-0 translate-y-0' : '-translate-x-1/2 -translate-y-1/2'

    return (
        <MotionDiv
            className={`absolute z-20 ${positionClasses} ${isOpen ? 'z-40' : ''}`}
            style={{ left: layout.left, top: layout.top }}
            data-journey-interactive='true'
            initial={false}
            animate={reducedMotion || isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.72 }}
            transition={{ duration: reducedMotion || isActive ? 0.44 : 0, delay: reducedMotion ? 0 : isActive ? 0.32 + index * 0.56 : 0, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className={`relative flex items-center ${mobile ? 'flex-row gap-3 text-left' : 'flex-col gap-1 text-center'}`}>
                <button type='button' aria-label={`Open ${step.title} details from illustration`} onClick={toggleStep} className={`group shrink-0 bg-transparent p-0 text-accent outline-none transition-transform duration-300 hover:scale-[1.04] focus-visible:scale-[1.04] ${mobile ? 'order-2 h-[62px] w-[82px]' : 'h-[68px] w-[96px]'}`}>
                    <JourneyIllustration type={step.illustration} />
                </button>
                <span className={`relative block h-4 w-4 shrink-0 ${mobile ? 'order-1' : ''}`} onMouseEnter={handleHoverEnter} onMouseLeave={handleHoverLeave}>
                    <button type='button' aria-label={`Open ${step.title} details from milestone`} aria-expanded={isOpen} onClick={toggleStep} className={`group relative block h-4 w-4 rounded-full border-2 border-bg bg-accent-dark shadow-[0_0_0_1px_rgba(196,22,31,0.35)] outline-none transition-all duration-300 hover:scale-110 hover:bg-accent focus-visible:scale-110 focus-visible:bg-accent ${isOpen ? 'scale-125 bg-accent shadow-[0_0_0_6px_rgba(196,22,31,0.12)]' : ''}`}>
                        <span className='pointer-events-none absolute -inset-2 rounded-full border border-accent/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100' />
                    </button>
                    {isOpen && <JourneyBubble step={step} mobile={mobile} />}
                </span>
                <span className={`font-display tracking-tight text-ink ${mobile ? 'order-3 text-left text-[16px] font-bold' : 'text-center text-[14px] font-bold leading-tight'}`}>
                    <span className='block font-mono text-[10px] font-semibold tracking-[0.18em] text-accent'>{step.number}</span>
                    <span className='block'>{step.title}</span>
                </span>
            </div>
        </MotionDiv>
    )
}

function RoadmapSvg({ path, reducedMotion, isActive }) {
    const isTablet = path === tabletRoutePath
    return (
        <svg className='pointer-events-none absolute inset-0 h-full w-full overflow-visible' viewBox={isTablet ? '0 0 700 1120' : '0 0 1200 640'} fill='none' preserveAspectRatio='none' aria-hidden='true'>
            <path d={path} pathLength='1' stroke='#8b0e16' strokeWidth='7' strokeLinecap='round' strokeLinejoin='round' opacity='.16' />
            <MotionPath
                d={path}
                pathLength='1'
                stroke='#c4161f'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
                initial={false}
                animate={reducedMotion || isActive ? { pathLength: 1, opacity: 0.9 } : { pathLength: 0, opacity: 0 }}
                transition={{ pathLength: { duration: reducedMotion || isActive ? 3.25 : 0, ease: 'easeInOut' }, opacity: { duration: reducedMotion || isActive ? 0.35 : 0 } }}
            />
        </svg>
    )
}

function DesktopJourney({ reducedMotion, isActive, activeStep, setActiveStep, hoverStep, setHoverStep }) {
    return (
        <div className='relative mt-10 hidden h-[690px] lg:block' aria-label='Five-step Workmate IQ journey'>
            <RoadmapSvg path={routePath} reducedMotion={reducedMotion} isActive={isActive} />
            {journeySteps.map((step, index) => (
                <JourneyMilestone key={step.number} step={step} index={index} layout={desktopJourneyLayout[index]} reducedMotion={reducedMotion} isActive={isActive} activeStep={activeStep} setActiveStep={setActiveStep} hoverStep={hoverStep} setHoverStep={setHoverStep} />
            ))}
        </div>
    )
}

function TabletJourney({ reducedMotion, isActive, activeStep, setActiveStep, hoverStep, setHoverStep }) {
    return (
        <div className='relative mt-10 hidden h-[760px] md:block lg:hidden' aria-label='Five-step Workmate IQ journey'>
            <RoadmapSvg path={tabletRoutePath} reducedMotion={reducedMotion} isActive={isActive} />
            {journeySteps.map((step, index) => (
                <JourneyMilestone key={step.number} step={step} index={index} layout={tabletJourneyLayout[index]} reducedMotion={reducedMotion} isActive={isActive} activeStep={activeStep} setActiveStep={setActiveStep} hoverStep={hoverStep} setHoverStep={setHoverStep} />
            ))}
        </div>
    )
}

function MobileJourney({ reducedMotion, isActive, activeStep, setActiveStep, hoverStep, setHoverStep }) {
    return (
        <ol className='relative mt-10 space-y-5 pl-8 md:hidden' aria-label='Five-step Workmate IQ journey'>
            <MotionDiv
                className='absolute bottom-7 left-[8px] top-7 w-px origin-top bg-[#7b2731]/70'
                initial={false}
                animate={reducedMotion || isActive ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
                transition={{ duration: reducedMotion || isActive ? 2.8 : 0, ease: 'easeInOut' }}
                aria-hidden='true'
            />
            {journeySteps.map((step, index) => (
                <MotionLi
                    key={step.number}
                    className='relative min-h-[76px]'
                    initial={false}
                    animate={reducedMotion || isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                    transition={{ duration: reducedMotion || isActive ? 0.44 : 0, delay: reducedMotion ? 0 : isActive ? 0.25 + index * 0.42 : 0, ease: [0.16, 1, 0.3, 1] }}
                >
                    <JourneyMilestone step={step} index={index} layout={{ left: '0%', top: '0%' }} reducedMotion={reducedMotion} isActive={isActive} activeStep={activeStep} setActiveStep={setActiveStep} hoverStep={hoverStep} setHoverStep={setHoverStep} mobile />
                </MotionLi>
            ))}
        </ol>
    )
}

export default function JourneySection() {
    const sectionRef = useRef(null)
    const reducedMotion = useReducedMotion()
    const isActive = useInView(sectionRef, { amount: 0.3, once: false })
    const [activeStep, setActiveStep] = useState(null)
    const [hoverStep, setHoverStep] = useState(null)

    useEffect(() => {
        if (!isActive) {
            const resetTimer = window.setTimeout(() => {
                setActiveStep(null)
                setHoverStep(null)
            }, 0)
            return () => window.clearTimeout(resetTimer)
        }
    }, [isActive])

    useEffect(() => {
        const onPointerDown = (event) => {
            if (!sectionRef.current?.contains(event.target)) return
            if (!(event.target instanceof Element) || !event.target.closest('[data-journey-interactive]')) {
                setActiveStep(null)
                setHoverStep(null)
            }
        }
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setActiveStep(null)
                setHoverStep(null)
            }
        }
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [])

    return (
        <section ref={sectionRef} id='how-it-works' className='relative overflow-visible border-y border-line bg-bg pt-16 pb-20 text-ink sm:pt-20 sm:pb-24 lg:pt-24'>
            <div className='relative mx-auto max-w-[1280px] px-6 lg:px-8'>
                <JourneyHeader reducedMotion={reducedMotion} isActive={isActive} />
                <DesktopJourney reducedMotion={reducedMotion} isActive={isActive} activeStep={activeStep} setActiveStep={setActiveStep} hoverStep={hoverStep} setHoverStep={setHoverStep} />
                <TabletJourney reducedMotion={reducedMotion} isActive={isActive} activeStep={activeStep} setActiveStep={setActiveStep} hoverStep={hoverStep} setHoverStep={setHoverStep} />
                <MobileJourney reducedMotion={reducedMotion} isActive={isActive} activeStep={activeStep} setActiveStep={setActiveStep} hoverStep={hoverStep} setHoverStep={setHoverStep} />
            </div>
        </section>
    )
}
