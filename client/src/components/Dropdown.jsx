import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, Check } from "lucide-react"

// Custom-styled replacement for a native <select> - native option popups can't
// be themed (they render with OS-level light/dark styling regardless of the
// page's theme), which looked broken against this app's light/dark surfaces.
function Dropdown({ icon: Icon, value, onChange, options, placeholder = "Select..." }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)

    useEffect(() => {
        if (!open) return
        const handleClickOutside = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open])

    const selected = options.find((o) => o.value === value)

    return (
        <div ref={rootRef} className='relative'>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className='w-full flex items-center gap-3 pl-4 pr-4 py-3 text-[14.5px] text-ink border border-line rounded-xl bg-card hover:border-black/20 dark:hover:border-white/20 outline-none transition-colors'>
                {Icon && <Icon size={16} className='text-text-secondary shrink-0' />}
                <span className={`flex-1 text-left truncate ${!selected ? "text-text-secondary" : ""}`}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown size={15} className={`text-text-secondary shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className='absolute z-30 mt-2 w-full max-h-64 overflow-y-auto bg-card border border-line rounded-xl shadow-[var(--shadow-lift)] p-1.5'>
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setOpen(false) }}
                                className={`w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg text-[13.5px] transition-colors ${
                                    opt.value === value
                                        ? "bg-accent/10 text-accent font-medium"
                                        : "text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                                }`}>
                                <span className='flex-1'>{opt.label}</span>
                                {opt.value === value && <Check size={14} />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default Dropdown
