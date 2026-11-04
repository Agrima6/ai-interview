import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const NODES = [
    [60, 40], [220, 20], [340, 90], [40, 160], [180, 190], [320, 210], [120, 260], [280, 40],
]
const EDGES = [[0, 1], [1, 2], [1, 7], [0, 3], [3, 4], [4, 5], [4, 6], [2, 5]]

// Faint decorative connection graphic - used behind the Contact CTA to hint
// "network of people" without competing with the form itself.
function NetworkGraphic({ className = '' }) {
    const ref = useRef(null)
    useEffect(() => {
        if (REDUCE_MOTION || !ref.current) return
        const dots = ref.current.querySelectorAll('.net-dot')
        const ctx = gsap.context(() => {
            gsap.to(dots, {
                y: (i) => (i % 2 === 0 ? -8 : 8),
                duration: 6, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: 0.3,
            })
        }, ref)
        return () => ctx.revert()
    }, [])

    return (
        <svg ref={ref} viewBox='0 0 360 280' className={className} fill='none'>
            {EDGES.map(([a, b], i) => (
                <line key={i} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke='#c4161f' strokeOpacity='0.15' strokeWidth='1' strokeDasharray='4 4' />
            ))}
            {NODES.map(([x, y], i) => (
                <circle key={i} className='net-dot' cx={x} cy={y} r={i === 1 ? 5 : 3} fill='#c4161f' fillOpacity={i === 1 ? 0.35 : 0.2} />
            ))}
        </svg>
    )
}

export default NetworkGraphic
