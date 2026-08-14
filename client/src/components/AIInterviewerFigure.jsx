import React, { useEffect, useRef } from 'react'

// Renders the AI interviewer as a real-time canvas particle system - not a
// video/GIF. Particles are sampled once from a head+shoulders silhouette,
// weighted heavily toward the OUTLINE/contour (so it reads as flowing
// strands tracing a figure, not a scattered dot-cloud), and animate from a
// glowing point at the bottom into that shape (`formProgress` 0 -> 1), then
// stay "alive" with a gentle breathing motion. `state` drives behavior once
// formed: speaking pulses/glows, listening reacts to `audioLevel` (0-1, from
// a real mic AnalyserNode), thinking gets jittery.
const PARTICLE_COUNT_DESKTOP = 2600
const PARTICLE_COUNT_MOBILE = 1100
const EDGE_RATIO = 0.68 // fraction of particles sampled along the contour vs interior fill
const ORIGIN_Y = 1.35 // bottom glow orb, in normalized -1..1 space

// "Face" anchor used for the warm/cool color gradient - near here reads
// warm amber (like the reference's glowing forehead), fading to cool
// cyan/blue further out along the contour.
const FACE_X = 0
const FACE_Y = -0.32
const WARM_RADIUS = 0.55

// Builds target points from a head/neck/shoulders silhouette, in a
// normalized -1..1 space (x right, y down). Rejection sampling against an
// offscreen canvas keeps this simple and fast enough to run once per mount.
// Most points are drawn from the silhouette's OUTLINE (a few px band around
// the true edge, so contour strands have some thickness) rather than
// uniformly filling the interior.
const buildSilhouette = (count) => {
    const RES = 320
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
    // An interior pixel with at least one outside 8-neighbor is a contour pixel.
    const isEdge = (px, py) => {
        if (!inside(px, py)) return false
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                if (!inside(px + dx, py + dy)) return true
            }
        }
        return false
    }

    const edgeCount = Math.round(count * EDGE_RATIO)
    const points = []

    let guard = 0
    while (points.length < edgeCount && guard < edgeCount * 200) {
        guard++
        const px = Math.floor(Math.random() * RES)
        const py = Math.floor(Math.random() * RES)
        if (isEdge(px, py)) {
            points.push({
                tx: (px / RES - 0.5) * 2,
                ty: (py / RES - 0.5) * 2,
                edge: true,
            })
        }
    }
    guard = 0
    while (points.length < count && guard < (count - edgeCount) * 60) {
        guard++
        const px = Math.floor(Math.random() * RES)
        const py = Math.floor(Math.random() * RES)
        if (inside(px, py)) {
            points.push({
                tx: (px / RES - 0.5) * 2,
                ty: (py / RES - 0.5) * 2,
                edge: false,
            })
        }
    }
    return points
}

// A handful of "comet" trails that sweep in wide curved arcs from off-frame
// toward the figure during formation - the single dramatic flowing line
// seen in the reference, layered on top of the main particle cloud.
const HERO_COUNT = 3
const buildHeroPaths = () => {
    const paths = []
    for (let i = 0; i < HERO_COUNT; i++) {
        const side = i % 2 === 0 ? -1 : 1
        const startX = side * (1.6 + Math.random() * 0.5)
        const startY = 0.8 + Math.random() * 0.6
        const endAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4
        const endX = Math.cos(endAngle) * (0.35 + Math.random() * 0.25)
        const endY = FACE_Y + Math.sin(endAngle) * 0.3
        const ctrlX = side * (0.9 + Math.random() * 0.4)
        const ctrlY = -0.2 + Math.random() * 0.6
        paths.push({ startX, startY, ctrlX, ctrlY, endX, endY, offset: i * 0.12, trail: [] })
    }
    return paths
}

function AIInterviewerFigure({ state = 'idle', formProgress = 1, audioLevel = 0, className = '' }) {
    const canvasRef = useRef(null)
    const particlesRef = useRef(null)
    const heroRef = useRef(null)
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
        particlesRef.current = targets.map((t) => {
            const distFromFace = Math.hypot(t.tx - FACE_X, t.ty - FACE_Y)
            const warmth = Math.max(0, 1 - distFromFace / WARM_RADIUS)
            return {
                tx: t.tx,
                ty: t.ty,
                edge: t.edge,
                warmth,
                x: 0,
                y: 0,
                px: 0, py: 0, // previous frame's screen position, for motion trails
                hasPrev: false,
                size: t.edge ? 0.55 + Math.random() * 1.1 : 0.9 + Math.random() * 1.8,
                phase: Math.random() * Math.PI * 2,
                speed: 0.6 + Math.random() * 0.8,
                jitterSeed: Math.random(),
            }
        })
        heroRef.current = buildHeroPaths()
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
            const heroes = heroRef.current || []
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

            // Origin glow orb particles rise from during formation.
            if (fp < 1) {
                const oy = cy + ORIGIN_Y * scale
                const orbFade = 1 - eased
                const orbR = scale * (0.14 + 0.05 * Math.sin(t * 4))
                const orbGrad = ctx.createRadialGradient(cx, oy, 0, cx, oy, orbR * 3)
                orbGrad.addColorStop(0, `rgba(255,255,255,${0.9 * orbFade})`)
                orbGrad.addColorStop(0.3, `rgba(120,200,255,${0.5 * orbFade})`)
                orbGrad.addColorStop(1, 'rgba(196,22,31,0)')
                ctx.fillStyle = orbGrad
                ctx.beginPath()
                ctx.arc(cx, oy, orbR * 3, 0, Math.PI * 2)
                ctx.fill()
            }

            // Hero comet trails - a few bold flowing arcs sweeping into the
            // figure while it forms.
            if (fp < 0.97) {
                for (const h of heroes) {
                    const e = Math.min(1, eased + h.offset)
                    const oneMinus = 1 - e
                    // Quadratic bezier from off-frame start, through a wide
                    // control point, into a spot along the head/shoulder edge.
                    const bx = oneMinus * oneMinus * h.startX + 2 * oneMinus * e * h.ctrlX + e * e * h.endX
                    const by = oneMinus * oneMinus * h.startY + 2 * oneMinus * e * h.ctrlY + e * e * h.endY
                    const hx = cx + bx * scale
                    const hy = cy + by * scale
                    h.trail.push({ x: hx, y: hy })
                    if (h.trail.length > 22) h.trail.shift()

                    for (let i = 1; i < h.trail.length; i++) {
                        const a = (i / h.trail.length) * (1 - e * 0.6) * 0.7
                        ctx.strokeStyle = `rgba(150,215,255,${a})`
                        ctx.lineWidth = 1.4
                        ctx.beginPath()
                        ctx.moveTo(h.trail[i - 1].x, h.trail[i - 1].y)
                        ctx.lineTo(h.trail[i].x, h.trail[i].y)
                        ctx.stroke()
                    }
                }
            }

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

                // During formation, particles rise from the bottom glow orb
                // up into their target position, rather than expanding
                // outward from the figure's own center.
                const targetX = fp < 1 ? p.tx * eased : p.tx + jitterX
                const targetY = fp < 1 ? ORIGIN_Y + (p.ty - ORIGIN_Y) * eased : p.ty + jitterY

                // Before formation completes, particles still drift a bit off
                // their straight-line path so it reads as an energy field, not
                // a mechanical snap into place.
                const swirl = fp < 1 ? (1 - eased) * Math.sin(t * 2 + p.phase) * 0.25 : 0

                p.x = targetX + swirl * (p.ty)
                p.y = targetY - swirl * (p.tx)

                const px = cx + p.x * scale
                const py = cy + p.y * scale

                let alpha = (p.edge ? 0.5 : 0.28) + (p.edge ? 0.45 : 0.3) * Math.min(1, fp * 1.4)
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

                // Warm amber near the "face" anchor, cooling to blue/cyan
                // further out - matches the reference's glow gradient.
                const r = Math.round(255 - p.warmth * 65)
                const g = Math.round(200 + p.warmth * 30 - (1 - p.warmth) * 30)
                const b = Math.round(150 + (1 - p.warmth) * 105 - p.warmth * 60)
                const color = `rgba(${r},${g},${b},${alpha})`

                // Motion trail: only visible while the particle is actually
                // moving fast (formation swirl) - fades to a plain dot once
                // settled, so idle breathing doesn't smear into mush.
                if (p.hasPrev) {
                    const moved = Math.hypot(px - p.px, py - p.py)
                    if (moved > 0.6) {
                        ctx.strokeStyle = p.edge ? `rgba(150,215,255,${Math.min(0.5, moved / 40)})` : `rgba(255,235,210,${Math.min(0.35, moved / 50)})`
                        ctx.lineWidth = size * 0.7
                        ctx.beginPath()
                        ctx.moveTo(p.px, p.py)
                        ctx.lineTo(px, py)
                        ctx.stroke()
                    }
                }
                p.px = px
                p.py = py
                p.hasPrev = true

                ctx.fillStyle = color
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
