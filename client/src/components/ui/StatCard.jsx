import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { CountUp } from './motionKit'

const TINTS = {
  brand: 'bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] text-accent',
  cyan: 'bg-[color-mix(in_srgb,var(--color-accent-cyan)_14%,white)] text-[var(--color-accent-cyan)]',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  neutral: 'bg-[var(--color-surface-muted)] text-ink',
}

/**
 * Icon tile + big number + label. trend: optional { value: "+12%", positive: true }.
 * Lifts on hover; becomes a button when `onClick` is passed.
 */
function StatCard({ icon: Icon, value, label, trend, helperText, accent = 'brand', onClick, className = '' }) {
  const interactive = Boolean(onClick)
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e) : undefined}
      className={`ui-lift rounded-[20px] border border-line bg-card p-5 flex flex-col gap-4 ${interactive ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className='flex items-start justify-between'>
        {Icon && (
          <span className={`w-11 h-11 rounded-[14px] flex items-center justify-center ${TINTS[accent] || TINTS.brand}`}>
            <Icon size={20} strokeWidth={1.8} />
          </span>
        )}
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold px-2 py-1 rounded-full ${
            trend.positive === true ? 'text-[var(--color-success)] bg-[var(--color-success-soft)]'
              : trend.positive === false ? 'text-[var(--color-danger)] bg-[var(--color-danger-soft)]'
              : 'text-text-secondary bg-[var(--color-surface-muted)]'
          }`}>
            {trend.positive === true && <ArrowUpRight size={13} />}
            {trend.positive === false && <ArrowDownRight size={13} />}
            {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className='text-[26px] font-bold text-ink tracking-[-0.02em] leading-none tabular-nums'><CountUp value={value} /></p>
        <p className='text-[13px] font-semibold text-text-secondary mt-1.5'>{label}</p>
        {helperText && <p className='text-[11.5px] text-text-secondary/70 mt-1'>{helperText}</p>}
      </div>
    </div>
  )
}

export default StatCard
