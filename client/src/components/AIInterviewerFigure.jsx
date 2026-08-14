import React, { useEffect, useRef } from 'react'

// The AI interviewer, rendered as a live particle-constructed human figure.
//
// Generation method (important): the target point cloud is NOT random points
// inside a geometric silhouette - that approach produces a "pawn". Instead an
// anatomically-proportioned female head-and-shoulders portrait is authored
// onto an offscreen canvas (cranium/temple/zygomatic/jaw/chin contours, hair
// mass and strands, trapezius + deltoid shoulder line) together with interior
// feature strokes (brows, eyes, nose, lips, cheekbones). That render becomes a
// DENSITY MAP: particles are rejection-sampled proportional to pixel
// brightness, so contours and facial features carry most of the particles and
// the interior fill carries very few. The face is therefore suggested by
// particle density rather than drawn.
//
// Particles then live as a spring-and-noise system (position, velocity,
// curl-ish turbulence, depth) that flows toward those targets, so the figure
// is always in motion rather than a frozen scatter plot.

const COUNT_DESKTOP = 5200
const COUNT_MOBILE = 2100
const RES = 512

// Origin the particles stream up from while forming, in normalized units.
const ORIGIN_Y = 1.15

// ---- Anatomical layout (fractions of RES) -------------------------------
const A = {
    cx: 0.5,
    headTop: 0.10,     // top of cranium (under the hair mass)
    chin: 0.52,
    headHalfW: 0.152,
    templeY: 0.27,
    cheekY: 0.375,
    jawY: 0.468,
    browY: 0.288,
    eyeY: 0.318,
    eyeDX: 0.063,
    eyeHalfW: 0.027,
    noseBaseY: 0.415,
    mouthY: 0.463,
    neckTop: 0.515,
    neckBottom: 0.615,
    neckHalfW: 0.055,
    trapX: 0.215,      // where the trapezius slope ends
    trapY: 0.700,
    shoulderX: 0.360,  // deltoid cap - shoulders stay broad + horizontal
    shoulderY: 0.762,
    armX: 0.378,
    bodyBottom: 0.880,
    hairHalfW: 0.192,
    hairTop: 0.072,
    hairFallY: 0.560,
}

// Face outline: chin -> jaw -> zygomatic -> temple -> cranium, mirrored.
const traceHead = (ctx, s) => {
    const { cx, chin, jawY, cheekY, templeY, headTop, headHalfW } = A
    ctx.beginPath()
    ctx.moveTo(cx * s, chin * s)
    // right side going up
    ctx.bezierCurveTo(
        (cx + headHalfW * 0.62) * s, (chin - 0.012) * s,
        (cx + headHalfW * 0.90) * s, jawY * s,
        (cx + headHalfW * 0.97) * s, cheekY * s
    )
    ctx.bezierCurveTo(
        (cx + headHalfW * 1.01) * s, (cheekY - 0.045) * s,
        (cx + headHalfW) * s, (templeY + 0.02) * s,
        (cx + headHalfW * 0.96) * s, templeY * s
    )
    ctx.bezierCurveTo(
        (cx + headHalfW * 0.90) * s, (headTop + 0.055) * s,
        (cx + headHalfW * 0.55) * s, headTop * s,
        cx * s, headTop * s
    )
    // left side coming down (mirror)
    ctx.bezierCurveTo(
        (cx - headHalfW * 0.55) * s, headTop * s,
        (cx - headHalfW * 0.90) * s, (headTop + 0.055) * s,
        (cx - headHalfW * 0.96) * s, templeY * s
    )
    ctx.bezierCurveTo(
        (cx - headHalfW) * s, (templeY + 0.02) * s,
        (cx - headHalfW * 1.01) * s, (cheekY - 0.045) * s,
        (cx - headHalfW * 0.97) * s, cheekY * s
    )
    ctx.bezierCurveTo(
        (cx - headHalfW * 0.90) * s, jawY * s,
        (cx - headHalfW * 0.62) * s, (chin - 0.012) * s,
        cx * s, chin * s
    )
    ctx.closePath()
}

// Outer hair volume. The face area is punched back out of this later
// (destination-out), which leaves hair reading as a band framing the face
// rather than a hood covering it.
const traceHair = (ctx, s) => {
    const { cx, hairHalfW, hairTop, hairFallY, templeY } = A
    ctx.beginPath()
    ctx.moveTo(cx * s, hairTop * s)
    ctx.bezierCurveTo(
        (cx + hairHalfW * 0.78) * s, hairTop * s,
        (cx + hairHalfW) * s, (templeY - 0.07) * s,
        (cx + hairHalfW * 0.97) * s, (templeY + 0.04) * s
    )
    ctx.bezierCurveTo(
        (cx + hairHalfW * 0.93) * s, (hairFallY - 0.09) * s,
        (cx + hairHalfW * 0.74) * s, (hairFallY - 0.02) * s,
        (cx + hairHalfW * 0.52) * s, hairFallY * s
    )
    ctx.lineTo((cx - hairHalfW * 0.52) * s, hairFallY * s)
    ctx.bezierCurveTo(
        (cx - hairHalfW * 0.74) * s, (hairFallY - 0.02) * s,
        (cx - hairHalfW * 0.93) * s, (hairFallY - 0.09) * s,
        (cx - hairHalfW * 0.97) * s, (templeY + 0.04) * s
    )
    ctx.bezierCurveTo(
        (cx - hairHalfW) * s, (templeY - 0.07) * s,
        (cx - hairHalfW * 0.78) * s, hairTop * s,
        cx * s, hairTop * s
    )
    ctx.closePath()
}

// Neck + trapezius + deltoid caps + upper arms. Deliberately broad and
// horizontal across the shoulders so it never reads as a cone/dress.
const traceTorso = (ctx, s) => {
    const { cx, neckTop, neckBottom, neckHalfW, trapX, trapY, shoulderX, shoulderY, armX, bodyBottom } = A
    ctx.beginPath()
    ctx.moveTo((cx - neckHalfW) * s, neckTop * s)
    ctx.lineTo((cx + neckHalfW) * s, neckTop * s)
    ctx.lineTo((cx + neckHalfW * 1.15) * s, neckBottom * s)
    // trapezius slope out to the shoulder
    ctx.bezierCurveTo(
        (cx + trapX * 0.55) * s, (neckBottom + 0.012) * s,
        (cx + trapX * 0.92) * s, (trapY - 0.022) * s,
        (cx + trapX) * s, trapY * s
    )
    // deltoid cap
    ctx.bezierCurveTo(
        (cx + shoulderX * 0.80) * s, (trapY + 0.018) * s,
        (cx + shoulderX) * s, (shoulderY - 0.030) * s,
        (cx + armX) * s, shoulderY * s
    )
    ctx.lineTo((cx + armX * 1.02) * s, bodyBottom * s)
    ctx.lineTo((cx - armX * 1.02) * s, bodyBottom * s)
    ctx.lineTo((cx - armX) * s, shoulderY * s)
    ctx.bezierCurveTo(
        (cx - shoulderX) * s, (shoulderY - 0.030) * s,
        (cx - shoulderX * 0.80) * s, (trapY + 0.018) * s,
        (cx - trapX) * s, trapY * s
    )
    ctx.bezierCurveTo(
        (cx - trapX * 0.92) * s, (trapY - 0.022) * s,
        (cx - trapX * 0.55) * s, (neckBottom + 0.012) * s,
        (cx - neckHalfW * 1.15) * s, neckBottom * s
    )
    ctx.closePath()
}

// Interior feature strokes. These are what make the face readable once
// sampled - they get the highest density weight of anything on the map.
const drawFeatures = (ctx, s) => {
    const { cx, browY, eyeY, eyeDX, eyeHalfW, noseBaseY, mouthY, cheekY, chin, jawY } = A
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const side of [-1, 1]) {
        const ex = cx + side * eyeDX

        // Brow
        ctx.strokeStyle = 'rgb(240,240,240)'
        ctx.lineWidth = 0.011 * s
        ctx.beginPath()
        ctx.moveTo((ex - side * eyeHalfW * 1.25) * s, (browY + 0.006) * s)
        ctx.quadraticCurveTo(ex * s, (browY - 0.011) * s, (ex + side * eyeHalfW * 1.15) * s, (browY + 0.002) * s)
        ctx.stroke()

        // Eye - upper lid carries most of the visual weight of an eye
        ctx.strokeStyle = 'rgb(255,255,255)'
        ctx.lineWidth = 0.0105 * s
        ctx.beginPath()
        ctx.moveTo((ex - eyeHalfW) * s, eyeY * s)
        ctx.quadraticCurveTo(ex * s, (eyeY - 0.019) * s, (ex + eyeHalfW) * s, eyeY * s)
        ctx.stroke()
        // Lower lid, lighter
        ctx.strokeStyle = 'rgb(190,190,190)'
        ctx.lineWidth = 0.006 * s
        ctx.beginPath()
        ctx.moveTo((ex - eyeHalfW * 0.9) * s, (eyeY + 0.002) * s)
        ctx.quadraticCurveTo(ex * s, (eyeY + 0.013) * s, (ex + eyeHalfW * 0.9) * s, (eyeY + 0.002) * s)
        ctx.stroke()
        // Iris
        ctx.fillStyle = 'rgb(255,255,255)'
        ctx.beginPath()
        ctx.arc(ex * s, (eyeY + 0.004) * s, 0.0085 * s, 0, Math.PI * 2)
        ctx.fill()

        // Cheekbone sweep
        ctx.strokeStyle = 'rgb(150,150,150)'
        ctx.lineWidth = 0.007 * s
        ctx.beginPath()
        ctx.moveTo((cx + side * 0.128) * s, (cheekY - 0.028) * s)
        ctx.quadraticCurveTo((cx + side * 0.105) * s, (cheekY + 0.030) * s, (cx + side * 0.055) * s, (cheekY + 0.055) * s)
        ctx.stroke()

        // Jaw definition toward the chin
        ctx.strokeStyle = 'rgb(140,140,140)'
        ctx.lineWidth = 0.0065 * s
        ctx.beginPath()
        ctx.moveTo((cx + side * 0.132) * s, jawY * s)
        ctx.quadraticCurveTo((cx + side * 0.085) * s, (chin - 0.004) * s, cx * s, chin * s)
        ctx.stroke()
    }

    // Nose: bridge + base + nostril wings
    ctx.strokeStyle = 'rgb(200,200,200)'
    ctx.lineWidth = 0.0075 * s
    ctx.beginPath()
    ctx.moveTo((cx - 0.012) * s, (eyeY + 0.012) * s)
    ctx.lineTo((cx - 0.016) * s, (noseBaseY - 0.018) * s)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo((cx + 0.012) * s, (eyeY + 0.012) * s)
    ctx.lineTo((cx + 0.016) * s, (noseBaseY - 0.018) * s)
    ctx.stroke()
    ctx.strokeStyle = 'rgb(245,245,245)'
    ctx.lineWidth = 0.009 * s
    ctx.beginPath()
    ctx.moveTo((cx - 0.030) * s, noseBaseY * s)
    ctx.quadraticCurveTo(cx * s, (noseBaseY + 0.014) * s, (cx + 0.030) * s, noseBaseY * s)
    ctx.stroke()

    // Lips: cupid's bow + lower lip
    ctx.strokeStyle = 'rgb(255,255,255)'
    ctx.lineWidth = 0.010 * s
    ctx.beginPath()
    ctx.moveTo((cx - 0.043) * s, mouthY * s)
    ctx.quadraticCurveTo((cx - 0.020) * s, (mouthY - 0.011) * s, cx * s, (mouthY - 0.004) * s)
    ctx.quadraticCurveTo((cx + 0.020) * s, (mouthY - 0.011) * s, (cx + 0.043) * s, mouthY * s)
    ctx.stroke()
    ctx.strokeStyle = 'rgb(205,205,205)'
    ctx.lineWidth = 0.008 * s
    ctx.beginPath()
    ctx.moveTo((cx - 0.038) * s, (mouthY + 0.003) * s)
    ctx.quadraticCurveTo(cx * s, (mouthY + 0.022) * s, (cx + 0.038) * s, (mouthY + 0.003) * s)
    ctx.stroke()
}

// Flowing hair strands - these give the escaping-energy look around the head.
const drawHairStrands = (ctx, s) => {
    const { cx, hairTop, hairHalfW, hairFallY, templeY } = A
    ctx.strokeStyle = 'rgb(225,225,225)'
    ctx.lineCap = 'round'
    for (let i = 0; i < 26; i++) {
        const f = i / 25
        const side = i % 2 === 0 ? -1 : 1
        const spread = 0.25 + f * 0.75
        ctx.lineWidth = (0.0035 + Math.random() * 0.003) * s
        ctx.beginPath()
        ctx.moveTo((cx + side * 0.02 * spread) * s, (hairTop + 0.01) * s)
        ctx.bezierCurveTo(
            (cx + side * hairHalfW * spread * 1.05) * s, (templeY - 0.06) * s,
            (cx + side * hairHalfW * spread * 1.12) * s, (templeY + 0.12) * s,
            (cx + side * hairHalfW * spread * 0.86) * s, (hairFallY - 0.02 + f * 0.06) * s
        )
        ctx.stroke()
    }
}

// Rasterizes the portrait into a weight map, then rejection-samples particles
// proportional to brightness so features/contours dominate the point cloud.
const buildPointCloud = (count) => {
    const c = document.createElement('canvas')
    c.width = RES
    c.height = RES
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, RES, RES)

    // 1. Hair layer first, complete with its flowing strands.
    ctx.fillStyle = 'rgb(26,26,26)'
    traceHair(ctx, RES); ctx.fill()
    ctx.strokeStyle = 'rgb(165,165,165)'
    ctx.lineWidth = RES * 0.006
    traceHair(ctx, RES); ctx.stroke()
    drawHairStrands(ctx, RES)

    // 2. Punch the face back out of the hair layer. Without this the strands
    //    streak straight across the face and the hair mass reads as a hood.
    ctx.globalCompositeOperation = 'destination-out'
    traceHead(ctx, RES); ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    // 3. Body and head fills - dim, so the interior stays a sparse haze and
    //    the particles concentrate on contours and features.
    ctx.fillStyle = 'rgb(24,24,24)'
    traceTorso(ctx, RES); ctx.fill()
    ctx.fillStyle = 'rgb(32,32,32)'
    traceHead(ctx, RES); ctx.fill()

    // 4. Contours.
    ctx.strokeStyle = 'rgb(225,225,225)'
    ctx.lineWidth = RES * 0.0075
    traceHead(ctx, RES); ctx.stroke()
    ctx.strokeStyle = 'rgb(175,175,175)'
    ctx.lineWidth = RES * 0.0065
    traceTorso(ctx, RES); ctx.stroke()

    // 5. Facial features last so nothing overdraws them.
    drawFeatures(ctx, RES)

    // 6. Fade the bottom of the torso out into darkness so the figure
    //    dissolves rather than ending on a hard rectangular cut.
    const fade = ctx.createLinearGradient(0, A.shoulderY * RES, 0, (A.bodyBottom + 0.015) * RES)
    fade.addColorStop(0, 'rgba(0,0,0,0)')
    fade.addColorStop(0.55, 'rgba(0,0,0,0.55)')
    fade.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = fade
    ctx.fillRect(0, A.shoulderY * RES, RES, RES - A.shoulderY * RES)
    ctx.globalCompositeOperation = 'source-over'

    const data = ctx.getImageData(0, 0, RES, RES).data

    const pts = []
    let guard = 0
    const maxGuard = count * 400
    while (pts.length < count && guard < maxGuard) {
        guard++
        const px = (Math.random() * RES) | 0
        const py = (Math.random() * RES) | 0
        const idx = (py * RES + px) * 4
        const w = data[idx] / 255
        if (w <= 0.02) continue
        // Boost acceptance in the head region so the face is far denser
        // than the torso, per the reference.
        const inHead = py / RES < A.hairFallY + 0.03
        const accept = inHead ? Math.min(1, w * 1.55) : w * 0.72
        if (Math.random() > accept) continue

        const nx = (px / RES - 0.5) * 2
        const ny = (py / RES - 0.5) * 2

        // Depth: spherical bulge across the head, flatter across the torso,
        // so the face sits nearer the camera.
        const hx = (px / RES - A.cx) / A.headHalfW
        const hy = (py / RES - (A.headTop + A.chin) / 2) / ((A.chin - A.headTop) / 2)
        const r2 = hx * hx + hy * hy
        const z = r2 < 1 ? Math.sqrt(1 - r2) * 0.55 : Math.max(0, 0.18 - (py / RES - A.neckTop) * 0.25)

        // Formation order: head/hair resolves first, then the face, then
        // neck, then shoulders.
        const yf = py / RES
        let formOrder
        if (yf < A.templeY) formOrder = 0.00
        else if (yf < A.chin) formOrder = 0.22
        else if (yf < A.neckBottom) formOrder = 0.52
        else formOrder = 0.70

        pts.push({ nx, ny, z, formOrder, w })
    }
    return pts
}

function AIInterviewerFigure({ state = 'idle', formProgress = 1, audioLevel = 0, className = '' }) {
    const canvasRef = useRef(null)
    const particlesRef = useRef(null)
    const rafRef = useRef(null)
    const stateRef = useRef(state)
    const formRef = useRef(formProgress)
    const audioRef = useRef(audioLevel)

    stateRef.current = state
    formRef.current = formProgress
    audioRef.current = audioLevel

    useEffect(() => {
        const count = window.innerWidth < 640 ? COUNT_MOBILE : COUNT_DESKTOP
        const cloud = buildPointCloud(count)
        // When mounted already-formed (the interview screen, which never plays
        // the intro), particles start ON their targets - otherwise the figure
        // would visibly swoop up from off-frame every time it mounts.
        const preformed = formRef.current >= 1
        particlesRef.current = cloud.map((p) => {
            const ang = Math.random() * Math.PI * 2
            const rad = 0.15 + Math.random() * 0.5
            return {
                tx: p.nx, ty: p.ny, tz: p.z,
                x: preformed ? p.nx : Math.cos(ang) * rad * 0.5,
                y: preformed ? p.ny : ORIGIN_Y + Math.sin(ang) * rad * 0.35,
                vx: 0, vy: 0,
                formOrder: p.formOrder,
                weight: p.w,
                size: 0.5 + Math.random() * 1.15 + p.w * 0.7,
                phase: Math.random() * Math.PI * 2,
                nSpeed: 0.5 + Math.random() * 0.9,
                // A minority of particles periodically drift off the figure
                // and return, which keeps the form feeling alive.
                wander: Math.random() < 0.09 ? 0.5 + Math.random() * 0.7 : 0,
                warm: Math.max(0, 1 - Math.hypot(p.nx, p.ny - (-0.34)) / 0.5),
            }
        })
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let W = 0, H = 0
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        const resize = () => {
            const parent = canvas.parentElement
            if (!parent) return
            W = parent.clientWidth
            H = parent.clientHeight
            canvas.width = W * dpr
            canvas.height = H * dpr
            canvas.style.width = `${W}px`
            canvas.style.height = `${H}px`
        }
        resize()
        const ro = new ResizeObserver(resize)
        if (canvas.parentElement) ro.observe(canvas.parentElement)

        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const t0 = performance.now()
        let last = t0

        const frame = (now) => {
            const t = (now - t0) / 1000
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now

            const parts = particlesRef.current || []
            const s = stateRef.current
            const fp = Math.max(0, Math.min(1, formRef.current))
            const lvl = Math.max(0, Math.min(1, audioRef.current))

            // Figure occupies ~62% of viewport height and never touches the
            // bottom edge; head is the visual focus.
            const scale = Math.min(H * 0.40, W * 0.46)
            const cx = W / 2
            const cy = H * 0.50

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            if (fp < 1) {
                // Soft trails while streaming into place.
                ctx.fillStyle = 'rgba(10,5,7,0.26)'
                ctx.fillRect(0, 0, W, H)
            } else {
                ctx.clearRect(0, 0, W, H)
            }

            // Ambient glow, centered on the face rather than the whole body.
            const faceY = cy - scale * 0.34
            const glow = s === 'speaking' ? 0.42 + 0.18 * Math.sin(t * 5.5)
                : s === 'listening' ? 0.26 + lvl * 0.3
                    : s === 'thinking' ? 0.30 + 0.10 * Math.sin(t * 3)
                        : 0.22
            const g = ctx.createRadialGradient(cx, faceY, 0, cx, faceY, scale * 1.05)
            g.addColorStop(0, `rgba(255,236,214,${0.10 + glow * 0.10})`)
            g.addColorStop(0.45, `rgba(150,60,55,${0.05 + glow * 0.05})`)
            g.addColorStop(1, 'rgba(10,5,7,0)')
            ctx.fillStyle = g
            ctx.fillRect(0, 0, W, H)

            if (fp < 1) {
                const oy = cy + ORIGIN_Y * scale
                const fade = 1 - fp
                const r = scale * (0.10 + 0.035 * Math.sin(t * 4))
                const og = ctx.createRadialGradient(cx, oy, 0, cx, oy, r * 3.2)
                og.addColorStop(0, `rgba(255,255,255,${0.85 * fade})`)
                og.addColorStop(0.35, `rgba(160,205,255,${0.42 * fade})`)
                og.addColorStop(1, 'rgba(160,205,255,0)')
                ctx.fillStyle = og
                ctx.beginPath()
                ctx.arc(cx, oy, r * 3.2, 0, Math.PI * 2)
                ctx.fill()
            }

            ctx.globalCompositeOperation = 'lighter'

            for (let i = 0; i < parts.length; i++) {
                const p = parts[i]

                // Staggered per-particle formation: head first, shoulders last.
                const local = Math.max(0, Math.min(1, (fp - p.formOrder * 0.55) / (1 - p.formOrder * 0.55)))
                const e = 1 - Math.pow(1 - local, 3)

                // Turbulence - cheap curl-ish field.
                const nx = Math.sin(t * 0.55 * p.nSpeed + p.phase) * Math.cos(t * 0.33 + p.ty * 2.2)
                const ny = Math.cos(t * 0.48 * p.nSpeed + p.phase * 1.4) * Math.sin(t * 0.29 + p.tx * 2.4)

                let amp = 0.006
                if (s === 'thinking') amp = 0.030
                else if (s === 'speaking') amp = 0.011
                else if (s === 'listening') amp = 0.008 + lvl * 0.012

                // Excursion particles drift out and come back on a slow cycle.
                if (p.wander) {
                    amp += p.wander * 0.05 * (0.5 + 0.5 * Math.sin(t * 0.5 + p.phase))
                }

                let gx = p.tx + nx * amp
                let gy = p.ty + ny * amp

                if (s === 'listening') {
                    // Drawn gently toward the face while attending.
                    const pull = lvl * 0.06
                    gx += (0 - p.tx) * pull
                    gy += (-0.34 - p.ty) * pull
                }
                if (s === 'speaking') {
                    // Mouth region gets the extra activity, not the whole body.
                    const dMouth = Math.hypot(p.tx, p.ty - (-0.10))
                    if (dMouth < 0.30) {
                        const k = (1 - dMouth / 0.30) * 0.02
                        gy += Math.sin(t * 11 + p.phase) * k
                    }
                }

                // Blend from the streaming-in origin toward the target.
                const targetX = gx * e
                const targetY = ORIGIN_Y + (gy - ORIGIN_Y) * e

                // Spring toward target - gives smooth, weighty motion.
                const k = 9.5, damp = 0.86
                p.vx = (p.vx + (targetX - p.x) * k * dt) * damp
                p.vy = (p.vy + (targetY - p.y) * k * dt) * damp
                p.x += p.vx * dt * 60 * 0.016
                p.y += p.vy * dt * 60 * 0.016

                // Depth parallax - nearer particles read slightly larger/brighter.
                const depth = 1 + p.tz * 0.55
                const px = cx + p.x * scale * (1 + p.tz * 0.03)
                const py = cy + p.y * scale * (1 + p.tz * 0.03)

                let a = (0.42 + p.weight * 0.85) * (0.25 + 0.75 * local) * depth * 0.95
                let size = p.size * depth

                if (s === 'speaking') {
                    const dMouth = Math.hypot(p.tx, p.ty - (-0.10))
                    if (dMouth < 0.35) a *= 1 + (1 - dMouth / 0.35) * (0.35 + 0.3 * Math.sin(t * 9 + p.phase))
                } else if (s === 'listening') {
                    a *= 0.9 + lvl * 0.45
                } else if (s === 'thinking') {
                    a *= 0.65 + 0.4 * Math.sin(t * 4 + p.phase)
                }

                // Warm white at the face fading to cool white//faint cyan outward,
                // with brand red only as a whisper in the outer falloff.
                const warm = p.warm
                const r = 255
                const gg = Math.round(238 + warm * 14 - (1 - warm) * 6)
                const b = Math.round(214 + (1 - warm) * 38 - warm * 44)
                ctx.fillStyle = `rgba(${r},${gg},${b},${Math.min(0.95, a)})`
                ctx.beginPath()
                ctx.arc(px, py, Math.max(0.45, size * 0.78), 0, Math.PI * 2)
                ctx.fill()
            }

            ctx.globalCompositeOperation = 'source-over'

            // Listening aura around the head.
            if (s === 'listening' && fp >= 1) {
                ctx.strokeStyle = `rgba(190,120,120,${0.14 + lvl * 0.26})`
                ctx.lineWidth = 1 + lvl * 2
                ctx.beginPath()
                ctx.arc(cx, faceY, scale * (0.30 + lvl * 0.10), 0, Math.PI * 2)
                ctx.stroke()
            }

            rafRef.current = requestAnimationFrame(frame)
        }

        if (reduce) {
            formRef.current = 1
            frame(performance.now())
        } else {
            rafRef.current = requestAnimationFrame(frame)
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
