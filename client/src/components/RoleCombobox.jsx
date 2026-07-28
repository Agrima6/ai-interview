import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import { User, Check } from "lucide-react"

// A role picker that supports both: pick a common preset from the list, or
// just type your own exact title directly - manual entry always works, the
// presets are shortcuts, not a restriction.
function RoleCombobox({ value, onChange, options, placeholder = "Type or select a role" }) {
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

    const filtered = value.trim()
        ? options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()))
        : options

    return (
        <div ref={rootRef} className='relative'>
            <div className='relative'>
                <User size={16} className='absolute top-1/2 -translate-y-1/2 left-4 text-text-secondary pointer-events-none' />
                <input
                    type='text'
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setOpen(true)}
                    className='w-full pl-11 pr-4 py-3 text-[14.5px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors'
                />
            </div>

            <AnimatePresence>
                {open && filtered.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className='absolute z-30 mt-2 w-full max-h-64 overflow-y-auto bg-card border border-line rounded-xl shadow-[var(--shadow-lift)] p-1.5'>
                        {filtered.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => { onChange(opt); setOpen(false) }}
                                className={`w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg text-[13.5px] transition-colors ${
                                    opt === value
                                        ? "bg-accent/10 text-accent font-medium"
                                        : "text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                                }`}>
                                <span className='flex-1'>{opt}</span>
                                {opt === value && <Check size={14} />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default RoleCombobox
