import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const JOURNEY_STEPS = [
    {
        title: 'User Account Creation',
        description: 'Create a secure account and complete the essential setup for your journey.',
    },
    {
        title: 'Goal Definition & Persona Selection',
        description: 'Define the goal and choose whether the journey is for an organization, institution or candidate.',
    },
    {
        title: 'Customised Interview Setup',
        description: 'Configure the interview around the selected role, objective and use case.',
    },
    {
        title: 'AI Evaluation & Real-time Feedback',
        description: 'Evaluate performance with structured scoring, personalized feedback and useful insights.',
    },
    {
        title: 'Data-driven Insights & Matching',
        description: 'Use performance insights to support better preparation, shortlisting and opportunity matching.',
    },
]

function JourneyHeader() {
    return (
        <div className='journey-header relative z-10 mx-auto max-w-2xl text-center'>
            <p className='type-eyebrow mb-4 text-accent'>The Platform Journey</p>
            <h2 className='type-h2 text-ink'>From discovery to opportunity.</h2>
            <p className='type-lead mx-auto mt-5 max-w-xl text-text-secondary'>A simple, connected journey designed for organizations, institutions and candidates.</p>
        </div>
    )
}

function JourneyStep({ step, index }) {
    const isRight = index % 2 === 1

    return (
        <li className='journey-step relative grid min-h-[142px] grid-cols-[34px_minmax(0,1fr)] items-center gap-4 md:min-h-[158px] md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:gap-0'>
            <div className='journey-step-marker relative z-10 col-start-1 row-start-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-bg bg-accent text-[11px] font-bold tracking-wide text-white shadow-[0_0_0_1px_rgba(196,22,31,0.35),0_8px_18px_-12px_rgba(125,39,49,0.7)] md:col-start-2 md:justify-self-center'>
                {String(index + 1).padStart(2, '0')}
            </div>
            <div className={`journey-step-content col-start-2 row-start-1 max-w-[430px] ${isRight ? 'md:col-start-3 md:justify-self-start' : 'md:col-start-1 md:justify-self-end md:text-right'}`}>
                <p className='type-eyebrow mb-2 text-accent/80'>Step {String(index + 1).padStart(2, '0')}</p>
                <h3 className='type-card-title text-ink'>{step.title}</h3>
                <p className='type-body-small mt-2 text-text-secondary'>{step.description}</p>
            </div>
        </li>
    )
}

export default function JourneySection() {
    const sectionRef = useRef(null)
    const timelineRef = useRef(null)

    useLayoutEffect(() => {
        if (!sectionRef.current || !timelineRef.current) return undefined

        const context = gsap.context(() => {
            const header = timelineRef.current.previousElementSibling
            const line = timelineRef.current.querySelector('.journey-timeline-progress')
            const steps = timelineRef.current.querySelectorAll('.journey-step')

            const timeline = gsap.timeline({ paused: true })
            gsap.set(header, { autoAlpha: 0, y: 14 })
            gsap.set(line, { scaleY: 0 })
            gsap.set(steps, { autoAlpha: 0, y: 20, scale: 0.98 })

            timeline.to(header, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out' })

            steps.forEach((step, index) => {
                timeline
                    .to(line, { scaleY: (index + 1) / steps.length, duration: index === 0 ? 0.32 : 0.46, ease: 'power2.inOut' })
                    .to(step, { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, ease: 'power3.out' }, '-=0.08')
            })

            const play = () => timeline.restart()
            const reset = () => timeline.pause(0)

            ScrollTrigger.create({
                trigger: sectionRef.current,
                start: 'top 76%',
                onEnter: play,
                onEnterBack: play,
                onLeave: reset,
                onLeaveBack: reset,
            })
        }, sectionRef)

        return () => context.revert()
    }, [])

    return (
        <section ref={sectionRef} id='how-it-works' className='relative overflow-visible border-y border-line bg-bg pt-14 pb-12 text-ink sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16'>
            <div className='relative mx-auto max-w-[1280px] px-6 lg:px-8'>
                <JourneyHeader />

                <div ref={timelineRef} className='relative mx-auto mt-14 max-w-[980px] md:mt-16' aria-label='Five-step WorkmateIQ process'>
                    <span className='pointer-events-none absolute bottom-7 left-[16px] top-7 w-px bg-accent/15 md:bottom-7 md:left-1/2 md:top-7 md:-translate-x-1/2' aria-hidden='true' />
                    <span className='journey-timeline-progress pointer-events-none absolute bottom-7 left-[16px] top-7 w-px origin-top bg-accent md:bottom-7 md:left-1/2 md:top-7 md:-translate-x-1/2' aria-hidden='true' />
                    <ol className='relative'>
                        {JOURNEY_STEPS.map((step, index) => <JourneyStep key={step.title} step={step} index={index} />)}
                    </ol>
                </div>
            </div>
        </section>
    )
}
