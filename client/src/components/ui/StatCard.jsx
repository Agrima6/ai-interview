import React from 'react'
import { motion } from 'motion/react'
import Card from './Card'

/**
 * Icon + big number + label, used across admin/candidate dashboards.
 * trend: optional { value: "+12%", positive: true }
 */
function StatCard({ icon: Icon, value, label, trend, helperText, accent = 'brand', onClick, className = '' }) {
  const accents = {
    brand: 'bg-accent/10 text-accent',
    cyan: 'bg-[color-mix(in_srgb,var(--color-accent-cyan)_15%,transparent)] text-[var(--color-accent-cyan)]',
    neutral: 'bg-black/[0.05] dark:bg-white/[0.08] text-ink',
  }

  return (
    <Card
      hover
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e) : undefined}
      className={`p-6 ${onClick ? 'cursor-pointer transition-shadow hover:shadow-[var(--shadow-lift)] hover:ring-1 hover:ring-accent/20' : ''} ${className}`}
    >
      <div className='flex items-start justify-between mb-4'>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accents[accent]}`}>
            <Icon size={18} strokeWidth={1.75} />
          </div>
        )}
        {trend && (
          <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
            trend.positive === true ? 'text-[var(--color-accent-cyan)] bg-[color-mix(in_srgb,var(--color-accent-cyan)_12%,transparent)]'
              : trend.positive === false ? 'text-red-500 bg-red-500/10'
              : 'text-text-secondary bg-black/[0.04] dark:bg-white/[0.06]'
          }`}>
            {trend.value}
          </span>
        )}
      </div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className='text-[28px] font-bold text-ink tracking-tight leading-none mb-1.5'
      >
        {value}
      </motion.p>
      <p className='text-[13px] text-text-secondary'>{label}</p>
      {helperText && <p className='text-[11.5px] text-text-secondary/70 mt-1'>{helperText}</p>}
    </Card>
  )
}

export default StatCard
