import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Button from '../../components/Button'
import heroWorkmate from '../../assets/workmate/hero-workmate.png'
import HeroDotsBackground from './HeroDotsBackground'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const EYEBROW = 'text-[13px] tracking-[0.16em] uppercase text-accent font-semibold mb-4'

function HeroDotsExperiment() {
    const navigate = useNavigate()
    const heroRef = useRef(null)
    const imageRef = useRef(null)
    const glowRef = useRef(null)
    const pointerRef = useRef({
        targetX: -1000,
        targetY: -1000,
        x: -1000,
        y: -1000,
        targetIntensity: 0,
        intensity: 0,
    })

    useEffect(() => {
        if (REDUCE_MOTION || !heroRef.current || !imageRef.current || !glowRef.current) return undefined
        if (window.matchMedia?.('(hover: none) and (pointer: coarse)').matches) return undefined

        const hero = heroRef.current
        const image = imageRef.current
        const glow = glowRef.current
        let frameId = null

        const animate = () => {
            const rect = hero.getBoundingClientRect()
            const pointer = pointerRef.current
            const px = clamp((clamp(pointer.x, 0, rect.width) / rect.width) - 0.5, -0.5, 0.5)
            const py = clamp((clamp(pointer.y, 0, rect.height) / rect.height) - 0.5, -0.5, 0.5)
            const intensity = pointer.intensity
            const imageX = px * 7 * intensity
            const imageY = py * 5 * intensity
            const glowX = px * 9 * intensity
            const glowY = py * 7 * intensity

            image.style.transform = `translate3d(${imageX.toFixed(2)}px, ${imageY.toFixed(2)}px, 0) rotateX(${(-py * 1.1 * intensity).toFixed(2)}deg) rotateY(${(px * 1.3 * intensity).toFixed(2)}deg)`
            glow.style.transform = `translate3d(${glowX.toFixed(2)}px, ${glowY.toFixed(2)}px, 0)`
            frameId = requestAnimationFrame(animate)
        }

        frameId = requestAnimationFrame(animate)
        return () => {
            if (frameId) cancelAnimationFrame(frameId)
            image.style.transform = ''
            glow.style.transform = ''
        }
    }, [])

    const jump = (id) => (event) => {
        event.preventDefault()
        navigate(`/#${id}`)
    }

    return (
        <section ref={heroRef} id='home' className='relative isolate overflow-hidden scroll-mt-20'>
            <HeroDotsBackground pointerRef={pointerRef} />
            <div className='pointer-events-none absolute top-[-160px] left-[8%] h-[560px] w-[620px] rounded-full opacity-[0.11] blur-3xl'
                style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
            <div className='pointer-events-none absolute top-[60px] right-[-160px] h-[380px] w-[380px] rounded-full opacity-[0.09] blur-3xl'
                style={{ background: 'radial-gradient(closest-side, #e0271b, transparent)' }} />

            <div className='relative mx-auto grid max-w-[1280px] items-center gap-14 px-6 pb-24 pt-32 sm:pt-36 lg:grid-cols-[1fr_1.05fr] lg:px-8'>
                <div>
                    <p className={`${EYEBROW} inline-flex items-center gap-2`}>
                        <span className='h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow' />
                        WorkmateIQ
                    </p>
                    <h1 className='font-display mb-6 text-[42px] font-bold leading-[1.03] tracking-tight text-ink sm:text-[62px]'>
                        Where <span className='gradient-brand-text'>better talent journeys</span> begin.
                    </h1>
                    <p className='mb-9 max-w-lg text-[18px] leading-relaxed text-text-secondary'>
                        One intelligent platform for hiring, onboarding and connecting people with opportunity — from first interaction to first day.
                    </p>
                    <div className='flex flex-wrap gap-3'>
                        <Button size='lg' className='group' onClick={jump('contact')}>
                            Get Started
                            <ArrowRight size={16} className='transition-transform duration-300 group-hover:translate-x-1' />
                        </Button>
                        <Button size='lg' variant='secondary' onClick={jump('how-it-works')}>Explore WorkmateIQ</Button>
                    </div>
                </div>

                <div className='relative'>
                    <div ref={glowRef} className='pointer-events-none absolute -inset-10 rounded-full opacity-25 blur-3xl transition-opacity duration-500'
                        style={{ background: 'radial-gradient(closest-side, rgba(196,22,31,0.34), transparent 72%)' }} />
                    <div ref={imageRef} className='hero-dots-image relative' style={{ perspective: '1200px', transformStyle: 'preserve-3d', willChange: 'transform' }}>
                        <div className='group cursor-pointer overflow-hidden rounded-[28px] border border-line bg-card shadow-[0_30px_80px_-24px_rgba(30,10,12,0.25)] transition-all duration-500 hover:scale-[1.04] hover:border-accent/60 hover:shadow-[0_30px_90px_-10px_rgba(196,22,31,0.55)]'>
                            <img src={heroWorkmate} alt='Organizations, colleges and candidates connected through WorkmateIQ' className='w-full h-auto transition-transform duration-500 group-hover:scale-[1.01]' />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

export default HeroDotsExperiment
