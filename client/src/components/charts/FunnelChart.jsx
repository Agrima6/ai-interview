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
const MIN_PIXEL_WIDTH = 16
const BAND_HEIGHT = 32
const BAND_GAP = 4

// Each band's width is driven by its real count relative to the first
// stage's, but every band is also forced strictly narrower than the one
// above it. Without that, several tied/zero-count stages in a row (e.g.
// three stages that all genuinely have 0 candidates so far) would get
// the exact same clamped-minimum width and render as flat stacked
// rectangles instead of a continuous taper - a funnel must always look
// like a funnel, with real data controlling how quickly it narrows.
const computeWidths = (stages) => {
    const maxCount = stages[0]?.count || 1
    let prevWidth = FUNNEL_WIDTH
    return stages.map((stage, i) => {
        const byCount = maxCount ? (stage.count / maxCount) * FUNNEL_WIDTH : 0
        // Guarantees visible narrowing even when byCount is flat/zero for a run of stages.
        const taperFloor = FUNNEL_WIDTH * Math.pow(0.82, i)
        const width = Math.min(prevWidth, Math.max(byCount, taperFloor, MIN_PIXEL_WIDTH))
        prevWidth = width
        return width
    })
}

function FunnelChart({ stages, className = '' }) {
    if (!stages?.length) return <p className='text-text-secondary text-[13.5px]'>No pipeline data yet.</p>

    const widths = computeWidths(stages)
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

            <div className='flex-1 flex flex-col justify-between min-w-0' style={{ height: totalHeight }}>
                {stages.map((stage) => (
                    <div key={stage.key} className='flex items-baseline gap-2 min-w-0'>
                        <span className='text-[15px] font-bold text-ink shrink-0'>{stage.count.toLocaleString()}</span>
                        <span className='text-[13px] text-text-secondary truncate'>{stage.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default FunnelChart
