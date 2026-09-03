import React from 'react'

/**
 * Generic interview/candidate pipeline funnel. `stages` is a dynamic list -
 * different organizations/drives have different round lineups, so this
 * never assumes a fixed count or fixed labels:
 *   [{ key, label, count, percentage, colorVariant }]
 * Bar widths are always computed from `percentage`, never hardcoded pixels.
 */
const VARIANTS = {
    primary: 'bg-accent',
    cyan: 'bg-[var(--color-accent-cyan)]',
    neutral: 'bg-black/20 dark:bg-white/30',
}

function FunnelChart({ stages, className = '' }) {
    if (!stages?.length) return <p className='text-text-secondary text-[13.5px]'>No pipeline data yet.</p>

    return (
        <div className={`space-y-4 ${className}`}>
            {stages.map((stage) => (
                <div key={stage.key}>
                    <div className='flex items-baseline justify-between mb-1.5 gap-3'>
                        <span className='text-[13px] font-medium text-ink truncate'>{stage.label}</span>
                        <span className='text-[12.5px] text-text-secondary shrink-0'>{stage.count.toLocaleString()} · {stage.percentage}%</span>
                    </div>
                    <div className='h-2.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] overflow-hidden'>
                        <div
                            className={`h-full rounded-full transition-all ${VARIANTS[stage.colorVariant] || VARIANTS.primary}`}
                            style={{ width: `${Math.min(Math.max(stage.percentage, 0), 100)}%` }}
                            role='progressbar'
                            aria-valuenow={stage.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${stage.label}: ${stage.count} (${stage.percentage}%)`}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default FunnelChart
