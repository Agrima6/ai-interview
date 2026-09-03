import React, { useEffect, useRef } from 'react'

const TAU = Math.PI * 2

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const smoothStep = (edge0, edge1, value) => {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)
}

function createDots(width, height) {
    const spacing = width < 768 ? 38 : 36
    const cols = Math.ceil(width / spacing)
    const rows = Math.ceil(height / spacing)
    const offsetX = (width - cols * spacing) / 2
    const offsetY = (height - rows * spacing) / 2
    const tones = [
        { rgb: '196, 22, 31', alpha: 0.040 },
        { rgb: '139, 14, 22', alpha: 0.032 },
        { rgb: '240, 147, 143', alpha: 0.055 },
    ]

    return Array.from({ length: (cols + 1) * (rows + 1) }, (_, index) => {
        const column = index % (cols + 1)
        const row = Math.floor(index / (cols + 1))
        const originX = offsetX + column * spacing
        const originY = offsetY + row * spacing
        const xRatio = originX / width
        const yRatio = originY / height
        const edgeFade = Math.min(
            smoothStep(0, 0.12, xRatio),
            smoothStep(1, 0.88, xRatio),
            smoothStep(0, 0.12, yRatio),
            smoothStep(1, 0.88, yRatio),
        )
        const centerRightBias = 0.16 + smoothStep(0.14, 0.68, xRatio) * 0.84
        const tone = tones[index % tones.length]

        return {
            originX,
            originY,
            x: originX,
            y: originY,
            phase: index * 1.618,
            baseAlpha: tone.alpha * edgeFade * centerRightBias,
            rgb: tone.rgb,
            currentIntensity: 0,
        }
    })
}

function HeroDotsBackground({ pointerRef }) {
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
        let dots = []
        let frameId = null
        const pointer = pointerRef.current
        const startedAt = performance.now()

        const draw = (elapsed) => {
            if (!width || !height) return
            const time = elapsed / 1000
            const radius = Math.max(width * 0.24, 220)
            const spotlightRadius = radius * 1.55

            if (!reduceMotion && !isTouchDevice) {
                pointer.x += (pointer.targetX - pointer.x) * 0.065
                pointer.y += (pointer.targetY - pointer.y) * 0.065
                pointer.intensity += (pointer.targetIntensity - pointer.intensity) * 0.055
            } else {
                pointer.intensity = 0
            }

            ctx.clearRect(0, 0, width, height)

            if (pointer.intensity > 0.001 && pointer.x > -100) {
                const spotlight = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, spotlightRadius)
                spotlight.addColorStop(0, `rgba(240, 147, 143, ${(0.085 * pointer.intensity).toFixed(3)})`)
                spotlight.addColorStop(0.32, `rgba(196, 22, 31, ${(0.035 * pointer.intensity).toFixed(3)})`)
                spotlight.addColorStop(0.72, 'rgba(240, 147, 143, 0.012)')
                spotlight.addColorStop(1, 'rgba(240, 147, 143, 0)')
                ctx.fillStyle = spotlight
                ctx.fillRect(0, 0, width, height)
            }

            dots.forEach((dot) => {
                const dx = pointer.x - dot.originX
                const dy = pointer.y - dot.originY
                const distance = Math.sqrt(dx * dx + dy * dy)
                const influence = pointer.intensity > 0 ? Math.exp(-(distance * distance) / (2 * radius * radius)) * pointer.intensity : 0
                const directionX = distance > 0 ? dx / distance : 0
                const directionY = distance > 0 ? dy / distance : 0
                const idleDrift = !reduceMotion && !isTouchDevice ? Math.sin(time * 0.18 + dot.phase) * 0.32 : 0
                const targetX = dot.originX + directionX * influence * 4.2 + idleDrift
                const targetY = dot.originY + directionY * influence * 4.2 + idleDrift * 0.65

                dot.x += (targetX - dot.x) * 0.085
                dot.y += (targetY - dot.y) * 0.085
                dot.currentIntensity += (influence - dot.currentIntensity) * 0.09

                const active = dot.currentIntensity
                const alpha = dot.baseAlpha + active * 0.12
                if (alpha <= 0.004) return

                if (active > 0.08) {
                    ctx.beginPath()
                    ctx.arc(dot.x, dot.y, 2.2 + active * 1.2, 0, TAU)
                    ctx.fillStyle = `rgba(196, 22, 31, ${(active * 0.045).toFixed(3)})`
                    ctx.fill()
                }

                ctx.beginPath()
                ctx.arc(dot.x, dot.y, 0.9 + active * 0.75, 0, TAU)
                ctx.fillStyle = `rgba(${active > 0.28 ? '196, 22, 31' : dot.rgb}, ${alpha.toFixed(3)})`
                ctx.fill()
            })
        }

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
            dots = createDots(width, height)
            draw(0)
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
            pointer.targetIntensity = 1
        }

        const handleMouseLeave = () => {
            pointer.targetX = -1000
            pointer.targetY = -1000
            pointer.targetIntensity = 0
        }

        const handleTouchChange = (event) => {
            isTouchDevice = event.matches
            if (isTouchDevice) {
                pointer.targetIntensity = 0
                resize()
            }
        }

        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(parent)
        parent.addEventListener('mousemove', handleMouseMove, { passive: true })
        parent.addEventListener('mouseleave', handleMouseLeave, { passive: true })
        touchQuery?.addEventListener?.('change', handleTouchChange)
        resize()

        if (!reduceMotion) frameId = requestAnimationFrame(animate)

        return () => {
            if (frameId) cancelAnimationFrame(frameId)
            resizeObserver.disconnect()
            parent.removeEventListener('mousemove', handleMouseMove)
            parent.removeEventListener('mouseleave', handleMouseLeave)
            touchQuery?.removeEventListener?.('change', handleTouchChange)
        }
    }, [pointerRef])

    return <canvas ref={canvasRef} aria-hidden='true' className='pointer-events-none absolute inset-0 z-0' />
}

export default HeroDotsBackground
