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

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center px-4'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/50 backdrop-blur-sm'
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full ${widths[size]} bg-card border border-line rounded-2xl shadow-[var(--shadow-lift)] max-h-[85vh] overflow-y-auto`}
          >
            {(title || onClose) && (
              <div className='flex items-center justify-between px-6 py-5 border-b border-line sticky top-0 bg-card rounded-t-2xl'>
                <h3 className='text-[16px] font-semibold text-ink'>{title}</h3>
                {onClose && (
                  <button onClick={onClose} aria-label='Close' className='w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors'>
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            <div className='px-6 py-6'>{children}</div>
            {footer && <div className='px-6 py-5 border-t border-line flex justify-end gap-3'>{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default Modal
