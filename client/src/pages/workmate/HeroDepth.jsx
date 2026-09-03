import React, { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import HeroExperimentFrame from './HeroExperimentFrame'

function DepthCard({ className, title, detail, children }) {
    return (
        <div className={`hero-depth-card ${className}`}>
            {children}
            <div className='hero-depth-card-copy'>
                <strong>{title}</strong>
                <span>{detail}</span>
            </div>
        </div>
    )
}

function HeroDepth() {
    const sceneRef = useRef(null)

    useLayoutEffect(() => {
        const scene = sceneRef.current
        if (!scene) return undefined

        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
        let cleanupMotion = () => {}
        const context = gsap.context(() => {
            const layers = Array.from(scene.querySelectorAll('[data-depth-layer]'))
            const dashboard = scene.querySelector('.hero-depth-dashboard')
            const secondaryLayers = layers.filter((layer) => !layer.classList.contains('hero-depth-dashboard'))
            const showFinalState = () => gsap.set(layers, { opacity: 1, y: 0, scale: 1 })

            if (reducedMotion) {
                showFinalState()
                return
            }

            gsap.set(layers, { opacity: 0, y: 18, scale: 0.98 })
            const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
            if (dashboard) timeline.to(dashboard, { opacity: 1, y: 0, scale: 1, duration: 0.75 })
            if (secondaryLayers.length) timeline.to(secondaryLayers, { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1 }, '>-0.34')

            if (!finePointer) {
                cleanupMotion = () => timeline.kill()
                return
            }

            const stageX = gsap.quickTo(scene, 'rotationY', { duration: 0.8, ease: 'power3.out' })
            const stageY = gsap.quickTo(scene, 'rotationX', { duration: 0.8, ease: 'power3.out' })
            const movers = layers.map((layer) => {
                const depth = Number(layer.dataset.depthLayer || 1)
                return {
                    xTo: gsap.quickTo(layer, 'x', { duration: 0.85, ease: 'power3.out' }),
                    yTo: gsap.quickTo(layer, 'y', { duration: 0.85, ease: 'power3.out' }),
                    strength: depth,
                }
            })

            const onMove = (event) => {
                const rect = scene.getBoundingClientRect()
                const px = (event.clientX - rect.left) / rect.width - 0.5
                const py = (event.clientY - rect.top) / rect.height - 0.5
                stageX(px * 3.2)
                stageY(py * -2.4)
                movers.forEach(({ xTo, yTo, strength }) => {
                    xTo(px * strength * 8)
                    yTo(py * strength * 6)
                })
            }
            const onLeave = () => {
                stageX(0)
                stageY(0)
                movers.forEach(({ xTo, yTo }) => { xTo(0); yTo(0) })
            }

            scene.addEventListener('mousemove', onMove, { passive: true })
            scene.addEventListener('mouseleave', onLeave, { passive: true })
            cleanupMotion = () => {
                scene.removeEventListener('mousemove', onMove)
                scene.removeEventListener('mouseleave', onLeave)
                timeline.kill()
            }
        }, scene)

        return () => {
            cleanupMotion()
            context.revert()
        }
    }, [])

    return (
        <HeroExperimentFrame visualClassName='hero-depth-frame'>
            <div ref={sceneRef} className='hero-depth-scene' aria-label='Layered WorkMate IQ product visualization' role='img'>
                <svg className='hero-depth-connectors' viewBox='0 0 640 560' aria-hidden='true'>
                    <path d='M96 160 C178 188 228 225 286 264' />
                    <path d='M548 146 C475 188 432 224 376 264' />
                    <path d='M104 438 C188 400 228 356 286 318' />
                    <path d='M540 432 C470 397 430 356 376 318' />
                </svg>

                <div className='hero-depth-dashboard hero-depth-card' data-depth-layer='2'>
                    <div className='hero-depth-browser-bar'><span /><span /><span /><small>workmateiq / workspace</small></div>
                    <div className='hero-depth-dashboard-body'>
                        <div className='hero-depth-dashboard-top'><span>Talent workspace</span><b>Live review</b></div>
                        <div className='hero-depth-dashboard-panel'>
                            <div className='hero-depth-profile'><i /> <span><b>Mock Interview</b><small>Candidate review</small></span></div>
                            <div className='hero-depth-bars'><span /><span /><span /><span /></div>
                        </div>
                        <div className='hero-depth-dashboard-grid'><span /><span /><span /><span /></div>
                    </div>
                </div>

                <DepthCard className='hero-depth-score' data-depth-layer='5' title='AI Score' detail='Overall signal 85'>
                    <div className='hero-depth-score-ring'><b>85</b><span>score</span></div>
                </DepthCard>
                <DepthCard className='hero-depth-progress' data-depth-layer='4' title='Interview Progress' detail='Practice to improve'>
                    <div className='hero-depth-progress-line'><span /></div>
                    <small>72% complete</small>
                </DepthCard>
                <DepthCard className='hero-depth-org' data-depth-layer='1' title='Organizations' detail='Hire. Manage. Grow.' />
                <DepthCard className='hero-depth-college' data-depth-layer='1.5' title='Colleges' detail='Connect. Enable. Build.' />
                <DepthCard className='hero-depth-candidate' data-depth-layer='3' title='Candidates' detail='Learn. Apply. Succeed.' />
            </div>
        </HeroExperimentFrame>
    )
}

export default HeroDepth
