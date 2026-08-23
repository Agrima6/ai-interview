import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ArrowRight,
    BarChart3,
    Check,
    FileText,
    Medal,
    TrendingUp,
    Users,
} from 'lucide-react'
import collaborationImage from '../../assets/workmate/showcase-collaboration.png'
import './VerticalScrollShowcase.css'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const STRIPS = [
    {
        eyebrow: 'Connected ecosystem',
        title: 'One Platform. Endless Possibilities.',
        description: 'WorkmateIQ brings organizations, colleges and candidates together in one connected space to move from preparation to opportunity with clarity.',
        cta: 'Find Your Path',
        href: '#who-it-works-for',
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
        features: [
            'Side-by-side candidate comparison',
            'Role-based benchmarking',
            'Smart ranking and shortlisting',
            'Exportable evaluation reports',
        ],
    },
]

const REPORT_METRICS = [
    ['Answer Quality', '88%'],
    ['Communication', '85%'],
    ['Speaking Skills', '82%'],
    ['Technical Knowledge', '90%'],
]

const RANKED_CANDIDATES = [
    ['Aarav Sharma', '92/100', 'Top match'],
    ['Neha Verma', '89/100', 'Strong match'],
    ['Rohan Singh', '86/100', 'Good match'],
    ['Priya Patel', '82/100', 'Promising'],
]

function CollaborationVisual() {
    return (
        <div className='showcase-visual showcase-visual-collaboration'>
            <span className='showcase-visual-orbit showcase-visual-orbit-one' aria-hidden='true' />
            <span className='showcase-visual-orbit showcase-visual-orbit-two' aria-hidden='true' />
            <img src={collaborationImage} alt='Three people collaborating around a laptop' />
        </div>
    )
}

function EvaluationVisual() {
    return (
        <div className='showcase-visual showcase-window showcase-report-window' role='img' aria-label='Interview evaluation report preview'>
            <div className='showcase-window-bar'><i /><i /><i /><span>Evaluation report</span></div>
            <div className='showcase-report-body'>
                <div className='showcase-report-list'>
                    <p className='showcase-window-label'>Interview Evaluation</p>
                    {REPORT_METRICS.map(([label, value]) => (
                        <div className='showcase-report-row' key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                            <em><b style={{ width: value }} /></em>
                        </div>
                    ))}
                    <div className='showcase-report-total'><span>Overall Score</span><strong>87/100</strong></div>
                </div>
                <div className='showcase-radar-card'>
                    <p className='showcase-window-label'>Performance Overview</p>
                    <svg viewBox='0 0 120 104' aria-hidden='true'>
                        <polygon points='60,12 101,42 85,91 35,91 19,42' fill='rgba(255,255,255,0.06)' stroke='rgba(255,255,255,0.38)' />
                        <polygon points='60,25 88,45 77,77 43,77 31,45' fill='rgba(255,198,207,0.65)' stroke='#fff' strokeWidth='1.5' />
                        <path d='M60 12v80M19 42l82 0M35 91l50-79M85 91 35 12' stroke='rgba(255,255,255,0.2)' />
                    </svg>
                    <strong>87</strong>
                    <span>Great performance</span>
                </div>
            </div>
        </div>
    )
}

function RankingVisual() {
    return (
        <div className='showcase-visual showcase-window showcase-ranking-window' role='img' aria-label='Candidate ranking preview'>
            <div className='showcase-window-bar'><i /><i /><i /><span>Candidate ranking</span></div>
            <div className='showcase-ranking-body'>
                <div className='showcase-ranking-table'>
                    <div className='showcase-ranking-heading'><span>Rank</span><span>Candidate</span><span>Overall score</span></div>
                    {RANKED_CANDIDATES.map(([name, score, result], index) => (
                        <div className='showcase-ranking-row' key={name}>
                            <b>{index + 1}</b>
                            <span className='showcase-candidate-name'><i>{name.slice(0, 1)}</i>{name}</span>
                            <strong>{score}</strong>
                            <em>{result}</em>
                        </div>
                    ))}
                </div>
                <div className='showcase-top-performer'>
                    <span className='showcase-top-badge'><Medal size={18} aria-hidden='true' /></span>
                    <p>Top performer</p>
                    <strong>92/100</strong>
                    <span>Excellent match</span>
                    <div><TrendingUp size={13} aria-hidden='true' /> Top 5% performers</div>
                </div>
            </div>
        </div>
    )
}

function ShowcaseVisual({ index }) {
    if (index === 0) return <CollaborationVisual />
    if (index === 1) return <EvaluationVisual />
    return <RankingVisual />
}

function ShowcaseCard({ strip, index }) {
    return (
        <article className='showcase-card'>
            <ShowcaseVisual index={index} />
            <div className='showcase-copy'>
                <p className='showcase-eyebrow'>{strip.eyebrow}</p>
                <h2>{strip.title}</h2>
                <p className='showcase-description'>{strip.description}</p>
                {strip.cta && (
                    <a className='showcase-cta' href={strip.href}>
                        {strip.cta}
                        <ArrowRight size={16} aria-hidden='true' />
                    </a>
                )}
            </div>
            <ul className='showcase-features'>
                {strip.features.map((feature) => (
                    <li key={feature}>
                        <span><Check size={15} strokeWidth={2.4} aria-hidden='true' /></span>
                        {feature}
                    </li>
                ))}
            </ul>
        </article>
    )
}

function VerticalScrollShowcase() {
    const trackRef = useRef(null)
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
            if (physicalIndex === STRIPS.length + 1) {
                setTransitionEnabled(false)
                setPhysicalIndex(1)
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => setTransitionEnabled(true))
                })
            } else {
                setPhysicalIndex((current) => current + 1)
            }
        }, physicalIndex === STRIPS.length + 1 ? 350 : 2200)
    }, [clearAutoplay, physicalIndex])

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

    useEffect(() => {
        if (!REDUCE_MOTION || physicalIndex !== STRIPS.length + 1) return

        const frame = window.requestAnimationFrame(() => {
            setTransitionEnabled(false)
            setPhysicalIndex(1)
            scheduleAutoplay()
        })

        return () => window.cancelAnimationFrame(frame)
    }, [physicalIndex, scheduleAutoplay])

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
                        <div
                            ref={trackRef}
                            className='scroll-showcase-track'
                            style={{
                                transform: `translate3d(${trackOffset}%, 0, 0)`,
                                transition: !REDUCE_MOTION && transitionEnabled ? 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                            }}
                        >
                            {slides.map((strip, index) => <ShowcaseCard key={`${strip.title}-${index}`} strip={strip} index={STRIPS.indexOf(strip)} />)}
                        </div>
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
