import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'

/**
 * Dialog/modal. Controlled via `open`. Renders through a portal so it
 * escapes any parent overflow/stacking context (dashboards, tables, etc).
 */
function Modal({ open, onClose, title, children, footer, size = 'md' }) {
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
        <div className={`fixed inset-0 z-[100] flex items-center justify-center ${isFull ? 'p-0' : 'px-4'}`}>
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
                ? 'w-full h-full min-h-screen bg-card flex flex-col overflow-hidden z-[101]'
                : `w-full ${widths[size]} bg-card border border-line rounded-2xl shadow-[var(--shadow-lift)] max-h-[85vh] overflow-y-auto`
            }`}
          >
            {(title || onClose) && (
              <div className={`flex items-center justify-between border-b border-line sticky top-0 bg-card z-10 ${isFull ? 'px-8 py-5 shadow-sm' : 'px-6 py-5 rounded-t-2xl'}`}>
                <div className={isFull ? 'max-w-6xl w-full mx-auto flex items-center justify-between' : 'flex items-center justify-between w-full'}>
                  <h3 className={`font-semibold text-ink ${isFull ? 'text-[18px] font-bold' : 'text-[16px]'}`}>{title}</h3>
                  {onClose && (
                    <button onClick={onClose} aria-label='Close' className='w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors'>
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className={isFull ? 'flex-1 overflow-y-auto px-8 py-8 max-w-6xl w-full mx-auto' : 'px-6 py-6'}>
              {children}
            </div>

            {footer && (
              <div className={`border-t border-line bg-card ${isFull ? 'px-8 py-4 sticky bottom-0 z-10' : 'px-6 py-5 flex justify-end gap-3'}`}>
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
