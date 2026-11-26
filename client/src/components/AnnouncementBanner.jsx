import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, X } from 'lucide-react'

const TONES = {
    INFO: 'bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info)]/20',
    SUCCESS: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success)]/25',
    WARNING: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/25',
}
const STORE = 'announcements.dismissed'

const readDismissed = () => { try { const v = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
const writeDismissed = (ids) => { try { localStorage.setItem(STORE, JSON.stringify(ids.slice(-50))) } catch { /* private mode: it just comes back next visit */ } }

/**
 * One announcement as a slim bar. A message that fits is shown still; one that is longer than the bar scrolls like a ticker,
 * pausing while the pointer or keyboard focus is on it (and it simply wraps for people who prefer reduced motion).
 */
export function AnnouncementStrip({ announcement: a, onDismiss }) {
    const frame = useRef(null)
    const probe = useRef(null)
    const [scrolls, setScrolls] = useState(false)

    useLayoutEffect(() => {
        const measure = () => { if (frame.current && probe.current) setScrolls(probe.current.scrollWidth > frame.current.clientWidth) }
        measure()
        if (typeof ResizeObserver === 'undefined' || !frame.current) return undefined
        const observer = new ResizeObserver(measure)
        observer.observe(frame.current)
        return () => observer.disconnect()
    }, [a.message, a.linkLabel])

    const content = (
        <>
            <span>{a.message}</span>
            {a.linkUrl && <a href={a.linkUrl} target='_blank' rel='noopener noreferrer' className='ml-3 font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'>{a.linkLabel || 'Learn more'}</a>}
        </>
    )
    const seconds = Math.max(14, Math.round((a.message.length + (a.linkLabel || '').length) * 0.28))

    return (
        <div role='region' aria-label='Announcement' className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 text-[13.5px] font-medium ${TONES[a.tone] || TONES.INFO}`}>
            <Megaphone size={16} className='shrink-0' aria-hidden='true' />
            <div ref={frame} className='relative min-w-0 flex-1 overflow-hidden group'>
                {/* measures the text on one line, whatever is shown */}
                <span ref={probe} aria-hidden='true' className='absolute left-0 top-0 invisible whitespace-nowrap pointer-events-none'>{content}</span>
                {scrolls ? (
                    <div className='flex w-max whitespace-nowrap animate-marquee motion-reduce:animate-none motion-reduce:whitespace-normal motion-reduce:w-auto group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]' style={{ animationDuration: `${seconds}s` }}>
                        <span className='pr-16'>{content}</span>
                        <span className='pr-16 motion-reduce:hidden' aria-hidden='true'>{content}</span>
                    </div>
                ) : <div className='whitespace-nowrap'>{content}</div>}
            </div>
            {onDismiss && <button type='button' onClick={onDismiss} aria-label='Dismiss announcement' className='shrink-0 -mr-1 p-1 rounded-md opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2'><X size={15} aria-hidden='true' /></button>}
        </div>
    )
}

/** What the platform owner has announced, for whoever is signed in. `fetcher` says where to read it. Shows nothing when there is nothing live. */
export default function AnnouncementBanner({ fetcher, scope }) {
    const { data } = useQuery({ queryKey: ['announcements', 'live', scope], queryFn: fetcher, staleTime: 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: false })
    const [dismissed, setDismissed] = useState(readDismissed)
    useEffect(() => { const onStorage = (e) => { if (e.key === STORE) setDismissed(readDismissed()) }; window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage) }, [])
    const shown = (Array.isArray(data) ? data : []).filter((a) => !dismissed.includes(a.id)).slice(0, 3)
    if (!shown.length) return null
    const dismiss = (id) => { const next = [...dismissed, id]; setDismissed(next); writeDismissed(next) }
    return <div className='mb-4 space-y-2'>{shown.map((a) => <AnnouncementStrip key={a.id} announcement={a} onDismiss={() => dismiss(a.id)} />)}</div>
}

