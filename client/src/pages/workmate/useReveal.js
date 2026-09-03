import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const useReveal = (selector, opts = {}) => {
    const ref = useRef(null)
    useEffect(() => {
        if (REDUCE_MOTION || !ref.current) return
        if (!window.matchMedia('(min-width: 768px)').matches) return
        const els = ref.current.querySelectorAll(selector)
        if (!els.length) return
        const ctx = gsap.context(() => {
            gsap.set(els, { opacity: 0, y: opts.y ?? 24, scale: opts.scale ?? 1, filter: opts.blur ? 'blur(10px)' : 'blur(0px)' })
            ScrollTrigger.batch(els, {
                start: 'top 88%',
                onEnter: (batch) => gsap.to(batch, {
                    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out',
                    stagger: opts.stagger ?? 0.08,
                }),
                once: true,
            })
        }, ref)
        return () => ctx.revert()
    }, [selector])
    return ref
}

// Scroll-scrubbed parallax drift for images/backgrounds - moves opposite the
// scroll direction so imagery feels alive rather than static during scroll.
export const useParallax = (selector, opts = {}) => {
    const ref = useRef(null)
    useEffect(() => {
        if (REDUCE_MOTION || !ref.current) return
        if (!window.matchMedia('(min-width: 768px)').matches) return
        const els = ref.current.querySelectorAll(selector)
        if (!els.length) return
        const ctx = gsap.context(() => {
            els.forEach((el) => {
                gsap.fromTo(el, { y: opts.distance ?? -40 }, {
                    y: opts.distance ? -opts.distance : 40,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: el.closest('.parallax-wrap') || el,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: opts.scrub ?? 1,
                    },
                })
            })
        }, ref)
        return () => ctx.revert()
    }, [selector])
    return ref
}

export default useReveal
