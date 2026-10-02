import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useFocusTrap } from './useFocusTrap'

/**
 * Side panel sliding in from the right - used for filter panels and other
 * focused, non-blocking-of-context editing (integration.md section 44).
 * Distinct from Modal: Modal centers and dims for a focused single task,
 * Drawer keeps the panel anchored to an edge for browsing/filtering while
 * peeking at the page behind it.
 */
function Drawer({ open, onClose, title, children, footer, widthClassName = 'max-w-sm' }) {
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[var(--z-drawer)] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
            className={`relative w-full ${widthClassName} h-full bg-card border-l border-line shadow-[var(--shadow-lift)] flex flex-col`}
          >
            {(title || onClose) && (
              <div className="flex items-center justify-between border-b border-line px-6 py-5 shrink-0">
                <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
                {onClose && (
                  <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors">
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

            {footer && (
              <div className="border-t border-line bg-card px-6 py-5 flex justify-end gap-3 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default Drawer
