import React from 'react'

// Status-pill badge used for things like pending / sent / completed / failed.
const VARIANTS = {
  neutral: 'bg-[var(--color-neutral-soft)] text-[var(--color-neutral)]',
  brand: 'bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] text-[var(--color-accent-dark)]',
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

function Badge({ variant, status, dot = false, pulse = false, className = '', children }) {
  const resolved = variant || STATUS_VARIANT[status] || 'neutral'
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-bold px-2.5 py-[5px] rounded-full capitalize ${VARIANTS[resolved]} ${className}`}>
      {(dot || pulse) && (
        <span className='relative w-[7px] h-[7px] shrink-0'>
          {pulse && <span aria-hidden='true' className='ui-ping absolute inset-0 rounded-full bg-current' />}
          <span className='absolute inset-0 rounded-full bg-current' />
        </span>
      )}
      {children ?? status?.replace(/_/g, ' ')}
    </span>
  )
}

export default Badge
