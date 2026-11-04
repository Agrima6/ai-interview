import React, { useEffect, useRef } from 'react'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Fixed dot-grid field that reveals itself in a soft circle around the
// cursor - the "spotlight" effect seen on sites like Google AI Studio.
// Pure CSS mask driven by two custom properties updated on mousemove.
function CursorSpotlight() {
    const ref = useRef(null)

    useEffect(() => {
        if (REDUCE_MOTION || !ref.current) return
        const el = ref.current
        let raf = null
        const onMove = (e) => {
            if (raf) return
            raf = requestAnimationFrame(() => {
                el.style.setProperty('--sx', `${e.clientX}px`)
                el.style.setProperty('--sy', `${e.clientY}px`)
                raf = null
            })
        }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    if (REDUCE_MOTION) return null

    return (
        <div
            ref={ref}
            className='fixed inset-0 -z-[5] pointer-events-none transition-[mask-position] duration-100'
            style={{
                backgroundImage: 'radial-gradient(circle, rgba(196,22,31,0.55) 1px, transparent 1.4px)',
                backgroundSize: '26px 26px',
                maskImage: 'radial-gradient(320px circle at var(--sx, 50%) var(--sy, 30%), black 0%, transparent 75%)',
                WebkitMaskImage: 'radial-gradient(320px circle at var(--sx, 50%) var(--sy, 30%), black 0%, transparent 75%)',
            }}
        />
    )
}

export default CursorSpotlight
