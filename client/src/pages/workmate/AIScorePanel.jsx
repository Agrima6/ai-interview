import React, { useEffect, useState } from 'react'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SKILLS = [
    ['Communication', 62],
    ['Problem Solving', 76],
    ['Technical Skills', 90],
]

function scoreColor(score) {
    if (score <= 70) return '#f58b91'
    if (score <= 89) return 'var(--color-accent-cyan)'
    return 'var(--color-success)'
}

function clampScore(value) {
    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) return 0
    return Math.min(100, Math.max(0, Math.round(numericValue)))
}

function AIScorePanel({ onOverallScoreChange }) {
    const [scores, setScores] = useState(() => SKILLS.map(([, score]) => score))
    const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    const meterOffset = 1 - overallScore / 100

    useEffect(() => {
        onOverallScoreChange?.(overallScore)
    }, [onOverallScoreChange, overallScore])

    const updateScore = (index, value) => {
        setScores((current) => current.map((score, scoreIndex) => scoreIndex === index ? clampScore(value) : score))
    }

    return (
        <div className='relative p-5 sm:p-7 lg:p-6'>
            <div className='relative grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(210px,0.85fr)] lg:gap-0'>
                <div className='order-2 lg:order-1 lg:pr-6'>
                    <div className='space-y-6 lg:space-y-4'>
                        {SKILLS.map(([label], index) => {
                            const score = scores[index]
                            const color = scoreColor(score)
                            return (
                                <div key={label}>
                                    <div className='mb-2 flex items-center justify-between gap-4'>
                                        <label htmlFor={`skill-score-${index}`} className='type-component-title text-ink'>{label}</label>
                                        <div className='flex items-baseline'>
                                            <input
                                                id={`skill-score-${index}`}
                                                type='number'
                                                min='0'
                                                max='100'
                                                value={score}
                                                onChange={(event) => updateScore(index, event.target.value)}
                                                className='type-body-small w-10 rounded-md border border-transparent bg-transparent p-0 text-right font-semibold tabular-nums text-ink outline-none transition-colors focus:border-accent/30 focus:bg-bg'
                                                aria-label={`${label} percentage`}
                                            />
                                            <span className='type-body-small font-semibold text-text-secondary'>%</span>
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

                    <div className='type-caption mt-7 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-text-secondary lg:mt-5 lg:pt-3'>
                        <span className='inline-flex items-center gap-1.5'><i className='h-2 w-2 rounded-full bg-[#f58b91]' aria-hidden='true' />70% and below</span>
                        <span className='inline-flex items-center gap-1.5'><i className='h-2 w-2 rounded-full bg-accent-cyan' aria-hidden='true' />71–89%</span>
                        <span className='inline-flex items-center gap-1.5'><i className='h-2 w-2 rounded-full bg-success' aria-hidden='true' />90%+</span>
                    </div>
                </div>

                <div className='order-1 border-b border-line pb-7 lg:order-2 lg:border-b-0 lg:border-l lg:pb-5 lg:pl-6'>
                    <p className='type-eyebrow mb-1.5 text-accent'>AI Evaluation</p>
                    <h3 className='type-card-title max-w-[260px] text-ink'>Candidate Score, generated instantly.</h3>

                    <div className='relative mx-auto mt-5 h-[148px] w-full max-w-[218px] lg:mt-3 lg:h-[124px] lg:max-w-[195px]' aria-label={`Overall Fit ${overallScore}%`} role='img'>
                        <svg viewBox='0 0 180 116' className='h-auto w-full' aria-hidden='true'>
                            <path d='M 18 92 A 72 72 0 0 1 162 92' fill='none' stroke='#f1dfe0' strokeWidth='19' strokeLinecap='round' />
                            <path
                                className='score-ring'
                                d='M 18 92 A 72 72 0 0 1 162 92'
                                fill='none'
                                stroke='var(--color-accent-dark)'
                                strokeWidth='19'
                                strokeLinecap='round'
                                pathLength='1'
                                strokeDasharray='1'
                                strokeDashoffset={meterOffset}
                                style={{ transition: REDUCE_MOTION ? 'none' : 'stroke-dashoffset 500ms ease-out' }}
                            />
                        </svg>
                        <div className='absolute inset-x-0 bottom-[33px] flex items-center justify-center lg:bottom-[27px]'>
                            <span className='score-num type-metric tabular-nums text-accent-dark'>{overallScore}%</span>
                        </div>
                    </div>

                    <div className='mt-1 max-w-[250px]'>
                        <p className='type-component-title text-ink'>Overall Interview Readiness</p>
                        <p className='type-body-small mt-1.5 text-text-secondary'>A combined score based on communication, problem solving and technical performance.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AIScorePanel
