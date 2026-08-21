import React, { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import {
    ConnectorLayer,
    EcosystemCard,
    LaptopMockup,
    ProgressCard,
    ScoreCard,
} from './ProductMockupParts'

function ProductMockup() {
    const sceneRef = useRef(null)

    useLayoutEffect(() => {
        const scene = sceneRef.current
        if (!scene) return undefined

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
        let cleanupAnimation = () => {}
        const ctx = gsap.context(() => {
            const device = scene.querySelector('.mockup-device')
            const dashboard = scene.querySelector('.mockup-dashboard')
            const score = scene.querySelector('.mockup-score')
            const progress = scene.querySelector('.mockup-progress')
            const ecosystem = scene.querySelectorAll('.mockup-ecosystem')
            const connectorPaths = scene.querySelectorAll('.mockup-connector-path')
            const connectorNodes = scene.querySelectorAll('.mockup-connector-node')
            const animatedElements = [device, dashboard, score, progress, ...ecosystem, ...connectorNodes].filter(Boolean)
            const showFinalState = () => {
                gsap.set(animatedElements, { opacity: 1, x: 0, y: 0, scale: 1 })
                gsap.set(connectorPaths, { strokeDashoffset: 0 })
            }

            try {
                connectorPaths.forEach((path) => {
                    if (typeof path.getTotalLength !== 'function') return
                    const length = path.getTotalLength()
                    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
                })

                if (reduceMotion) {
                    showFinalState()
                    return
                }

                gsap.set([device, dashboard, score, progress, ...ecosystem], { opacity: 0 })
                gsap.set([score, progress], { y: 20, scale: 0.97 })
                gsap.set(ecosystem, { y: 16, scale: 0.98 })
                gsap.set(connectorNodes, { opacity: 0, scale: 0.5, transformOrigin: 'center center' })

                const ambient = gsap.timeline({ paused: true, repeat: -1, yoyo: true })
                    .to(scene.querySelector('.mockup-score .mockup-float'), { y: -2, duration: 3.4, ease: 'sine.inOut' }, 0)
                    .to(scene.querySelector('.mockup-progress .mockup-float'), { y: 2, duration: 3.8, ease: 'sine.inOut' }, 0)
                    .to(scene.querySelectorAll('.mockup-ecosystem .mockup-float'), { y: -1.5, duration: 4.4, stagger: 0.25, ease: 'sine.inOut' }, 0)

                const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
                    .fromTo(device, { opacity: 0, y: 32, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.85 })
                    .fromTo(dashboard, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55 }, '>-0.26')
                    .to(score, { opacity: 1, y: 0, scale: 1, duration: 0.62 }, '>-0.08')
                    .to(progress, { opacity: 1, y: 0, scale: 1, duration: 0.62 }, '>-0.40')
                    .to(ecosystem, { opacity: 1, y: 0, scale: 1, duration: 0.48, stagger: 0.12 }, '>-0.16')
                    .to(connectorPaths, { strokeDashoffset: 0, duration: 0.72, stagger: 0.08, ease: 'power2.inOut' }, '>-0.18')
                    .to(connectorNodes, { opacity: 1, scale: 1, duration: 0.24, stagger: 0.05, ease: 'back.out(1.6)' }, '>-0.32')
                    .add(() => ambient.play())

                cleanupAnimation = () => {
                    timeline.kill()
                    ambient.kill()
                }

                if (!finePointer) return

                const layers = [
                    { element: scene.querySelector('.mockup-background-layer'), x: 2, y: 2 },
                    { element: device, x: 4, y: 3, rotate: 1.2 },
                    { element: score, x: 9, y: 7 },
                    { element: progress, x: -8, y: 6 },
                    ...Array.from(ecosystem).map((element, index) => ({ element, x: index % 2 ? 8 : -8, y: 5 })),
                ].filter(({ element }) => element)

                const movers = layers.map(({ element, x, y, rotate = 0 }) => ({
                    element,
                    xTo: gsap.quickTo(element, 'x', { duration: 0.75, ease: 'power3.out' }),
                    yTo: gsap.quickTo(element, 'y', { duration: 0.75, ease: 'power3.out' }),
                    rotateTo: rotate ? gsap.quickTo(element, 'rotationY', { duration: 0.9, ease: 'power3.out' }) : null,
                    x,
                    y,
                    rotate,
                }))

                const onMove = (event) => {
                    const rect = scene.getBoundingClientRect()
                    const px = (event.clientX - rect.left) / rect.width - 0.5
                    const py = (event.clientY - rect.top) / rect.height - 0.5
                    movers.forEach(({ xTo, yTo, rotateTo, x, y, rotate }) => {
                        xTo(px * x)
                        yTo(py * y)
                        rotateTo?.(px * rotate)
                    })
                }

                const onLeave = () => {
                    movers.forEach(({ xTo, yTo, rotateTo }) => {
                        xTo(0)
                        yTo(0)
                        rotateTo?.(0)
                    })
                }

                scene.addEventListener('mousemove', onMove, { passive: true })
                scene.addEventListener('mouseleave', onLeave, { passive: true })
                const cleanupListeners = () => {
                    scene.removeEventListener('mousemove', onMove)
                    scene.removeEventListener('mouseleave', onLeave)
                }
                const previousCleanup = cleanupAnimation
                cleanupAnimation = () => {
                    cleanupListeners()
                    previousCleanup()
                }
            } catch (error) {
                cleanupAnimation()
                showFinalState()
                console.error('Product mockup animation fallback:', error)
            }
        }, scene)

        return () => {
            cleanupAnimation()
            ctx.revert()
        }
    }, [])

    return (
        <div ref={sceneRef} role='img' aria-label='Animated WorkMate IQ product dashboard mockup' className='relative mx-auto h-[690px] w-full max-w-[620px] select-none sm:h-[590px] lg:h-[560px]'>
            <ConnectorLayer />

            <div className='mockup-device absolute left-1/2 top-[112px] z-20 w-[min(86%,500px)] -translate-x-1/2 sm:top-[88px] sm:w-[min(82%,500px)]'>
                <LaptopMockup />
            </div>

            <div className='mockup-score absolute left-0 top-[18px] z-30 w-[170px] sm:left-[-2%] sm:top-[182px] sm:w-[184px]'>
                <div className='mockup-float'><ScoreCard /></div>
            </div>

            <div className='mockup-progress absolute right-0 top-[500px] z-30 w-[205px] sm:right-[-2%] sm:top-[190px] sm:w-[214px]'>
                <div className='mockup-float'><ProgressCard /></div>
            </div>

            <div className='mockup-ecosystem absolute right-[7%] top-[16px] z-20 w-[150px] sm:right-[8%] sm:top-[4px] sm:w-[160px]'>
                <div className='mockup-float'><EcosystemCard label='Organizations' copy='Hire. Manage. Grow.' tone='strong' /></div>
            </div>
            <div className='mockup-ecosystem absolute bottom-[14px] left-0 z-20 w-[166px] sm:bottom-[9px] sm:left-[2%] sm:w-[176px]'>
                <div className='mockup-float'><EcosystemCard label='Colleges & Institutions' copy='Connect. Enable. Build.' /></div>
            </div>
            <div className='mockup-ecosystem absolute bottom-[14px] right-0 z-20 w-[150px] sm:bottom-[9px] sm:right-[2%] sm:w-[160px]'>
                <div className='mockup-float'><EcosystemCard label='Candidates' copy='Learn. Apply. Succeed.' /></div>
            </div>
        </div>
    )
}

export default ProductMockup
