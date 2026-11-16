import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useFocusTrap } from '../ui/useFocusTrap'

/**
 * A full-screen look at one image out of a set. `images` is [{ src, caption }], `index` the one showing (null = shut).
 * Arrow keys and the side buttons move through the set; Esc, the close button or a click on the backdrop shut it.
 */
export default function Lightbox({ images, index, onIndex, onClose }) {
    const ref = useRef(null)
    const open = index !== null && index !== undefined && Boolean(images[index])
    useFocusTrap(ref, open)
    const many = images.length > 1

    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); onClose() }   // capture phase: the drawer underneath stays open
            else if (e.key === 'ArrowRight' && many) onIndex((index + 1) % images.length)
            else if (e.key === 'ArrowLeft' && many) onIndex((index - 1 + images.length) % images.length)
        }
        document.addEventListener('keydown', onKey, true)
        return () => document.removeEventListener('keydown', onKey, true)
    }, [open, many, index, images.length, onIndex, onClose])

    if (!open) return null
    const image = images[index]
    const navClass = 'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors'
    return createPortal(
        <div ref={ref} role='dialog' aria-modal='true' aria-label={image.caption || 'Image'} className='oa-rise fixed inset-0 z-[var(--z-modal)] bg-black/90 flex flex-col' onClick={onClose}>
            <div className='flex items-center justify-between gap-3 px-4 py-3 text-white'>
                <p className='text-[13px] min-w-0 truncate'>{image.caption}{many && <span className='text-white/60'> · {index + 1} of {images.length}</span>}</p>
                <button type='button' aria-label='Close' onClick={onClose} className='w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0'><X size={18} /></button>
            </div>
            <div className='relative flex-1 min-h-0 flex items-center justify-center px-4 pb-6'>
                <img src={image.src} alt={image.caption || ''} onClick={(e) => e.stopPropagation()} className='max-w-full max-h-full object-contain rounded-lg' />
                {many && <>
                    <button type='button' aria-label='Previous image' className={`${navClass} left-3`} onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length) }}><ChevronLeft size={22} /></button>
                    <button type='button' aria-label='Next image' className={`${navClass} right-3`} onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % images.length) }}><ChevronRight size={22} /></button>
                </>}
            </div>
        </div>,
        document.body,
    )
}
