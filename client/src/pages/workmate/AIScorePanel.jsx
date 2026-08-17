import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SKILLS = [
    ['Communication', 91],
    ['Problem Solving', 84],
    ['Technical Skills', 88],
]

// A live, self-animating "AI evaluation" card - score ring + skill bars that
// draw themselves in on scroll. Built with real DOM/CSS, not a screenshot,
// so it actually feels like the product evaluating someone.
function AIScorePanel() {
    const ref = useRef(null)

    useEffect(() => {
        if (!ref.current) return
        const bars = ref.current.querySelectorAll('.skill-fill')
        const ring = ref.current.querySelector('.score-ring')
        const scoreText = ref.current.querySelector('.score-text')
        const dots = ref.current.querySelectorAll('.orbit-dot')

        if (REDUCE_MOTION) {
            bars.forEach((b, i) => { b.style.width = `${SKILLS[i][1]}%` })
            if (ring) ring.style.strokeDashoffset = `${2 * Math.PI * 54 * (1 - 0.92)}`
            if (scoreText) scoreText.textContent = '92%'
            return
        }

        const circumference = 2 * Math.PI * 54
        gsap.set(ring, { strokeDasharray: circumference, strokeDashoffset: circumference })
        gsap.set(bars, { width: '0%' })
        gsap.set(dots, { opacity: 0, scale: 0 })

        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                trigger: ref.current,
                start: 'top 78%',
                once: true,
                onEnter: () => {
                    const obj = { val: 0 }
                    gsap.to(ring, { strokeDashoffset: circumference * (1 - 0.92), duration: 1.6, ease: 'power2.out' })
                    gsap.to(obj, {
                        val: 92, duration: 1.6, ease: 'power2.out',
                        onUpdate: () => { if (scoreText) scoreText.textContent = `${Math.round(obj.val)}%` },
                    })
                    gsap.to(bars, {
                        width: (i) => `${SKILLS[i][1]}%`,
                        duration: 1.2, ease: 'power3.out', stagger: 0.15, delay: 0.2,
                    })
                    gsap.to(dots, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, delay: 0.8, ease: 'back.out(2)' })
                },
            })
            gsap.to('.orbit-dot', {
                rotation: 360, transformOrigin: '-70px 0px', duration: 20, repeat: -1, ease: 'none',
            })
        }, ref)
        return () => ctx.revert()
    }, [])

    return (
        <div ref={ref} className='relative bg-card border border-line rounded-3xl p-8 shadow-lift overflow-hidden'>
            <div className='absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.12] blur-2xl' style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
            <div className='relative flex items-center gap-6 mb-8'>
                <div className='relative w-[124px] h-[124px] shrink-0'>
                    <svg viewBox='0 0 120 120' className='w-full h-full -rotate-90'>
                        <circle cx='60' cy='60' r='54' fill='none' stroke='var(--color-line)' strokeWidth='8' />
                        <circle className='score-ring' cx='60' cy='60' r='54' fill='none' stroke='#c4161f' strokeWidth='8' strokeLinecap='round' />
                    </svg>
                    <div className='absolute inset-0 flex flex-col items-center justify-center'>
                        <span className='score-text font-display text-[26px] font-bold text-ink tabular-nums'>0%</span>
                        <span className='text-[10px] text-text-secondary'>Overall Fit</span>
                    </div>
                    <span className='orbit-dot absolute top-1/2 left-1/2 w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(196,22,31,0.6)]' style={{ transform: 'translate(-70px, -50%)' }} />
                </div>
                <div>
                    <p className='text-[13px] tracking-[0.14em] uppercase text-accent font-semibold mb-1.5'>AI Evaluation</p>
                    <h3 className='font-display text-[20px] font-bold text-ink leading-snug'>Candidate Score, generated instantly.</h3>
                </div>
            </div>
            <div className='relative space-y-5'>
                {SKILLS.map(([label]) => (
                    <div key={label}>
                        <div className='flex justify-between mb-1.5'>
                            <span className='text-[13.5px] font-medium text-ink'>{label}</span>
                        </div>
                        <div className='h-2 rounded-full bg-bg overflow-hidden'>
                            <div className='skill-fill h-full rounded-full bg-gradient-to-r from-accent to-accent-dark' />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default AIScorePanel
