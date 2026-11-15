import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../Button'
import Skeleton from '../ui/Skeleton'

// Draft = gray, Published = green, Archived = red (the product's status colours), always with the word, not colour alone.
export function AssessmentStatus({ status }) {
    const map = { DRAFT: ['neutral', 'Draft'], PUBLISHED: ['success', 'Published'], ARCHIVED: ['danger', 'Archived'] }
    const [variant, label] = map[status] || ['neutral', status]
    return <Badge variant={variant}>{label}</Badge>
}

export function PhaseBadge({ phase }) {
    const map = {
        UNSCHEDULED: ['neutral', 'Not scheduled'], UPCOMING: ['info', 'Upcoming'], OPEN: ['success', 'Live'],
        CLOSED_TO_ENTRY: ['warning', 'Live · entry closed'], ENDED: ['neutral', 'Ended'],
    }
    const [variant, label] = map[phase] || ['neutral', phase]
    return <Badge variant={variant} pulse={phase === 'OPEN'}>{label}</Badge>
}

export function AttemptStatus({ status }) {
    const map = {
        NOT_STARTED: ['neutral', 'Not started'], IN_PROGRESS: ['info', 'In progress'], SUBMITTED: ['success', 'Submitted'],
        AUTO_SUBMITTED: ['warning', 'Time up'], TERMINATED: ['danger', 'Ended by proctor'],
    }
    const [variant, label] = map[status] || ['neutral', status]
    return <Badge variant={variant}>{label}</Badge>
}

export function PageHeader({ title, subtitle, actions, back }) {
    return (
        <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6'>
            <div className='min-w-0'>
                {back}
                <h1 className='font-display text-[24px] sm:text-[26px] font-bold text-ink tracking-tight break-words'>{title}</h1>
                {subtitle && <p className='text-[14px] text-text-secondary mt-1'>{subtitle}</p>}
            </div>
            {actions && <div className='flex flex-wrap items-center gap-2 shrink-0'>{actions}</div>}
        </div>
    )
}

export function Panel({ title, description, actions, children, className = '', bodyClassName = '' }) {
    return (
        <section className={`bg-card border border-line rounded-2xl ${className}`}>
            {(title || actions) && (
                <header className='flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line'>
                    <div>
                        <h2 className='text-[15px] font-bold text-ink'>{title}</h2>
                        {description && <p className='text-[12.5px] text-text-secondary mt-0.5'>{description}</p>}
                    </div>
                    {actions}
                </header>
            )}
            <div className={`p-5 ${bodyClassName}`}>{children}</div>
        </section>
    )
}

export function ErrorState({ title = 'Could not load this', message, onRetry }) {
    return (
        <div role='alert' className='flex flex-col items-center text-center py-12 px-6'>
            <div className='w-12 h-12 rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)] flex items-center justify-center mb-3'><AlertTriangle size={22} /></div>
            <h3 className='text-[16px] font-bold text-ink mb-1'>{title}</h3>
            {message && <p className='text-[13.5px] text-text-secondary max-w-sm mb-4'>{message}</p>}
            {onRetry && <Button size='sm' variant='secondary' onClick={onRetry}><RefreshCw size={14} /> Try again</Button>}
        </div>
    )
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
    return (
        <div className='divide-y divide-line' aria-busy='true' aria-label='Loading'>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className='flex gap-4 px-4 py-3.5'>
                    {Array.from({ length: cols }).map((__, c) => <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-1/4' : 'flex-1'}`} />)}
                </div>
            ))}
        </div>
    )
}
