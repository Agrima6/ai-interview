import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const VARIANT = {
    success: { icon: CheckCircle2, iconClass: 'text-success' },
    error: { icon: XCircle, iconClass: 'text-danger' },
    warning: { icon: AlertTriangle, iconClass: 'text-[#b45309]' },
    info: { icon: Info, iconClass: 'text-accent' },
}

const DEFAULT_DURATION_MS = 4000

/**
 * App-wide toast/snackbar system. Wrap the app once in main.jsx with
 * <ToastProvider>; call useToast() anywhere to fire one.
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const show = useCallback((variant, message, { duration = DEFAULT_DURATION_MS } = {}) => {
        const id = crypto.randomUUID()
        setToasts((prev) => [...prev, { id, variant, message }])
        if (duration > 0) {
            setTimeout(() => dismiss(id), duration)
        }
        return id
    }, [dismiss])

    const api = useMemo(() => ({
        success: (message, opts) => show('success', message, opts),
        error: (message, opts) => show('error', message, opts),
        warning: (message, opts) => show('warning', message, opts),
        info: (message, opts) => show('info', message, opts),
        dismiss,
    }), [show, dismiss])

    return (
        <ToastContext.Provider value={api}>
            {children}
            {createPortal(
                <div className='fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none'>
                    <AnimatePresence>
                        {toasts.map((t) => {
                            const { icon: Icon, iconClass } = VARIANT[t.variant] || VARIANT.info
                            return (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 24 }}
                                    transition={{ duration: 0.18 }}
                                    className='pointer-events-auto flex items-start gap-2.5 bg-card border border-line rounded-xl shadow-[var(--shadow-lift)] px-4 py-3.5'
                                >
                                    <Icon size={18} className={`shrink-0 mt-0.5 ${iconClass}`} />
                                    <p className='text-[13.5px] text-ink leading-relaxed flex-1'>{t.message}</p>
                                    <button
                                        onClick={() => dismiss(t.id)}
                                        aria-label='Dismiss'
                                        className='shrink-0 text-text-secondary hover:text-ink transition-colors'
                                    >
                                        <X size={15} />
                                    </button>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

export const useToast = () => {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}
