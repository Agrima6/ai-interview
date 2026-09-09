import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'

/**
 * Dialog/modal. Controlled via `open`. Renders through a portal so it
 * escapes any parent overflow/stacking context (dashboards, tables, etc).
 */
function Modal({ open, onClose, title, subtitle, status, headerAction, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
    }
  }, [open, onClose])

  const isFull = size === 'full'
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'w-screen h-screen' }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-100 flex items-center justify-center ${isFull ? 'right-0 bg-transparent p-0 lg:left-60' : 'px-4'}`}>
          {!isFull && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className='absolute inset-0 bg-black/50 backdrop-blur-sm'
            />
          )}
          <motion.div
            initial={{ opacity: 0, y: isFull ? 0 : 16, scale: isFull ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isFull ? 0 : 12, scale: isFull ? 1 : 0.98 }}
            transition={{ duration: 0.2 }}
            className={`relative ${
              isFull
                ? 'w-full h-full min-h-screen bg-bg flex flex-col overflow-hidden z-101'
                : `w-full ${widths[size]} bg-card border border-line rounded-2xl shadow-(--shadow-lift) max-h-[85vh] overflow-y-auto`
            }`}
          >
            {(title || onClose) && (
              <div className={`flex items-center justify-between border-b border-line sticky top-0 bg-card z-10 ${isFull ? 'px-6 py-3.5 shadow-sm' : 'px-6 py-5 rounded-t-2xl'}`}>
                <div className={isFull ? 'max-w-6xl w-full mx-auto flex items-center justify-between' : 'flex items-center justify-between w-full'}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className={`font-semibold text-ink ${isFull ? 'text-[18px] font-bold' : 'text-[16px]'}`}>{title}</h3>
                      {status && <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">{status}</span>}
                    </div>
                    {subtitle && <p className="mt-0.5 text-[11px] text-text-secondary">{subtitle}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {headerAction}
                    {onClose && (
                      <button onClick={onClose} aria-label='Close' className='w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-black/5 dark:hover:bg-white/8 transition-colors'>
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={isFull ? 'min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7 sm:py-5' : 'px-6 py-6'}>
              {children}
            </div>

            {footer && (
              <div className={`border-t border-line bg-card ${isFull ? 'px-6 py-3 sticky bottom-0 z-10' : 'px-6 py-5 flex justify-end gap-3'}`}>
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
