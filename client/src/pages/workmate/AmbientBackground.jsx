import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Rich, slow-drifting glow field used behind every Workmate.IQ page so
// scrolling always feels alive. Pure CSS/GSAP - no external assets,
// GPU-cheap (opacity + transform only), tuned to be visible without
// competing with foreground content.
function AmbientBackground() {
    const ref = useRef(null)

    useEffect(() => {
        if (REDUCE_MOTION || !ref.current) return
        const blobs = ref.current.querySelectorAll('.ambient-blob')
        const ctx = gsap.context(() => {
            blobs.forEach((b, i) => {
                gsap.to(b, {
                    x: `+=${80 + i * 30}`,
                    y: `+=${60 + i * 22}`,
                    scale: 1 + (i % 2 === 0 ? 0.18 : -0.12),
                    duration: 16 + i * 5,
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                })
            })
            gsap.to('.ambient-spin', {
                rotate: 360,
                duration: 90,
                ease: 'none',
                repeat: -1,
                transformOrigin: '50% 50%',
            })
        }, ref)
        return () => ctx.revert()
    }, [])

    return (
        <div ref={ref} className='fixed inset-0 overflow-hidden pointer-events-none -z-10'>
            <div className='ambient-blob absolute -top-40 -left-32 w-[620px] h-[620px] rounded-full opacity-[0.16] blur-3xl'
                style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
            <div className='ambient-blob absolute top-[22%] -right-40 w-[560px] h-[560px] rounded-full opacity-[0.13] blur-3xl'
                style={{ background: 'radial-gradient(closest-side, #e0271b, transparent)' }} />
            <div className='ambient-blob absolute top-[55%] left-1/4 w-[480px] h-[480px] rounded-full opacity-[0.11] blur-3xl'
                style={{ background: 'radial-gradient(closest-side, #8b0e16, transparent)' }} />
            <div className='ambient-blob absolute bottom-[5%] -right-24 w-[520px] h-[520px] rounded-full opacity-[0.12] blur-3xl'
                style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
            <div className='ambient-spin absolute top-[40%] left-[8%] w-[3px] h-[3px]'>
                <div className='absolute w-[2px] h-[240px] bg-gradient-to-b from-transparent via-accent/25 to-transparent' />
            </div>
            <svg className='absolute inset-0 w-full h-full opacity-[0.04]' xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <pattern id='grid' width='48' height='48' patternUnits='userSpaceOnUse'>
                        <path d='M 48 0 L 0 0 0 48' fill='none' stroke='#c4161f' strokeWidth='1' />
                    </pattern>
                </defs>
                <rect width='100%' height='100%' fill='url(#grid)' />
            </svg>
        </div>
    )
}

export default AmbientBackground
