import React, { useEffect, useRef } from 'react'
import { motion as M } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Lock } from 'lucide-react'
import Button from '../Button'

/**
 * The numbered path a round follows: 1 Questions → 2 Candidates → ... Each step is `{ id, label, hint, done, locked,
 * lockReason }`. A finished step shows a tick, the current one is highlighted, and a locked one is greyed out with
 * the reason, so an organizer always knows where they are and what comes next.
 */
export function DriveStepper({ steps, current, onSelect }) {
    const activeRef = useRef(null)
    // On a phone the row scrolls sideways: keep the current step in view.
    useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }) }, [current])
    const index = steps.findIndex((s) => s.id === current)
    const reached = steps.reduce((last, s, i) => (s.done || i === index ? i : last), 0)

    return (
        <nav aria-label='Steps for this round' className='bg-card border border-line rounded-2xl px-3 sm:px-5 py-4 overflow-x-auto'>
            <ol className='relative flex min-w-[640px]'>
                {/* The track behind the circles, and the part of it already travelled. */}
                <span aria-hidden='true' className='absolute top-[19px] h-[3px] rounded-full bg-line' style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }} />
                <M.span aria-hidden='true' className='absolute top-[19px] h-[3px] rounded-full bg-[var(--color-success)] origin-left' style={{ left: `${50 / steps.length}%`, width: `${100 - 100 / steps.length}%` }}
                    initial={false} animate={{ scaleX: steps.length > 1 ? reached / (steps.length - 1) : 0 }} transition={{ type: 'spring', duration: 0.7, bounce: 0.12 }} />
                {steps.map((s, i) => {
                    const active = s.id === current
                    return (
                        <li key={s.id} className='relative flex-1 flex justify-center'>
                            <button type='button' ref={active ? activeRef : null} aria-current={active ? 'step' : undefined} aria-disabled={s.locked || undefined} title={s.locked ? s.lockReason : undefined}
                                onClick={() => { if (!s.locked) onSelect(s.id) }}
                                className={`group flex flex-col items-center gap-2 px-1 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${s.locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <span className='relative'>
                                    {active && <M.span layoutId='oa-step-halo' aria-hidden='true' className='absolute -inset-[5px] rounded-full bg-accent/15' transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }} />}
                                    <M.span initial={false} animate={{ scale: active ? 1.08 : 1 }} transition={{ type: 'spring', duration: 0.4, bounce: 0.4 }}
                                        className={`relative w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold border-2 transition-colors duration-300 ${s.locked ? 'bg-surface-muted border-line text-text-secondary/60'
                                            : active ? 'bg-accent border-accent text-white shadow-[0_8px_18px_-8px_var(--color-accent)]'
                                                : s.done ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
                                                    : 'bg-card border-line text-text-secondary group-hover:border-accent group-hover:text-accent'}`}>
                                        {s.locked ? <Lock size={15} aria-hidden='true' /> : s.done && !active ? <M.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.5 }}><Check size={18} strokeWidth={3} aria-hidden='true' /></M.span> : i + 1}
                                    </M.span>
                                </span>
                                <span className='text-center leading-tight'>
                                    <span className={`block text-[11px] font-bold uppercase tracking-wide ${s.locked ? 'text-text-secondary/60' : active ? 'text-accent' : 'text-text-secondary'}`}>Step {i + 1}</span>
                                    <span className={`block text-[13px] font-semibold ${s.locked ? 'text-text-secondary/60' : active ? 'text-ink' : 'text-text-secondary group-hover:text-ink'}`}>{s.label}</span>
                                    <span className='sr-only'>{s.locked ? `, locked: ${s.lockReason}` : s.done ? ', done' : ''}</span>
                                </span>
                            </button>
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}

/** The headline for the step in view: the number, what to do, and in one sentence why. */
export function StepIntro({ number, total, title, text, icon, aside }) {
    const Icon = icon
    return (
        <M.div key={number} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.32, ease: [0.2, 0.75, 0.2, 1] }}
            className='flex flex-col sm:flex-row sm:items-center gap-4 mt-4 mb-5 rounded-2xl border border-accent/20 bg-[color-mix(in_srgb,var(--color-accent)_5%,var(--color-surface,white))] px-4 sm:px-5 py-4'>
            <span className='w-12 h-12 shrink-0 rounded-2xl bg-accent text-white flex items-center justify-center shadow-[0_10px_20px_-10px_var(--color-accent)]' aria-hidden='true'><Icon size={22} strokeWidth={1.9} /></span>
            <div className='min-w-0 flex-1'>
                <p className='text-[11.5px] font-bold uppercase tracking-wide text-accent'>Step {number} of {total}</p>
                <h2 className='font-display text-[19px] sm:text-[21px] font-bold text-ink leading-snug'>{title}</h2>
                <p className='text-[13.5px] text-text-secondary mt-0.5'>{text}</p>
            </div>
            {aside && <div className='shrink-0'>{aside}</div>}
        </M.div>
    )
}

/** Back / Continue, always in reach at the bottom of the screen. */
export function StepFooter({ previous, next, onSelect, note }) {
    return (
        <div className='sticky bottom-0 z-[var(--z-dropdown)] -mx-4 sm:-mx-6 lg:-mx-8 mt-8 px-4 sm:px-6 lg:px-8 py-3 bg-card/95 backdrop-blur border-t border-line flex items-center justify-between gap-3'>
            {previous ? <Button size='sm' variant='secondary' onClick={() => onSelect(previous.id)}><ArrowLeft size={15} /> <span className='hidden sm:inline'>Back: {previous.label}</span><span className='sm:hidden'>Back</span></Button> : <span />}
            {note && <p className='hidden md:block flex-1 text-center text-[12.5px] text-text-secondary truncate'>{note}</p>}
            {next && (
                <Button size='sm' disabled={next.locked} title={next.locked ? next.lockReason : undefined} onClick={() => onSelect(next.id)}>
                    {next.locked ? <Lock size={14} /> : null}<span className='hidden sm:inline'>Next: {next.label}</span><span className='sm:hidden'>Next</span>{!next.locked && <ArrowRight size={15} />}
                </Button>
            )}
        </div>
    )
}
