import React, { useEffect, useRef } from 'react'

// Renders the AI interviewer as a real-time canvas particle system - not a
// video/GIF. Particles are sampled once from a head+shoulders silhouette and
// animate from a single point of light into that shape (`formProgress`
// 0 -> 1), then stay "alive" with a gentle breathing motion. `state` drives
// how they behave once formed: speaking pulses/glows, listening reacts to
// `audioLevel` (0-1, from a real mic AnalyserNode), thinking gets jittery.
const PARTICLE_COUNT_DESKTOP = 2200
const PARTICLE_COUNT_MOBILE = 900

// Builds target points inside + along the edge of a head/neck/shoulders
// silhouette, in a normalized -1..1 space (x right, y down). Rejection
// sampling against an offscreen canvas keeps this simple and fast enough to
// run once per mount.
const buildSilhouette = (count) => {
    const RES = 300
    const off = document.createElement('canvas')
    off.width = RES
    off.height = RES
    const ctx = off.getContext('2d')
    ctx.clearRect(0, 0, RES, RES)
    ctx.fillStyle = '#fff'

    const cx = RES * 0.5
    // Head
    ctx.beginPath()
    ctx.ellipse(cx, RES * 0.34, RES * 0.145, RES * 0.165, 0, 0, Math.PI * 2)
    ctx.fill()
    // Neck
    ctx.fillRect(cx - RES * 0.045, RES * 0.46, RES * 0.09, RES * 0.08)
    // Shoulders (trapezoid, fades toward the bottom edge of the frame)
    ctx.beginPath()
    ctx.moveTo(cx - RES * 0.07, RES * 0.52)
    ctx.lineTo(cx + RES * 0.07, RES * 0.52)
    ctx.lineTo(cx + RES * 0.34, RES * 0.98)
    ctx.lineTo(cx - RES * 0.34, RES * 0.98)
    ctx.closePath()
    ctx.fill()

    const img = ctx.getImageData(0, 0, RES, RES).data
    const inside = (px, py) => {
        if (px < 0 || py < 0 || px >= RES || py >= RES) return false
        return img[(py * RES + px) * 4 + 3] > 40
    }

    const points = []
    let guard = 0
    while (points.length < count && guard < count * 60) {
        guard++
        const px = Math.floor(Math.random() * RES)
        const py = Math.floor(Math.random() * RES)
        if (inside(px, py)) {
            points.push({
                tx: (px / RES - 0.5) * 2,
                ty: (py / RES - 0.5) * 2,
            })
        }
    }
    return points
}

function AIInterviewerFigure({ state = 'idle', formProgress = 1, audioLevel = 0, className = '' }) {
    const canvasRef = useRef(null)
    const particlesRef = useRef(null)
    const rafRef = useRef(null)
    const stateRef = useRef(state)
    const formProgressRef = useRef(formProgress)
    const audioLevelRef = useRef(audioLevel)

    stateRef.current = state
    formProgressRef.current = formProgress
    audioLevelRef.current = audioLevel

    useEffect(() => {
        const isMobile = window.innerWidth < 640
        const count = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP
        const targets = buildSilhouette(count)
        particlesRef.current = targets.map((t) => ({
            tx: t.tx,
            ty: t.ty,
            // Starts collapsed at the origin (the "point of light") and
            // eases outward as formProgress climbs.
            x: 0,
            y: 0,
            size: 0.6 + Math.random() * 1.6,
            phase: Math.random() * Math.PI * 2,
            speed: 0.6 + Math.random() * 0.8,
            jitterSeed: Math.random(),
        }))
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 2)

        const resize = () => {
            const parent = canvas.parentElement
            if (!parent) return
            width = parent.clientWidth
            height = parent.clientHeight
            canvas.width = width * dpr
            canvas.height = height * dpr
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
        }
        resize()
        const ro = new ResizeObserver(resize)
        if (canvas.parentElement) ro.observe(canvas.parentElement)

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

        let start = performance.now()
        const draw = (now) => {
            const t = (now - start) / 1000
            const particles = particlesRef.current || []
            const cx = width / 2
            const cy = height / 2
            const scale = Math.min(width, height) * 0.42

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, width, height)

            const s = stateRef.current
            const fp = Math.max(0, Math.min(1, formProgressRef.current))
            const level = Math.max(0, Math.min(1, audioLevelRef.current))
            const eased = 1 - Math.pow(1 - fp, 3)

            // Ambient core glow behind the figure.
            const glowBoost = s === 'speaking' ? 0.55 + 0.25 * Math.sin(t * 6) : s === 'listening' ? 0.35 + level * 0.4 : 0.28
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * (0.9 + glowBoost * 0.4))
            grad.addColorStop(0, `rgba(196,22,31,${0.18 + glowBoost * 0.18})`)
            grad.addColorStop(1, 'rgba(196,22,31,0)')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, width, height)

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i]

                let jitterX = 0, jitterY = 0
                if (s === 'thinking') {
                    jitterX = Math.sin(t * 3 * p.speed + p.phase) * 0.035
                    jitterY = Math.cos(t * 2.6 * p.speed + p.phase * 1.3) * 0.035
                } else {
                    // Gentle breathing, always-on so the figure never looks frozen.
                    jitterX = Math.sin(t * 0.8 * p.speed + p.phase) * 0.008
                    jitterY = Math.cos(t * 0.7 * p.speed + p.phase) * 0.008
                }

                if (s === 'listening') {
                    // Particles pull very slightly inward toward the head, more so
                    // as the mic gets louder.
                    const pull = level * 0.05
                    jitterX -= p.tx * pull
                    jitterY -= p.ty * pull
                }

                const targetX = fp < 1 ? p.tx * eased : p.tx + jitterX
                const targetY = fp < 1 ? p.ty * eased : p.ty + jitterY

                // Before formation completes, particles still drift a bit off
                // their straight-line path so it reads as an energy field, not
                // a mechanical snap into place.
                const swirl = fp < 1 ? (1 - eased) * Math.sin(t * 2 + p.phase) * 0.25 : 0

                p.x = targetX + swirl * (p.ty)
                p.y = targetY - swirl * (p.tx)

                const px = cx + p.x * scale
                const py = cy + p.y * scale

                let alpha = 0.35 + 0.5 * Math.min(1, fp * 1.4)
                let size = p.size
                if (s === 'speaking') {
                    const pulse = 0.5 + 0.5 * Math.sin(t * 8 + p.phase)
                    alpha *= 0.8 + pulse * 0.4
                    size *= 1 + pulse * 0.25
                } else if (s === 'listening') {
                    alpha *= 0.85 + level * 0.5
                } else if (s === 'thinking') {
                    alpha *= 0.6 + 0.4 * Math.sin(t * 5 + p.jitterSeed * 10)
                }

                const isCore = p.ty < -0.55 // rough "face" band gets warmer light
                ctx.fillStyle = isCore
                    ? `rgba(255, 214, 170, ${alpha * 0.9})`
                    : `rgba(255, 246, 244, ${alpha})`
                ctx.beginPath()
                ctx.arc(px, py, size * (dpr >= 2 ? 1 : 1.15), 0, Math.PI * 2)
                ctx.fill()
            }

            // Listening ring - a soft audio-reactive halo around the head.
            if (stateRef.current === 'listening' && fp >= 1) {
                const ringR = scale * (0.55 + level * 0.18)
                ctx.strokeStyle = `rgba(196,22,31,${0.25 + level * 0.35})`
                ctx.lineWidth = 1.5 + level * 2
                ctx.beginPath()
                ctx.arc(cx, cy - scale * 0.25, ringR * 0.4, 0, Math.PI * 2)
                ctx.stroke()
            }

            rafRef.current = requestAnimationFrame(draw)
        }

        if (reduceMotion) {
            // Static formed pose, no animation loop.
            formProgressRef.current = 1
            draw(performance.now())
        } else {
            rafRef.current = requestAnimationFrame(draw)
        }

        return () => {
            cancelAnimationFrame(rafRef.current)
            ro.disconnect()
        }
    }, [])

    return (
        <div className={`bg-[#0a0507] overflow-hidden ${className}`}>
            <canvas ref={canvasRef} className='w-full h-full block' />
        </div>
    )
}

export default AIInterviewerFigure
