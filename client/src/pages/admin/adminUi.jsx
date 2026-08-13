import React, { useState } from 'react'
import { motion } from 'motion/react'
import { X } from 'lucide-react'

// Small shared building blocks for the "Conduct Interview" admin pages
// (Question Banks / Templates / Invites / Dashboard). Deliberately local and
// minimal rather than depending on the sibling ui/ kit, which may not be
// finished yet - matches the same design tokens (bg-card/border-line/text-ink)
// already used across AdminPanel.jsx so the two areas look consistent.

export function Input({ className = '', ...props }) {
    return (
        <input
            className={`w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors ${className}`}
            {...props}
        />
    )
}

export function Textarea({ className = '', ...props }) {
    return (
        <textarea
            className={`w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors resize-none ${className}`}
            {...props}
        />
    )
}

export function Select({ className = '', children, ...props }) {
    return (
        <select
            className={`w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors ${className}`}
            {...props}
        >
            {children}
        </select>
    )
}

export function Card({ className = '', children, ...props }) {
    return (
        <div className={`bg-card border border-line rounded-2xl shadow-[var(--shadow-soft)] ${className}`} {...props}>
            {children}
        </div>
    )
}

export function Modal({ onClose, children, maxWidth = 'max-w-lg' }) {
    return (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4' onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full ${maxWidth} max-h-[85vh] overflow-y-auto bg-card border border-line rounded-2xl shadow-[var(--shadow-lift)] p-6`}>
                {children}
            </motion.div>
        </div>
    )
}

export function ModalHeader({ title, subtitle, onClose }) {
    return (
        <div className='flex items-center justify-between mb-5'>
            <div>
                <h3 className='text-[17px] font-semibold text-ink'>{title}</h3>
                {subtitle && <p className='text-[13px] text-text-secondary'>{subtitle}</p>}
            </div>
            <button onClick={onClose} className='text-text-secondary hover:text-ink'><X size={18} /></button>
        </div>
    )
}

const BADGE_COLORS = {
    pending: 'bg-black/[0.06] dark:bg-white/[0.08] text-text-secondary',
    sent: 'bg-accent/10 text-accent',
    opened: 'bg-accent-cyan/10 text-accent-cyan',
    started: 'bg-yellow-500/10 text-yellow-500',
    completed: 'bg-success/10 text-success',
    expired: 'bg-red-500/10 text-red-500',
    Easy: 'bg-success/10 text-success',
    Medium: 'bg-yellow-500/10 text-yellow-500',
    Hard: 'bg-red-500/10 text-red-500',
    active: 'bg-success/10 text-success',
    inactive: 'bg-black/[0.06] dark:bg-white/[0.08] text-text-secondary',
}

export function Badge({ children, tone }) {
    const cls = BADGE_COLORS[tone] || BADGE_COLORS[children] || 'bg-black/[0.06] dark:bg-white/[0.08] text-text-secondary'
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-medium capitalize ${cls}`}>
            {children}
        </span>
    )
}

export function PageHeader({ eyebrow = 'Admin', title, subtitle, actions, onBack }) {
    return (
        <div className='mb-8 flex items-start gap-4 flex-wrap justify-between'>
            <div className='flex items-start gap-4'>
                {onBack && (
                    <button onClick={onBack} className='mt-1.5 w-11 h-11 shrink-0 rounded-full bg-card border border-line shadow-[var(--shadow-soft)] flex items-center justify-center hover:border-black/20 dark:hover:border-white/20 transition-colors'>
                        &larr;
                    </button>
                )}
                <div>
                    <p className='text-[13px] font-semibold text-accent tracking-wide uppercase mb-2'>{eyebrow}</p>
                    <h1 className='text-[32px] font-semibold text-ink leading-tight'>{title}</h1>
                    {subtitle && <p className='text-text-secondary mt-2 text-[15px]'>{subtitle}</p>}
                </div>
            </div>
            {actions && <div className='flex items-center gap-2 flex-wrap'>{actions}</div>}
        </div>
    )
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
    return (
        <div className='bg-card border border-dashed border-line rounded-2xl p-12 flex flex-col items-center text-center gap-3'>
            {Icon && <Icon size={28} className='text-text-secondary' />}
            <p className='text-[15px] font-medium text-ink'>{title}</p>
            {subtitle && <p className='text-[13.5px] text-text-secondary max-w-sm'>{subtitle}</p>}
            {action}
        </div>
    )
}

export function Skeleton({ className = '' }) {
    return <div className={`animate-pulse bg-black/[0.06] dark:bg-white/[0.08] rounded-xl ${className}`} />
}

// Tag input for skillTags - type + Enter/comma to add, click x to remove.
export function TagInput({ tags, onChange, placeholder = 'Add a skill tag and press Enter' }) {
    const [value, setValue] = useState('')

    const addTag = () => {
        const v = value.trim()
        if (v && !tags.includes(v)) onChange([...tags, v])
        setValue('')
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag()
        } else if (e.key === 'Backspace' && !value && tags.length) {
            onChange(tags.slice(0, -1))
        }
    }

    return (
        <div className='w-full px-3 py-2 text-[14px] bg-card border border-line rounded-xl focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors flex flex-wrap gap-1.5'>
            {tags.map((tag) => (
                <span key={tag} className='inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 text-accent text-[12.5px] font-medium'>
                    {tag}
                    <button type='button' onClick={() => onChange(tags.filter((t) => t !== tag))} className='hover:text-red-500'>
                        <X size={11} />
                    </button>
                </span>
            ))}
            <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addTag}
                placeholder={tags.length ? '' : placeholder}
                className='flex-1 min-w-[120px] bg-transparent outline-none text-ink py-1'
            />
        </div>
    )
}

export function ErrorText({ children }) {
    if (!children) return null
    return <p className='text-[12.5px] text-red-500'>{children}</p>
}
