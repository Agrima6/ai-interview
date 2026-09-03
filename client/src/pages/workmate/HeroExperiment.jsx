import React, { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import Button from '../../components/Button'
import heroWorkmate from '../../assets/workmate/hero-workmate.png'
import './HeroExperiment.css'

const HEADLINE_WORDS = [
    { text: 'Where', start: 0 },
    { text: 'better', start: 6 },
    { text: 'talent', start: 13 },
    { text: 'journeys', start: 20 },
    { text: 'begin.', start: 29 },
]

function RevealWord({ text, start }) {
    return (
        <span className='hero-experiment-word' aria-hidden='true'>
            {Array.from(text).map((letter, index) => (
                <span key={`${text}-${index}`} className='hero-experiment-letter' style={{ '--letter-index': start + index }}>
                    {letter}
                </span>
            ))}
        </span>
    )
}

function HeroExperiment() {
    const areaRef = useRef(null)
    const frameRef = useRef(0)
    const pointerRef = useRef({ x: 0, y: 0, imageX: 0, imageY: 0 })

    useEffect(() => {
        const area = areaRef.current
        if (!area) return undefined

        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

        const paintPointer = () => {
            const { x, y, imageX, imageY } = pointerRef.current
            area.style.setProperty('--hero-image-x', `${imageX}px`)
            area.style.setProperty('--hero-image-y', `${imageY}px`)
            area.style.setProperty('--hero-glow-x', `${x}px`)
            area.style.setProperty('--hero-glow-y', `${y}px`)
            frameRef.current = 0
        }

        const onMove = (event) => {
            if (motionQuery.matches) return
            const bounds = area.getBoundingClientRect()
            const x = event.clientX - bounds.left
            const y = event.clientY - bounds.top
            const px = (x / bounds.width) - 0.5
            const py = (y / bounds.height) - 0.5

            pointerRef.current = {
                x,
                y,
                imageX: px * 3,
                imageY: py * 2,
            }
            area.classList.add('hero-experiment-pointer-active')
            if (!frameRef.current) frameRef.current = window.requestAnimationFrame(paintPointer)
        }

        const onLeave = () => {
            area.classList.remove('hero-experiment-pointer-active')
            pointerRef.current = { x: 0, y: 0, imageX: 0, imageY: 0 }
            if (!frameRef.current) frameRef.current = window.requestAnimationFrame(paintPointer)
        }

        area.addEventListener('mousemove', onMove, { passive: true })
        area.addEventListener('mouseleave', onLeave, { passive: true })

        return () => {
            area.removeEventListener('mousemove', onMove)
            area.removeEventListener('mouseleave', onLeave)
            if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
        }
    }, [])

    return (
        <section ref={areaRef} id='home' className='hero-experiment-area scroll-mt-20 relative overflow-hidden'>
            <div className='hero-experiment-ambient hero-experiment-ambient-left' aria-hidden='true' />
            <div className='hero-experiment-ambient hero-experiment-ambient-right' aria-hidden='true' />

            <div className='relative z-10 mx-auto grid max-w-[1280px] items-center gap-14 px-6 pb-16 pt-24 sm:pb-20 sm:pt-28 lg:grid-cols-[1fr_1.05fr] lg:px-8'>
                <div>
                    <p className='hero-experiment-fade-in mb-4 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-accent'>
                        <span className='h-1.5 w-1.5 rounded-full bg-accent' aria-hidden='true' />
                        WorkmateIQ
                    </p>

                    <h1 className='hero-experiment-headline mb-6 font-display text-[42px] font-bold leading-[1.03] tracking-tight text-ink sm:text-[62px]' aria-label='Where better talent journeys begin.'>
                        <span className='sr-only'>Where better talent journeys begin.</span>
                        <span className='hero-experiment-headline-visual' aria-hidden='true'>
                            <RevealWord text={HEADLINE_WORDS[0].text} start={HEADLINE_WORDS[0].start} />{' '}
                            <span className='hero-experiment-gradient gradient-brand-text'>
                                <RevealWord text={HEADLINE_WORDS[1].text} start={HEADLINE_WORDS[1].start} />{' '}
                                <RevealWord text={HEADLINE_WORDS[2].text} start={HEADLINE_WORDS[2].start} />{' '}
                                <RevealWord text={HEADLINE_WORDS[3].text} start={HEADLINE_WORDS[3].start} />
                            </span>{' '}
                            <RevealWord text={HEADLINE_WORDS[4].text} start={HEADLINE_WORDS[4].start} />
                        </span>
                    </h1>

                    <p className='hero-experiment-fade-in mb-9 max-w-lg text-[18px] leading-relaxed text-text-secondary'>
                        One intelligent platform for hiring, onboarding and connecting people with opportunity — from first interaction to first day.
                    </p>

                    <div className='hero-experiment-fade-in flex flex-wrap gap-3'>
                        <Button as='a' href='/#contact' size='lg' className='hero-experiment-primary group'>
                            Send an Enquiry
                            <ArrowRight size={16} className='transition-transform duration-300 group-hover:translate-x-1' />
                        </Button>
                        <Button as='a' href='/#how-it-works' size='lg' variant='secondary' className='hero-experiment-secondary'>
                            Explore WorkmateIQ
                        </Button>
                    </div>
                </div>

                <div className='relative' style={{ perspective: '1200px' }}>
                    <div className='hero-experiment-image-wrap relative'>
                        <div className='hero-experiment-image-shell relative overflow-hidden rounded-[28px] border border-line bg-card'>
                            <img src={heroWorkmate} alt='Organizations, colleges and candidates connected through WorkmateIQ' className='w-full h-auto' />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default HeroExperiment
