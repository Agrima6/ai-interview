import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react'

const BOX = 260           // size of the preview square on screen
const OUT = 512           // size of the saved logo
const MAX_ZOOM = 4

/**
 * Lets the person position and zoom a logo inside a circle - exactly how it appears on their dashboard and in emails -
 * and hands back a square PNG. `file` is the picked image; `onDone(File)` receives the result, `onCancel()` closes.
 */
export default function LogoCropModal({ file, onDone, onCancel, title = 'Adjust your logo' }) {
    const url = useMemo(() => URL.createObjectURL(file), [file])
    const [size, setSize] = useState(null)               // natural size of the picked image
    const [zoom, setZoom] = useState(1)
    const [pos, setPos] = useState({ x: 0, y: 0 })       // image centre, relative to the centre of the circle
    const [busy, setBusy] = useState(false)
    const [failed, setFailed] = useState(false)
    const imgRef = useRef(null)
    const drag = useRef(null)

    useEffect(() => () => URL.revokeObjectURL(url), [url])
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [busy, onCancel])

    // Zoom 1 shows the whole picture inside the circle; more zoom crops in.
    const fit = size ? BOX / Math.max(size.w, size.h) : 1
    const scale = fit * zoom
    const clamp = (p, z = zoom) => {
        if (!size) return p
        const half = (Math.max(size.w, size.h) * fit * z) / 2
        const limit = Math.max(0, half - 24)
        return { x: Math.min(limit, Math.max(-limit, p.x)), y: Math.min(limit, Math.max(-limit, p.y)) }
    }
    const changeZoom = (z) => { setZoom(z); setPos((p) => clamp(p, z)) }

    const onPointerDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y } }
    const onPointerMove = (e) => { if (drag.current) setPos(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })) }
    const onPointerUp = () => { drag.current = null }
    const onKeyDown = (e) => {
        const step = 8
        const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
        if (move) { e.preventDefault(); setPos((p) => clamp({ x: p.x + move[0], y: p.y + move[1] })) }
    }

    const save = () => {
        if (!size || busy) return
        setBusy(true)
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = OUT
        const ctx = canvas.getContext('2d')
        const k = OUT / BOX
        const w = size.w * scale * k, h = size.h * scale * k
        ctx.drawImage(imgRef.current, OUT / 2 + pos.x * k - w / 2, OUT / 2 + pos.y * k - h / 2, w, h)
        canvas.toBlob((blob) => {
            if (!blob) { setBusy(false); setFailed(true); return }
            onDone(new File([blob], `${(file.name || 'logo').replace(/\.[^.]+$/, '')}.png`, { type: 'image/png' }))
        }, 'image/png')
    }

    return (
        <div className='fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[#1a1215]/55' role='dialog' aria-modal='true' aria-label={title}>
            <div className='w-full max-w-[400px] rounded-2xl bg-card border border-line shadow-[var(--shadow-lift)] p-5 sm:p-6'>
                <h2 className='text-[17px] font-bold text-ink'>{title}</h2>
                <p className='text-[13px] text-text-secondary mt-1'>Drag to move, and use the slider to zoom. The circle is how your logo will look on your dashboard.</p>
                <div className='mt-4 flex justify-center'>
                    <div
                        tabIndex={0} role='application' aria-label='Logo position. Drag, or use the arrow keys, to move it.'
                        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}
                        className='relative touch-none select-none cursor-grab active:cursor-grabbing overflow-hidden rounded-full border border-line bg-white'
                        style={{ width: BOX, height: BOX }}>
                        <img
                            ref={imgRef} src={url} alt='' draggable={false}
                            onLoad={(e) => { const w = e.currentTarget.naturalWidth || OUT, h = e.currentTarget.naturalHeight || OUT; setSize({ w, h }) }}
                            onError={() => setFailed(true)}
                            className='absolute max-w-none pointer-events-none'
                            style={size ? { width: size.w * scale, height: size.h * scale, left: BOX / 2 + pos.x - (size.w * scale) / 2, top: BOX / 2 + pos.y - (size.h * scale) / 2 } : { opacity: 0 }}
                        />
                    </div>
                </div>
                <div className='mt-4 flex items-center gap-3 text-text-secondary'>
                    <ZoomOut size={16} aria-hidden='true' />
                    <input type='range' min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} aria-label='Zoom' className='flex-1 accent-[var(--color-accent)]' />
                    <ZoomIn size={16} aria-hidden='true' />
                </div>
                <p className='text-[12px] text-text-secondary mt-3'>Tip: a square image of at least 256 × 256 pixels looks sharpest.</p>
                {failed && <p role='alert' className='text-[12.5px] text-[var(--color-danger)] mt-2'>This image could not be read. Please choose a PNG or JPG file.</p>}
                <div className='mt-5 flex justify-end gap-2'>
                    <button onClick={onCancel} disabled={busy} className='px-4 py-2.5 rounded-xl border border-line text-[13.5px] font-semibold text-ink hover:bg-black/[0.04] disabled:opacity-60'>Cancel</button>
                    <button onClick={save} disabled={!size || busy || failed} className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-[13.5px] font-semibold disabled:opacity-60'>
                        {busy && <Loader2 size={14} className='animate-spin' />} Use this logo
                    </button>
                </div>
            </div>
        </div>
    )
}
