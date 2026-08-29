import React, { useEffect, useState } from 'react'
import { getScoreBand } from './scoreBand'

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SKILLS = [
    ['Communication', 62],
    ['Problem Solving', 76],
    ['Technical Skills', 90],
]

function scoreColor(score) {
    const band = getScoreBand(score)
    if (band === 'low') return '#f58b91'
    if (band === 'mid') return 'var(--color-accent-cyan)'
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
        <div className='relative p-0 md:p-5 lg:p-6'>
            <div className='relative grid gap-3 md:grid-cols-[minmax(0,1.45fr)_minmax(210px,0.85fr)] md:gap-0'>
                <div className='order-2 md:order-1 md:pr-5 lg:pr-6'>
                    <div className='space-y-3 md:space-y-4'>
                        {SKILLS.map(([label], index) => {
                            const score = scores[index]
                            const color = scoreColor(score)
                            return (
                                <div key={label}>
                                    <div className='mb-1 flex items-center justify-between gap-4 md:mb-2'>
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

                    <div className='type-caption mt-3 flex flex-wrap gap-x-2 gap-y-1 border-t border-line pt-2 text-text-secondary md:mt-4 md:gap-x-3 md:gap-y-2 md:pt-3 lg:mt-5'>
                        <span className='inline-flex items-center gap-1.5'><i className='h-2 w-2 rounded-full bg-[#f58b91]' aria-hidden='true' />70% and below</span>
                        <span className='inline-flex items-center gap-1.5'><i className='h-2 w-2 rounded-full bg-accent-cyan' aria-hidden='true' />71–89%</span>
                        <span className='inline-flex items-center gap-1.5'><i className='h-2 w-2 rounded-full bg-success' aria-hidden='true' />90%+</span>
                    </div>
                </div>

                <div className='order-1 grid grid-cols-[minmax(104px,126px)_minmax(0,1fr)] gap-x-3 border-b border-line pb-3 md:order-2 md:block md:border-b-0 md:border-l md:pb-0 md:pl-5 lg:pb-5 lg:pl-6'>
                    <p className='col-span-2 row-start-1 type-eyebrow mb-1.5 text-accent'>AI Evaluation</p>
                    <h3 className='col-span-2 row-start-2 type-card-title max-w-[260px] text-ink'>Candidate Score, generated instantly.</h3>

                    <div className='score-gauge relative col-start-1 row-start-3 mt-2 self-start md:mx-auto md:mt-3' aria-label={`Overall Fit ${overallScore}%`} role='img'>
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
                        <div className='score-gauge__value absolute inset-x-0 flex items-center justify-center'>
                            <span className='score-num type-metric tabular-nums text-accent-dark'>{overallScore}%</span>
                        </div>
                    </div>

                    <div className='col-start-2 row-start-3 mt-2 min-w-0 self-center md:mt-1 md:max-w-[250px]'>
                        <p className='type-component-title text-ink'>Overall Interview Readiness</p>
                        <p className='type-body-small mt-1.5 text-text-secondary'>A combined score based on communication, problem solving and technical performance.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AIScorePanel
