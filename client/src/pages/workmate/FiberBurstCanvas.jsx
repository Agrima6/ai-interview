import React, { useEffect, useRef } from 'react'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SCORE_PALETTES = {
    low: {
        primary: [231, 111, 111],
        dark: [194, 72, 79],
    },
    medium: {
        primary: [217, 138, 43],
        dark: [174, 98, 27],
    },
    high: {
        primary: [47, 158, 91],
        dark: [31, 116, 67],
    },
}

function getScorePalette(score) {
    if (score <= 70) return SCORE_PALETTES.low
    if (score <= 89) return SCORE_PALETTES.medium
    return SCORE_PALETTES.high
}

function mixColor(from, to, amount) {
    return from.map((channel, index) => channel + (to[index] - channel) * amount)
}

function rgbString(color) {
    return color.map((channel) => Math.round(channel)).join(', ')
}

/**
 * FiberBurstCanvas - Radiating fiber-optic burst background effect
 * inspired by Stripe's radiant light burst, adapted to the WorkMate IQ maroon palette.
 * - Semicircular radiating fiber strands with endpoint glow pips.
 * - Spring-based cursor interaction bending the full fiber geometry.
 * - Traveling light pulses along strands.
 * - Performance optimized with IntersectionObserver, RAF sleep, and DPR scaling.
 */
function FiberBurstCanvas({ overallScore = 76 }) {
    const canvasRef = useRef(null)
    const targetPaletteRef = useRef(getScorePalette(overallScore))
    const currentPaletteRef = useRef(getScorePalette(overallScore))

    useEffect(() => {
        targetPaletteRef.current = getScorePalette(overallScore)
    }, [overallScore])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const parent = canvas.parentElement
        if (!parent) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId = null
        let isVisible = false
        let isRunning = false
        let isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches

        let width = 0
        let height = 0
        let fibers = []
        let pulses = []
        let mouse = { x: -9999, y: -9999, active: false }

        const STRAND_COUNT = 200
        const INFLUENCE_RADIUS = 480
        const PULL_FORCE = 38
        const SPRING = 0.024
        const FRICTION = 0.95

        function initFibers() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const rect = parent.getBoundingClientRect()
            width = rect.width
            height = rect.height

            canvas.width = Math.floor(width * dpr)
            canvas.height = Math.floor(height * dpr)
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`

            ctx.scale(dpr, dpr)

            const originX = width * 0.5
            const originY = height * 0.82 // Epicenter situated behind lower-middle content

            const newFibers = []
            const minAngle = -Math.PI * 0.98 // ~-176 deg (far left)
            const maxAngle = -Math.PI * 0.02 // ~-4 deg (far right)
            const angleStep = (maxAngle - minAngle) / STRAND_COUNT

            for (let i = 0; i <= STRAND_COUNT; i++) {
                const baseAngle = minAngle + i * angleStep + (Math.random() - 0.5) * 0.025
                const maxReach = Math.min(width * 0.42, height * 0.58)
                const length = maxReach * (0.34 + Math.pow(Math.random(), 1.8) * 0.66)

                const restEndX = originX + Math.cos(baseAngle) * length
                const restEndY = originY + Math.sin(baseAngle) * length

                // Midpoint control point with slight natural curvature
                const midDist = length * 0.5
                const curveOffset = (Math.random() - 0.5) * 6
                const restCtrlX = originX + Math.cos(baseAngle) * midDist - Math.sin(baseAngle) * curveOffset
                const restCtrlY = originY + Math.sin(baseAngle) * midDist + Math.cos(baseAngle) * curveOffset

                newFibers.push({
                    originX,
                    originY,
                    baseAngle,
                    length,
                    restEndX,
                    restEndY,
                    endX: restEndX,
                    endY: restEndY,
                    vxEnd: 0,
                    vyEnd: 0,
                    restCtrlX,
                    restCtrlY,
                    ctrlX: restCtrlX,
                    ctrlY: restCtrlY,
                    vxCtrl: 0,
                    vyCtrl: 0,
                    baseAlpha: 0.13 + Math.random() * 0.16,
                    glowFactor: 0,
                    tipRadius: 1.0 + Math.random() * 1.2,
                    lineWidth: 0.6 + Math.random() * 0.8,
                })
            }

            fibers = newFibers

            // Seed traveling photon pulses
            pulses = Array.from({ length: 18 }, () => ({
                fiberIndex: Math.floor(Math.random() * STRAND_COUNT),
                progress: Math.random(),
                speed: 0.003 + Math.random() * 0.006,
                size: 1.2 + Math.random() * 1.5,
            }))

            drawFrame(false)
        }

        function drawFrame(updatePhysics = true) {
            ctx.clearRect(0, 0, width, height)

            const targetPalette = targetPaletteRef.current
            currentPaletteRef.current = {
                primary: mixColor(currentPaletteRef.current.primary, targetPalette.primary, 0.08),
                dark: mixColor(currentPaletteRef.current.dark, targetPalette.dark, 0.08),
            }
            const brandRgb = rgbString(currentPaletteRef.current.primary)
            const brandDarkRgb = rgbString(currentPaletteRef.current.dark)

            const originX = width * 0.5
            const originY = height * 0.82

            // 1. Radiant central epicenter core glow
            const coreGrad = ctx.createRadialGradient(originX, originY, 0, originX, originY, Math.min(width, height) * 0.45)
            coreGrad.addColorStop(0, `rgba(${brandRgb}, 0.18)`)
            coreGrad.addColorStop(0.25, `rgba(${brandRgb}, 0.14)`)
            coreGrad.addColorStop(0.6, `rgba(${brandDarkRgb}, 0.08)`)
            coreGrad.addColorStop(1, 'transparent')

            ctx.fillStyle = coreGrad
            ctx.beginPath()
            ctx.arc(originX, originY, Math.min(width, height) * 0.45, 0, Math.PI * 2)
            ctx.fill()

            let hasMovement = false

            // 2. Render radiating fibers
            for (let i = 0; i < fibers.length; i++) {
                const f = fibers[i]

                if (updatePhysics && !REDUCE_MOTION && !isTouchDevice) {
                    let targetEndX = f.restEndX
                    let targetEndY = f.restEndY
                    let targetCtrlX = f.restCtrlX
                    let targetCtrlY = f.restCtrlY
                    let targetGlow = 0

                    if (mouse.active) {
                        const dx = mouse.x - f.endX
                        const dy = mouse.y - f.endY
                        const dist = Math.sqrt(dx * dx + dy * dy)

                        if (dist < INFLUENCE_RADIUS && dist > 0) {
                            const factor = 1 - dist / INFLUENCE_RADIUS
                            const force = factor * factor * PULL_FORCE
                            const directionX = dx / dist
                            const directionY = dy / dist
                            const perpendicularX = -directionY
                            const perpendicularY = directionX

                            // Keep the origin anchored while shifting endpoints and bending
                            // the midpoint across the force field's perpendicular axis.
                            targetEndX = f.restEndX + directionX * (force * 0.58)
                            targetEndY = f.restEndY + directionY * (force * 0.58)
                            targetCtrlX = f.restCtrlX + directionX * (force * 0.22) + perpendicularX * (force * 0.92)
                            targetCtrlY = f.restCtrlY + directionY * (force * 0.22) + perpendicularY * (force * 0.92)
                            targetGlow = factor
                        }
                    }

                    // Physics easing on endpoints
                    const axEnd = (targetEndX - f.endX) * SPRING
                    const ayEnd = (targetEndY - f.endY) * SPRING
                    f.vxEnd = (f.vxEnd + axEnd) * FRICTION
                    f.vyEnd = (f.vyEnd + ayEnd) * FRICTION
                    f.endX += f.vxEnd
                    f.endY += f.vyEnd

                    // Physics easing on control points
                    const axCtrl = (targetCtrlX - f.ctrlX) * SPRING
                    const ayCtrl = (targetCtrlY - f.ctrlY) * SPRING
                    f.vxCtrl = (f.vxCtrl + axCtrl) * FRICTION
                    f.vyCtrl = (f.vyCtrl + ayCtrl) * FRICTION
                    f.ctrlX += f.vxCtrl
                    f.ctrlY += f.vyCtrl

                    // Smooth glow transition
                    f.glowFactor += (targetGlow - f.glowFactor) * 0.06

                    if (
                        Math.abs(f.vxEnd) > 0.005 ||
                        Math.abs(f.vyEnd) > 0.005 ||
                        Math.abs(f.endX - f.restEndX) > 0.03 ||
                        Math.abs(f.endY - f.restEndY) > 0.03 ||
                        f.glowFactor > 0.015
                    ) {
                        hasMovement = true
                    }
                }

                const currentAlpha = f.baseAlpha + f.glowFactor * 0.42

                // Draw curved fiber line with a soft maroon gradient and halo.
                const lineGrad = ctx.createLinearGradient(f.originX, f.originY, f.endX, f.endY)
                lineGrad.addColorStop(0, `rgba(${brandRgb}, ${(currentAlpha * 0.82).toFixed(3)})`)
                lineGrad.addColorStop(0.4, `rgba(${brandRgb}, ${(currentAlpha * 1.28).toFixed(3)})`)
                lineGrad.addColorStop(0.85, `rgba(${brandDarkRgb}, ${(currentAlpha * 0.90).toFixed(3)})`)
                lineGrad.addColorStop(1, `rgba(${brandDarkRgb}, ${(currentAlpha * 0.55).toFixed(3)})`)

                ctx.beginPath()
                ctx.moveTo(f.originX, f.originY)
                ctx.quadraticCurveTo(f.ctrlX, f.ctrlY, f.endX, f.endY)
                ctx.strokeStyle = lineGrad
                ctx.lineWidth = f.lineWidth + f.glowFactor * 0.6
                ctx.shadowBlur = 4 + f.glowFactor * 5
                ctx.shadowColor = `rgba(${brandRgb}, ${(0.14 + f.glowFactor * 0.22).toFixed(3)})`
                ctx.stroke()
                ctx.shadowBlur = 0

                // Draw glowing tip pip
                const tipGlow = f.glowFactor
                const tipRadius = f.tipRadius + tipGlow * 1.1

                if (tipGlow > 0.05) {
                    ctx.beginPath()
                    ctx.arc(f.endX, f.endY, tipRadius * 3.2, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(${brandRgb}, ${(tipGlow * 0.30).toFixed(3)})`
                    ctx.fill()
                }

                ctx.beginPath()
                ctx.arc(f.endX, f.endY, tipRadius, 0, Math.PI * 2)
                ctx.fillStyle = tipGlow > 0.15 ? `rgba(${brandRgb}, 0.98)` : `rgba(${brandDarkRgb}, ${(currentAlpha + 0.15).toFixed(3)})`
                ctx.fill()
            }

            // 3. Render traveling light pulses
            if (!REDUCE_MOTION) {
                for (let p of pulses) {
                    p.progress += p.speed
                    if (p.progress > 1) {
                        p.progress = 0
                        p.fiberIndex = Math.floor(Math.random() * fibers.length)
                        p.speed = 0.003 + Math.random() * 0.006
                    }

                    const f = fibers[p.fiberIndex]
                    if (!f) continue

                    // Quadratic Bezier point interpolation: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
                    const t = p.progress
                    const mt = 1 - t
                    const px = mt * mt * f.originX + 2 * mt * t * f.ctrlX + t * t * f.endX
                    const py = mt * mt * f.originY + 2 * mt * t * f.ctrlY + t * t * f.endY
                    const pulseAlpha = Math.sin(t * Math.PI) * 0.65

                    ctx.beginPath()
                    ctx.arc(px, py, p.size * 2.2, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(${brandRgb}, ${(pulseAlpha * 0.22).toFixed(3)})`
                    ctx.fill()

                    ctx.beginPath()
                    ctx.arc(px, py, p.size, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(${brandRgb}, ${(pulseAlpha * 0.72).toFixed(3)})`
                    ctx.fill()
                }
                hasMovement = true
            }

            return hasMovement
        }

        function loop() {
            if (!isRunning || !isVisible) return
            const hasActivity = drawFrame(true)

            if (isVisible && (!REDUCE_MOTION || hasActivity || mouse.active)) {
                animationFrameId = requestAnimationFrame(loop)
            } else {
                isRunning = false
                animationFrameId = null
            }
        }

        function startLoop() {
            if (!isRunning && isVisible) {
                isRunning = true
                animationFrameId = requestAnimationFrame(loop)
            }
        }

        function stopLoop() {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
                animationFrameId = null
            }
            isRunning = false
        }

        // IntersectionObserver to sleep rendering when section is off-screen
        const observer = new IntersectionObserver(
            ([entry]) => {
                isVisible = entry.isIntersecting
                if (isVisible) {
                    startLoop()
                } else {
                    stopLoop()
                }
            },
            { threshold: 0.05 }
        )
        observer.observe(parent)

        // Mouse event listeners
        const handleMouseMove = (e) => {
            if (isTouchDevice || REDUCE_MOTION) return
            const rect = parent.getBoundingClientRect()
            mouse.x = e.clientX - rect.left
            mouse.y = e.clientY - rect.top
            mouse.active = true
            startLoop()
        }

        const handleMouseLeave = () => {
            mouse.active = false
            mouse.x = -9999
            mouse.y = -9999
            startLoop()
        }

        parent.addEventListener('mousemove', handleMouseMove, { passive: true })
        parent.addEventListener('mouseleave', handleMouseLeave, { passive: true })

        const resizeObserver = new ResizeObserver(() => {
            initFibers()
        })
        resizeObserver.observe(parent)

        initFibers()

        return () => {
            stopLoop()
            observer.disconnect()
            resizeObserver.disconnect()
            parent.removeEventListener('mousemove', handleMouseMove)
            parent.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            aria-hidden='true'
            className='absolute inset-0 pointer-events-none -z-0'
            style={{ display: 'block' }}
        />
    )
}

export default FiberBurstCanvas
