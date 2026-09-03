import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ArrowRight,
    Check,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import connectedEcosystemImage from '../../assets/workmate/showcase-connected-ecosystem.png'
import interviewEvaluationImage from '../../assets/workmate/showcase-interview-evaluation.png'
import candidateRankingImage from '../../assets/workmate/showcase-candidate-ranking.png'
import './VerticalScrollShowcase.css'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const AUTOPLAY_DELAY_MS = 10_000

const STRIPS = [
    {
        eyebrow: 'Connected ecosystem',
        title: 'One Platform. Endless Possibilities.',
        description: 'WorkmateIQ brings organizations, colleges and candidates together in one connected space to move from preparation to opportunity with clarity.',
        cta: 'Find Your Path',
        href: '#who-it-works-for',
        image: connectedEcosystemImage,
        variant: 'connected',
        imageAlt: 'Three people collaborating around a laptop in a connected WorkmateIQ workspace',
        features: [
            'Faster hiring for organizations',
            'Better placement outcomes for colleges',
            'Stronger interview preparation for candidates',
            'One unified interview ecosystem',
        ],
    },
    {
        eyebrow: 'Interview insights',
        title: 'Evaluation That Sees the Real Potential',
        description: 'See the complete picture behind every response with focused scoring, answer analysis and clear performance signals.',
        cta: 'Explore Evaluation',
        href: '#ai-evaluation',
        image: interviewEvaluationImage,
        imageAlt: 'AI interview evaluation report with performance overview radar chart',
        features: [
            'Multi-dimensional interview scoring',
            'Personalized answer analysis',
            'Communication and speaking insights',
            'Strengths and improvement areas',
        ],
    },
    {
        eyebrow: 'Confident decisions',
        title: 'Rank Candidates. Hire with Confidence.',
        description: 'Compare candidates side by side, benchmark performance for each role and make shortlisting more consistent.',
        image: candidateRankingImage,
        variant: 'ranking',
        imageAlt: 'Candidate ranking table with top performer summary',
        features: [
            'Side-by-side candidate comparison',
            'Role-based benchmarking',
            'Smart ranking and shortlisting',
            'Exportable evaluation reports',
        ],
    },
]

function ShowcaseCard({ strip, isClone }) {
    return (
        <article className={`showcase-card${strip.variant ? ` showcase-card--${strip.variant}` : ''}`} aria-hidden={isClone || undefined}>
            <div className='showcase-visual'>
                <img
                    src={strip.image}
                    alt={isClone ? '' : strip.imageAlt}
                    loading='eager'
                    decoding='async'
                />
            </div>
            <div className='showcase-content'>
                <div className='showcase-copy'>
                    <p className='showcase-eyebrow'>{strip.eyebrow}</p>
                    <h2>{strip.title}</h2>
                    <p className='showcase-description'>{strip.description}</p>
                </div>
                <ul className='showcase-features'>
                    {strip.features.map((feature) => (
                        <li key={feature}>
                            <span><Check size={15} strokeWidth={2.4} aria-hidden='true' /></span>
                            {feature}
                        </li>
                    ))}
                </ul>
                {strip.cta && (
                    <a className='showcase-cta' href={strip.href}>
                        {strip.cta}
                        <ArrowRight size={16} aria-hidden='true' />
                    </a>
                )}
            </div>
        </article>
    )
}

function VerticalScrollShowcase() {
    const timerRef = useRef(null)
    const pausedRef = useRef(false)
    const [physicalIndex, setPhysicalIndex] = useState(1)
    const [transitionEnabled, setTransitionEnabled] = useState(true)

    const clearAutoplay = useCallback(() => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const scheduleAutoplay = useCallback(() => {
        clearAutoplay()
        if (pausedRef.current || document.hidden) return

        timerRef.current = window.setTimeout(() => {
            timerRef.current = null
            setTransitionEnabled(true)
            setPhysicalIndex((current) => {
                const next = current + 1
                return REDUCE_MOTION && next === STRIPS.length + 1 ? 1 : next
            })
        }, AUTOPLAY_DELAY_MS)
    }, [clearAutoplay])

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) clearAutoplay()
            else scheduleAutoplay()
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            clearAutoplay()
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [clearAutoplay, scheduleAutoplay])

    useEffect(() => {
        scheduleAutoplay()
        return clearAutoplay
    }, [clearAutoplay, scheduleAutoplay])

    const move = (direction) => {
        clearAutoplay()
        setTransitionEnabled(true)
        setPhysicalIndex((current) => {
            if (direction < 0 && current === 0) return current
            if (direction > 0 && current === STRIPS.length + 1) return current
            const next = current + direction
            if (REDUCE_MOTION && next === 0) return STRIPS.length
            if (REDUCE_MOTION && next === STRIPS.length + 1) return 1
            return next
        })
    }

    const handleTransitionEnd = (event) => {
        if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
        if (physicalIndex === 0 || physicalIndex === STRIPS.length + 1) {
            const normalizedIndex = physicalIndex === 0 ? STRIPS.length : 1
            setTransitionEnabled(false)
            setPhysicalIndex(normalizedIndex)
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => setTransitionEnabled(true)))
        }
    }

    const handleMouseEnter = () => {
        pausedRef.current = true
        clearAutoplay()
    }

    const handleMouseLeave = () => {
        pausedRef.current = false
        scheduleAutoplay()
    }

    const slides = [STRIPS[STRIPS.length - 1], ...STRIPS, STRIPS[0]]
    const activeIndex = physicalIndex === 0
        ? STRIPS.length - 1
        : physicalIndex === STRIPS.length + 1
            ? 0
            : physicalIndex - 1
    const trackOffset = -(physicalIndex * (100 / slides.length))

    return (
        <section className='scroll-showcase' aria-label='WorkmateIQ platform showcase'>
            <div className='scroll-showcase-shell'>
                <div className='scroll-showcase-stage'>
                    <div className='scroll-showcase-viewport' onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                        <button className='showcase-arrow showcase-arrow-previous' type='button' onClick={() => move(-1)} aria-label='Previous insight'>
                            <ChevronLeft size={20} aria-hidden='true' />
                        </button>
                        <div
                            className='scroll-showcase-track'
                            onTransitionEnd={handleTransitionEnd}
                            style={{
                                transform: `translate3d(${trackOffset}%, 0, 0)`,
                                transition: !REDUCE_MOTION && transitionEnabled ? 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                            }}
                        >
                            {slides.map((strip, index) => <ShowcaseCard key={`${strip.title}-${index}`} strip={strip} isClone={index === 0 || index === slides.length - 1} />)}
                        </div>
                        <button className='showcase-arrow showcase-arrow-next' type='button' onClick={() => move(1)} aria-label='Next insight'>
                            <ChevronRight size={20} aria-hidden='true' />
                        </button>
                    </div>
                    <div className='showcase-progress' aria-label={`Showcase ${activeIndex + 1} of 3`}>
                        {STRIPS.map((strip, index) => <span key={strip.title} className={index === activeIndex ? 'is-active' : ''} aria-hidden='true' />)}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default VerticalScrollShowcase
