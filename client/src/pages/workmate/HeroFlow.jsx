import React, { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import HeroExperimentFrame from './HeroExperimentFrame'

const FLOW_STAGES = [
    { label: 'Candidate', detail: 'Profile ready', icon: 'candidate', className: 'hero-flow-candidate' },
    { label: 'AI Interview', detail: 'Practice with purpose', icon: 'interview', className: 'hero-flow-interview' },
    { label: 'Score', detail: 'Signals made clear', icon: 'score', className: 'hero-flow-score' },
    { label: 'Match', detail: 'Find the right fit', icon: 'match', className: 'hero-flow-match' },
    { label: 'Opportunity', detail: 'The next step, closer', icon: 'opportunity', className: 'hero-flow-opportunity' },
]

function StageIcon({ type }) {
    if (type === 'candidate') return <svg viewBox='0 0 48 48' aria-hidden='true'><circle cx='24' cy='16' r='6' /><path d='M12 38c1.8-7.2 6-10.5 12-10.5S34.2 30.8 36 38' /></svg>
    if (type === 'interview') return <svg viewBox='0 0 48 48' aria-hidden='true'><rect x='8' y='10' width='32' height='25' rx='5' /><path d='M16 40h16M20 18h12M16 24h8' /><circle cx='16' cy='18' r='1.5' /></svg>
    if (type === 'score') return <svg viewBox='0 0 48 48' aria-hidden='true'><circle cx='24' cy='24' r='14' /><path d='M24 24l8-7M24 24v-8M17 35h14' /><circle cx='24' cy='24' r='2' /></svg>
    if (type === 'match') return <svg viewBox='0 0 48 48' aria-hidden='true'><circle cx='14' cy='24' r='5' /><circle cx='34' cy='15' r='5' /><circle cx='34' cy='33' r='5' /><path d='M18.5 22l10-5M18.5 26l10 5' /></svg>
    return <svg viewBox='0 0 48 48' aria-hidden='true'><path d='M10 34h28M14 34V20h20v14M19 20v-6h10v6M18 28h12' /><path d='M35 12l4 4-4 4' /></svg>
}

function HeroFlow() {
    const sceneRef = useRef(null)

    useLayoutEffect(() => {
        const scene = sceneRef.current
        if (!scene) return undefined

        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        let cleanupMotion = () => {}
        const context = gsap.context(() => {
            const stages = Array.from(scene.querySelectorAll('.hero-flow-stage'))
            const routes = Array.from(scene.querySelectorAll('.hero-flow-route'))
            const finalState = () => {
                gsap.set(stages, { opacity: 1, y: 0, scale: 1 })
                gsap.set(routes, { opacity: 1, strokeDashoffset: 0 })
                stages.forEach((stage, index) => stage.classList.toggle('is-active', index === stages.length - 1))
            }

            routes.forEach((route) => {
                if (typeof route.getTotalLength !== 'function') return
                const length = route.getTotalLength()
                gsap.set(route, { strokeDasharray: length, strokeDashoffset: length })
            })

            if (reducedMotion) {
                finalState()
                return
            }

            gsap.set(stages, { opacity: 0, y: 18, scale: 0.96 })
            const activate = (index) => stages.forEach((stage, stageIndex) => stage.classList.toggle('is-active', stageIndex === index))
            const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
                .add(() => activate(0))
                .to(stages[0], { opacity: 1, y: 0, scale: 1, duration: 0.55 })
                .to(routes[0], { opacity: 1, strokeDashoffset: 0, duration: 0.72, ease: 'power2.inOut' }, '>-0.08')
                .add(() => activate(1))
                .to(stages[1], { opacity: 1, y: 0, scale: 1, duration: 0.5 })
                .to(routes[1], { opacity: 1, strokeDashoffset: 0, duration: 0.65, ease: 'power2.inOut' }, '>-0.08')
                .add(() => activate(2))
                .to(stages[2], { opacity: 1, y: 0, scale: 1, duration: 0.5 })
                .to(routes[2], { opacity: 1, strokeDashoffset: 0, duration: 0.65, ease: 'power2.inOut' }, '>-0.08')
                .add(() => activate(3))
                .to(stages[3], { opacity: 1, y: 0, scale: 1, duration: 0.5 })
                .to(routes[3], { opacity: 1, strokeDashoffset: 0, duration: 0.65, ease: 'power2.inOut' }, '>-0.08')
                .add(() => activate(4))
                .to(stages[4], { opacity: 1, y: 0, scale: 1, duration: 0.56 })
                .to(stages[4].querySelector('.hero-flow-signal'), { opacity: 0.5, scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' })

            cleanupMotion = () => timeline.kill()
        }, scene)

        return () => {
            cleanupMotion()
            context.revert()
        }
    }, [])

    return (
        <HeroExperimentFrame visualClassName='hero-flow-frame'>
            <div ref={sceneRef} className='hero-flow-scene' aria-label='Candidate to opportunity recruitment flow' role='img'>
                <svg className='hero-flow-connectors' viewBox='0 0 640 560' aria-hidden='true'>
                    <path className='hero-flow-route' d='M108 145 C184 78 282 78 347 126' />
                    <path className='hero-flow-route' d='M366 153 C462 134 530 171 538 238' />
                    <path className='hero-flow-route' d='M520 273 C487 329 397 344 308 338' />
                    <path className='hero-flow-route' d='M278 369 C341 426 431 456 506 430' />
                </svg>

                {FLOW_STAGES.map((stage) => (
                    <div key={stage.label} className={`hero-flow-stage ${stage.className}`}>
                        <span className='hero-flow-signal' />
                        <div className='hero-flow-icon'><StageIcon type={stage.icon} /></div>
                        <div>
                            <strong>{stage.label}</strong>
                            <span>{stage.detail}</span>
                        </div>
                    </div>
                ))}
            </div>
        </HeroExperimentFrame>
    )
}

export default HeroFlow
