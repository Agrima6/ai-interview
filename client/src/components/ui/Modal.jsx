import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useFocusTrap } from './useFocusTrap'

/**
 * Dialog/modal. Controlled via `open`. Renders through a portal so it
 * escapes any parent overflow/stacking context (dashboards, tables, etc).
 */
function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null)
  useFocusTrap(panelRef, open)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const isFull = size === 'full'
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'w-screen h-screen' }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-[var(--z-modal)] flex items-center justify-center ${isFull ? 'p-0' : 'px-4'}`}>
          {!isFull && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className='absolute inset-0 bg-[#1a1215]/50 backdrop-blur-sm'
            />
          )}
          <motion.div
            ref={panelRef}
            role='dialog'
            aria-modal='true'
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: isFull ? 0 : 16, scale: isFull ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isFull ? 0 : 12, scale: isFull ? 1 : 0.98 }}
            transition={{ duration: 0.2 }}
            className={`relative ${
              isFull
                ? 'w-full h-full min-h-screen bg-card flex flex-col overflow-hidden'
                : `w-full ${widths[size]} bg-card border border-line rounded-[24px] shadow-[0_40px_80px_-30px_rgba(13,18,51,0.55)] max-h-[calc(100dvh-2rem)] overflow-y-auto`
            }`}
          >
            {(title || onClose) && (
              <div className={`flex items-center justify-between border-b border-line sticky top-0 bg-card z-10 ${isFull ? 'px-4 py-4 sm:px-8 sm:py-5 shadow-sm' : 'px-4 py-4 sm:px-6 sm:py-5 rounded-t-[24px]'}`}>
                <div className={isFull ? 'max-w-6xl w-full mx-auto flex items-center justify-between' : 'flex items-center justify-between w-full'}>
                  <h3 className={`text-ink ${isFull ? 'text-[18px] font-bold' : 'text-[16px] font-bold'}`}>{title}</h3>
                  {onClose && (
                    <button onClick={onClose} aria-label='Close' className='w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:bg-accent/[0.08] hover:text-accent transition-colors'>
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className={isFull ? 'flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-8 max-w-6xl w-full mx-auto' : 'px-4 py-5 sm:px-6 sm:py-6'}>
              {children}
            </div>

            {footer && (
              <div className={`border-t border-line bg-card ${isFull ? 'px-4 py-4 sm:px-8 sticky bottom-0 z-10' : 'px-4 py-4 sm:px-6 sm:py-5 flex justify-end gap-3'}`}>
                <div className={isFull ? 'max-w-6xl w-full mx-auto flex items-center justify-between' : 'w-full flex justify-end gap-3'}>
                  {footer}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default Modal
