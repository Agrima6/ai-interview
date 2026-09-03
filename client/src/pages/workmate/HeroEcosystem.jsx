import React, { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import HeroExperimentFrame from './HeroExperimentFrame'
import logo from '../../assets/logo.png'

const ECO_NODES = [
    { label: 'Organizations', detail: 'Hire. Manage. Grow.', className: 'hero-eco-node-org' },
    { label: 'Colleges & Institutions', detail: 'Connect. Enable. Build.', className: 'hero-eco-node-colleges' },
    { label: 'Candidates', detail: 'Learn. Apply. Succeed.', className: 'hero-eco-node-candidates' },
]

const PRODUCT_CARDS = [
    { label: 'AI Interview', detail: 'Practice with purpose', className: 'hero-eco-product-interview' },
    { label: 'Score', detail: 'Signals made clear', className: 'hero-eco-product-score' },
    { label: 'Review', detail: 'Feedback that moves', className: 'hero-eco-product-review' },
    { label: 'Opportunity', detail: 'The next step, closer', className: 'hero-eco-product-opportunity' },
]

function HeroEcosystem() {
    const sceneRef = useRef(null)

    useLayoutEffect(() => {
        const scene = sceneRef.current
        if (!scene) return undefined

        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
        let cleanupMotion = () => {}
        let revealTimer = null
        const context = gsap.context(() => {
            const hub = scene.querySelector('.hero-eco-hub')
            const nodes = Array.from(scene.querySelectorAll('.hero-eco-node'))
            const products = Array.from(scene.querySelectorAll('.hero-eco-product'))
            const paths = Array.from(scene.querySelectorAll('.hero-eco-path'))
            const allVisible = [hub, ...nodes, ...products].filter(Boolean)
            const showFinalState = () => {
                allVisible.forEach((element) => {
                    element.style.opacity = '1'
                    element.style.removeProperty('transform')
                })
                paths.forEach((path) => {
                    path.style.opacity = '1'
                    path.style.strokeDashoffset = '0'
                    path.style.removeProperty('stroke-dasharray')
                })
            }

            try {
                if (!hub || nodes.length !== ECO_NODES.length || products.length !== PRODUCT_CARDS.length || paths.length !== 3) {
                    showFinalState()
                    return
                }

                paths.forEach((path) => {
                    if (typeof path.getTotalLength !== 'function') return
                    const length = path.getTotalLength()
                    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
                })

                if (reducedMotion) {
                    showFinalState()
                    return
                }

                gsap.set(allVisible, { opacity: 0 })
                gsap.set(nodes, { y: 14, scale: 0.94 })
                gsap.set(products, { y: 12, scale: 0.96 })

                const idle = gsap.timeline({ paused: true, repeat: -1, yoyo: true })
                    .to(hub, { y: -3, duration: 3.8, ease: 'sine.inOut' }, 0)
                    .to(nodes, { y: -4, duration: 4.4, stagger: 0.28, ease: 'sine.inOut' }, 0)
                    .to(products, { y: -6, duration: 3.6, stagger: 0.24, ease: 'sine.inOut' }, 0)

                const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
                    .to(hub, { opacity: 1, scale: 1, duration: 0.65 })
                    .to(nodes, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.12 }, '>-0.14')
                    .to(paths, { opacity: 1, strokeDashoffset: 0, duration: 0.8, stagger: 0.12, ease: 'power2.inOut' }, '>-0.28')
                    .to(products, { opacity: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.1 }, '>-0.34')
                    .add(() => idle.play())

                revealTimer = window.setTimeout(() => {
                    const stillHidden = allVisible.some((element) => element.style.opacity === '0')
                    if (stillHidden) showFinalState()
                }, 4500)

                if (!finePointer) {
                    cleanupMotion = () => {
                        if (revealTimer) window.clearTimeout(revealTimer)
                        timeline.kill()
                        idle.kill()
                    }
                    return
                }

                const layers = [
                    { elements: nodes, x: 4, y: 3 },
                    { elements: products, x: 10, y: 8 },
                    { elements: [hub], x: 5, y: 4 },
                ]
                const movers = layers.flatMap(({ elements, x, y }) => elements.map((element) => ({
                    xTo: gsap.quickTo(element, 'x', { duration: 0.8, ease: 'power3.out' }),
                    yTo: gsap.quickTo(element, 'y', { duration: 0.8, ease: 'power3.out' }),
                    x,
                    y,
                })))

                const onMove = (event) => {
                    const rect = scene.getBoundingClientRect()
                    const px = (event.clientX - rect.left) / rect.width - 0.5
                    const py = (event.clientY - rect.top) / rect.height - 0.5
                    movers.forEach(({ xTo, yTo, x, y }) => {
                        xTo(px * x)
                        yTo(py * y)
                    })
                }
                const onLeave = () => movers.forEach(({ xTo, yTo }) => { xTo(0); yTo(0) })

                scene.addEventListener('mousemove', onMove, { passive: true })
                scene.addEventListener('mouseleave', onLeave, { passive: true })
                cleanupMotion = () => {
                    if (revealTimer) window.clearTimeout(revealTimer)
                    scene.removeEventListener('mousemove', onMove)
                    scene.removeEventListener('mouseleave', onLeave)
                    timeline.kill()
                    idle.kill()
                }
            } catch (error) {
                cleanupMotion()
                if (revealTimer) window.clearTimeout(revealTimer)
                showFinalState()
                console.error('Ecosystem animation fallback:', error)
            }
        }, scene)

        return () => {
            cleanupMotion()
            context.revert()
        }
    }, [])

    return (
        <HeroExperimentFrame visualClassName='hero-eco-frame'>
            <div ref={sceneRef} className='hero-eco-scene' aria-label='WorkMate IQ ecosystem diagram' role='img'>
                <svg className='hero-eco-connectors' viewBox='0 0 640 560' aria-hidden='true'>
                    <path className='hero-eco-path' d='M320 278 C355 235 415 166 483 119' />
                    <path className='hero-eco-path' d='M320 278 C270 235 199 171 128 143' />
                    <path className='hero-eco-path' d='M320 278 C371 319 432 385 505 430' />
                </svg>

                <div className='hero-eco-hub' data-parallax='foreground'>
                    <span className='hero-eco-hub-ring' />
                    <img src={logo} alt='' />
                    <span>WorkMate IQ</span>
                </div>

                {ECO_NODES.map((node) => (
                    <div key={node.label} className={`hero-eco-node ${node.className}`} data-parallax='background'>
                        <span className='hero-eco-node-mark' />
                        <div>
                            <strong>{node.label}</strong>
                            <span>{node.detail}</span>
                        </div>
                    </div>
                ))}

                {PRODUCT_CARDS.map((card) => (
                    <div key={card.label} className={`hero-eco-product ${card.className}`} data-parallax='foreground'>
                        <span className='hero-eco-product-dot' />
                        <div>
                            <strong>{card.label}</strong>
                            <span>{card.detail}</span>
                        </div>
                    </div>
                ))}
            </div>
        </HeroExperimentFrame>
    )
}

export default HeroEcosystem
