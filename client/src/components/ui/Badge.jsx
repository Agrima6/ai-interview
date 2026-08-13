import React from 'react'

// Status-pill badge used for things like pending / sent / completed / failed.
const VARIANTS = {
  neutral: 'bg-black/[0.05] dark:bg-white/[0.08] text-text-secondary',
  brand: 'bg-accent/10 text-accent',
  success: 'bg-[color-mix(in_srgb,var(--color-accent-cyan)_15%,transparent)] text-[var(--color-accent-cyan)]',
  warning: 'bg-amber-500/10 text-amber-500',
  danger: 'bg-red-500/10 text-red-500',
}

// Convenience map so callers can pass a raw status string directly.
const STATUS_VARIANT = {
  pending: 'warning',
  sent: 'brand',
  in_progress: 'brand',
  completed: 'success',
  passed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  draft: 'neutral',
}

function Badge({ variant, status, dot = false, className = '', children }) {
  const resolved = variant || STATUS_VARIANT[status] || 'neutral'
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full capitalize ${VARIANTS[resolved]} ${className}`}>
      {dot && <span className='w-1.5 h-1.5 rounded-full bg-current' />}
      {children ?? status?.replace(/_/g, ' ')}
    </span>
  )
}

export default Badge
