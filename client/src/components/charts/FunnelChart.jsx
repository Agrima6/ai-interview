import React from 'react'

/**
 * Generic interview/candidate pipeline funnel, drawn as an actual tapering
 * funnel shape (not a list of progress bars) - `stages` is a dynamic list,
 * different organizations/drives have different round lineups, so this
 * never assumes a fixed count or fixed labels:
 *   [{ key, label, count, percentage }]
 * Band widths are always computed from each stage's count relative to the
 * first stage's, never hardcoded pixels - a stage with 0 candidates still
 * renders (clamped to a minimum sliver) rather than vanishing entirely.
 */
const STAGE_COLORS = ['var(--color-accent)', 'var(--color-info)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-neutral)']

const FUNNEL_WIDTH = 130
const MIN_WIDTH_RATIO = 0.22
const BAND_HEIGHT = 32
const BAND_GAP = 4

function FunnelChart({ stages, className = '' }) {
    if (!stages?.length) return <p className='text-text-secondary text-[13.5px]'>No pipeline data yet.</p>

    const maxCount = stages[0]?.count || 1
    const widths = stages.map((s) => Math.max(maxCount ? s.count / maxCount : 0, MIN_WIDTH_RATIO) * FUNNEL_WIDTH)
    const totalHeight = stages.length * (BAND_HEIGHT + BAND_GAP) - BAND_GAP

    return (
        <div className={`flex items-center gap-5 ${className}`}>
            <svg
                width={FUNNEL_WIDTH}
                height={totalHeight}
                viewBox={`0 0 ${FUNNEL_WIDTH} ${totalHeight}`}
                className='shrink-0'
                role='img'
                aria-label='Interview funnel chart'
            >
                {stages.map((stage, i) => {
                    const topW = widths[i]
                    const bottomW = widths[i + 1] ?? widths[i]
                    const y0 = i * (BAND_HEIGHT + BAND_GAP)
                    const y1 = y0 + BAND_HEIGHT
                    const topX0 = (FUNNEL_WIDTH - topW) / 2
                    const topX1 = topX0 + topW
                    const botX0 = (FUNNEL_WIDTH - bottomW) / 2
                    const botX1 = botX0 + bottomW
                    return (
                        <polygon
                            key={stage.key}
                            points={`${topX0},${y0} ${topX1},${y0} ${botX1},${y1} ${botX0},${y1}`}
                            fill={STAGE_COLORS[i % STAGE_COLORS.length]}
                        >
                            <title>{`${stage.label}: ${stage.count.toLocaleString()} (${stage.percentage}%)`}</title>
                        </polygon>
                    )
                })}
            </svg>

            <div className='flex-1 space-y-3.5 min-w-0'>
                {stages.map((stage, i) => (
                    <div key={stage.key} className='flex items-center justify-between gap-3'>
                        <span className='flex items-center gap-2 min-w-0'>
                            <span className='w-2.5 h-2.5 rounded-[3px] shrink-0' style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                            <span className='text-[13px] font-medium text-ink truncate'>{stage.label}</span>
                        </span>
                        <span className='text-[12.5px] text-text-secondary shrink-0'>{stage.count.toLocaleString()} · {stage.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default FunnelChart
