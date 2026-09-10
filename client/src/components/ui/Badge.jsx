import React from 'react'

// Status-pill badge used for things like pending / sent / completed / failed.
const VARIANTS = {
  neutral: 'bg-[var(--color-neutral-soft)] text-[var(--color-neutral)]',
  brand: 'bg-accent/10 text-accent',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  info: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
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
