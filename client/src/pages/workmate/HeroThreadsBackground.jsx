import React, { useEffect, useRef } from 'react'

const TAU = Math.PI * 2

const rgba = (rgb, alpha) => `rgba(${rgb}, ${alpha.toFixed(3)})`

function createStrands(width, height) {
    const count = width < 768 ? 10 : width < 1024 ? 16 : 24
    const palette = [
        { rgb: '196, 22, 31', alpha: 0.12, width: 0.85 },
        { rgb: '139, 14, 22', alpha: 0.17, width: 1.0 },
        { rgb: '240, 147, 143', alpha: 0.14, width: 0.9 },
        { rgb: '196, 22, 31', alpha: 0.24, width: 1.25 },
    ]

    return Array.from({ length: count }, (_, index) => {
        const depth = ((index * 7) % count) / Math.max(count - 1, 1)
        const tone = palette[index % palette.length]
        return {
            baseY: height * (0.10 + (index / Math.max(count - 1, 1)) * 0.80),
            amplitude: height * (0.012 + (index % 4) * 0.004),
            phase: index * 1.47,
            speed: 0.055 + (index % 5) * 0.012,
            frequency: 0.72 + (index % 3) * 0.09,
            depth,
            glow: index % 7 === 0,
            ...tone,
        }
    })
}

/**
 * Local Threads-style canvas treatment for the hero experiment.
 * It is inspired by flowing strand effects, not an official ReactBits import.
 */
function HeroThreadsBackground() {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const parent = canvas?.parentElement
        if (!canvas || !parent) return undefined

        const ctx = canvas.getContext('2d')
        if (!ctx) return undefined

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const touchQuery = window.matchMedia?.('(hover: none) and (pointer: coarse)')
        let isTouchDevice = touchQuery?.matches ?? false
        let width = 0
        let height = 0
        let strands = []
        let frameId = null
        const startedAt = performance.now()
        const pointer = { targetX: -1000, targetY: -1000, x: -1000, y: -1000 }

        const resize = () => {
            const rect = parent.getBoundingClientRect()
            const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
            width = rect.width
            height = rect.height
            canvas.width = Math.floor(width * dpr)
            canvas.height = Math.floor(height * dpr)
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            strands = createStrands(width, height)
            draw(0)
        }

        const draw = (elapsed) => {
            if (!width || !height) return
            ctx.clearRect(0, 0, width, height)

            const time = elapsed / 1000
            const radius = Math.max(width * 0.28, 230)
            if (!reduceMotion && !isTouchDevice) {
                pointer.x += (pointer.targetX - pointer.x) * 0.045
                pointer.y += (pointer.targetY - pointer.y) * 0.045
            }

            strands.forEach((strand) => {
                const line = []
                const steps = 6
                for (let step = 0; step <= steps; step += 1) {
                    const x = -width * 0.10 + (width * 1.20 * step) / steps
                    const progress = x / width
                    const wave = Math.sin(progress * TAU * strand.frequency + strand.phase + time * strand.speed) * strand.amplitude
                    const secondaryWave = Math.sin(progress * TAU * 1.48 - strand.phase * 0.7 + time * strand.speed * 0.62) * strand.amplitude * 0.32
                    const cursorDistance = Math.abs(x - pointer.x)
                    const cursorInfluence = isTouchDevice || reduceMotion ? 0 : Math.exp(-(cursorDistance * cursorDistance) / (2 * radius * radius))
                    const targetY = strand.baseY + wave + secondaryWave
                    const cursorBend = cursorInfluence * (pointer.y - targetY) * 0.18
                    const cursorShift = cursorInfluence * (pointer.x - x) * 0.035
                    line.push({ x: x + cursorShift, y: targetY + cursorBend })
                }

                const gradient = ctx.createLinearGradient(0, 0, width, 0)
                const strength = strand.alpha * (0.78 + strand.depth * 0.22)
                gradient.addColorStop(0, rgba(strand.rgb, strength * 0.05))
                gradient.addColorStop(0.18, rgba(strand.rgb, strength * 0.20))
                gradient.addColorStop(0.42, rgba(strand.rgb, strength * 0.72))
                gradient.addColorStop(0.62, rgba(strand.rgb, strength))
                gradient.addColorStop(0.84, rgba(strand.rgb, strength * 0.88))
                gradient.addColorStop(1, rgba(strand.rgb, strength * 0.58))

                ctx.beginPath()
                ctx.moveTo(line[0].x, line[0].y)
                for (let index = 0; index < line.length - 1; index += 1) {
                    const start = line[index]
                    const end = line[index + 1]
                    const segment = end.x - start.x
                    ctx.bezierCurveTo(
                        start.x + segment * 0.42,
                        start.y,
                        end.x - segment * 0.42,
                        end.y,
                        end.x,
                        end.y,
                    )
                }
                if (strand.glow) {
                    ctx.save()
                    ctx.strokeStyle = rgba('196, 22, 31', 0.055)
                    ctx.lineWidth = strand.width + 0.7
                    ctx.shadowColor = rgba('196, 22, 31', 0.16)
                    ctx.shadowBlur = 9
                    ctx.stroke()
                    ctx.restore()
                }

                ctx.strokeStyle = gradient
                ctx.lineWidth = strand.width
                ctx.lineCap = 'round'
                ctx.stroke()
            })
        }

        const animate = (now) => {
            draw(now - startedAt)
            frameId = requestAnimationFrame(animate)
        }

        const handleMouseMove = (event) => {
            if (reduceMotion || isTouchDevice) return
            const rect = parent.getBoundingClientRect()
            pointer.targetX = event.clientX - rect.left
            pointer.targetY = event.clientY - rect.top
        }

        const handleMouseLeave = () => {
            pointer.targetX = -1000
            pointer.targetY = -1000
        }

        const handleTouchChange = (event) => {
            isTouchDevice = event.matches
            if (isTouchDevice) {
                pointer.targetX = -1000
                pointer.targetY = -1000
                resize()
            }
        }

        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(parent)
        parent.addEventListener('mousemove', handleMouseMove, { passive: true })
        parent.addEventListener('mouseleave', handleMouseLeave, { passive: true })
        touchQuery?.addEventListener?.('change', handleTouchChange)
        resize()

        if (!reduceMotion) {
            frameId = requestAnimationFrame(animate)
        }

        return () => {
            if (frameId) cancelAnimationFrame(frameId)
            resizeObserver.disconnect()
            parent.removeEventListener('mousemove', handleMouseMove)
            parent.removeEventListener('mouseleave', handleMouseLeave)
            touchQuery?.removeEventListener?.('change', handleTouchChange)
        }
    }, [])

    return <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 z-0 pointer-events-none' />
}

export default HeroThreadsBackground
