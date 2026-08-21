import React, { useState } from 'react'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SKILLS = [
    ['Communication', 62],
    ['Problem Solving', 76],
    ['Technical Skills', 90],
]

function scoreColor(score) {
    if (score >= 90) return 'var(--color-success)'
    if (score >= 70) return 'var(--color-accent-cyan)'
    return '#f58b91'
}

function clampScore(value) {
    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) return 0
    return Math.min(100, Math.max(0, Math.round(numericValue)))
}

function AIScorePanel() {
    const [scores, setScores] = useState(() => SKILLS.map(([, score]) => score))
    const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    const meterOffset = 1 - overallScore / 100

    const updateScore = (index, value) => {
        setScores((current) => current.map((score, scoreIndex) => scoreIndex === index ? clampScore(value) : score))
    }

    return (
        <div className='relative overflow-hidden rounded-3xl border border-line bg-card p-6 shadow-lift sm:p-8'>
            <div className='absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.12] blur-2xl' style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />

            <div className='relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7'>
                <div className='relative h-[142px] w-[184px] shrink-0 self-center sm:self-auto' aria-label={`Overall Fit ${overallScore}%`} role='img'>
                    <svg viewBox='0 0 180 116' className='h-auto w-full' aria-hidden='true'>
                        <path d='M 18 92 A 72 72 0 0 1 162 92' fill='none' stroke='var(--color-line)' strokeWidth='16' strokeLinecap='round' />
                        <path
                            className='score-ring'
                            d='M 18 92 A 72 72 0 0 1 162 92'
                            fill='none'
                            stroke='var(--color-accent)'
                            strokeWidth='16'
                            strokeLinecap='round'
                            pathLength='1'
                            strokeDasharray='1'
                            strokeDashoffset={meterOffset}
                            style={{ transition: REDUCE_MOTION ? 'none' : 'stroke-dashoffset 500ms ease-out' }}
                        />
                    </svg>
                    <div className='absolute inset-x-0 bottom-[34px] flex flex-col items-center justify-end'>
                        <span className='score-num font-display text-[26px] font-bold tabular-nums text-accent'>{overallScore}%</span>
                    </div>
                </div>

                <div>
                    <p className='mb-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-accent'>AI Evaluation</p>
                    <h3 className='font-display text-[20px] font-bold leading-snug text-ink'>Candidate Score, generated instantly.</h3>
                    <p className='mt-2 text-[12px] leading-relaxed text-text-secondary'>Adjust each skill score to see the overall meter respond.</p>
                </div>
            </div>

            <div className='relative mt-8 space-y-5'>
                {SKILLS.map(([label], index) => {
                    const score = scores[index]
                    const color = scoreColor(score)
                    return (
                        <div key={label}>
                            <div className='mb-1.5 flex items-center justify-between gap-4'>
                                <label htmlFor={`skill-score-${index}`} className='text-[13.5px] font-medium text-ink'>{label}</label>
                                <div className='flex items-center gap-1'>
                                    <input
                                        id={`skill-score-${index}`}
                                        type='number'
                                        min='0'
                                        max='100'
                                        value={score}
                                        onChange={(event) => updateScore(index, event.target.value)}
                                        className='w-12 rounded-md border border-transparent bg-transparent text-right text-[12.5px] font-semibold tabular-nums text-ink outline-none transition-colors focus:border-accent/30 focus:bg-bg'
                                        aria-label={`${label} percentage`}
                                    />
                                    <span className='text-[12.5px] font-semibold text-text-secondary'>%</span>
                                </div>
                            </div>
                            <input
                                type='range'
                                min='0'
                                max='100'
                                value={score}
                                onChange={(event) => updateScore(index, event.target.value)}
                                className='score-range'
                                style={{ '--score': `${score}%`, '--score-color': color }}
                                aria-label={`Adjust ${label} score`}
                            />
                        </div>
                    )
                })}
            </div>

            <div className='mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-[10px] text-text-secondary'>
                <span className='inline-flex items-center gap-1.5'><i className='h-2 w-2 rounded-full bg-[#f58b91]' aria-hidden='true' />Below 70%</span>
                <span className='inline-flex items-center gap-1.5'><i className='h-2 w-2 rounded-full bg-accent-cyan' aria-hidden='true' />70–89%</span>
                <span className='inline-flex items-center gap-1.5'><i className='h-2 w-2 rounded-full bg-success' aria-hidden='true' />90%+</span>
            </div>
        </div>
    )
}

export default AIScorePanel
