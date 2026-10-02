import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Globe, Clock } from 'lucide-react'
import {
    MIN_LEAD_MINUTES, explainSlot, formatSlotTime, isSameDay, slotsForDay, startOfDay, timezoneLabel,
} from '../../utils/slotRules'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Month calendar + time-slot grid, bounded to the drive's window.
 *   - earliest selectable moment: max(now + 1 hour, drive start)
 *   - latest selectable moment:   drive expiry
 * `value` / `onChange` use ISO 8601 UTC strings (what the API stores); everything shown is local time.
 * `availability` (from the API) sets the organization's hours/timezone/interval; the server re-checks every booking.
 * Besides the slot grid, an exact-time control (hour / minute / AM-PM) lets the candidate pick any allowed minute.
 */
export default function CandidateCalendarPicker({ value, onChange, startDate, expiryDate, availability }) {
    const now = Date.now()
    const minTime = useMemo(() => {
        const lead = now + MIN_LEAD_MINUTES * 60 * 1000
        const start = startDate ? new Date(startDate).getTime() : 0
        return new Date(Math.max(lead, Number.isNaN(start) ? 0 : start))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate])
    const maxTime = useMemo(() => {
        const end = expiryDate ? new Date(expiryDate).getTime() : NaN
        return Number.isNaN(end) ? new Date(now + 30 * 86400000) : new Date(end)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expiryDate])

    const selected = value ? new Date(value) : null
    const firstBookable = useMemo(() => {
        // First day that still has a bookable slot - where the calendar opens.
        for (let d = startOfDay(minTime), i = 0; i < 400 && d <= maxTime; i += 1, d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
            if (slotsForDay(d, minTime, maxTime, availability).some((s) => s.available)) return d
        }
        return null
    }, [minTime, maxTime])

    const [viewMonth, setViewMonth] = useState(() => {
        const anchor = selected || firstBookable || new Date()
        return new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    })
    const [activeDay, setActiveDay] = useState(() => (selected ? startOfDay(selected) : firstBookable))

    const canGoBack = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1) > startOfDay(minTime)
    const canGoForward = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1) <= maxTime

    const cells = useMemo(() => {
        const list = []
        const firstWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay()
        const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
        for (let i = 0; i < firstWeekday; i += 1) list.push(null)
        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
            list.push({ date, enabled: slotsForDay(date, minTime, maxTime, availability).some((s) => s.available) })
        }
        return list
    }, [viewMonth, minTime, maxTime])

    const daySlots = useMemo(() => (activeDay ? slotsForDay(activeDay, minTime, maxTime, availability) : []), [activeDay, minTime, maxTime, availability])

    // Exact-time control: hour (1-12), minute, AM/PM on the active day, validated with the same rules the server uses.
    const [exact, setExact] = useState({ hour: '10', minute: '00', meridiem: 'AM' })
    const exactAt = useMemo(() => {
        if (!activeDay) return null
        let hour = Number(exact.hour) % 12
        if (exact.meridiem === 'PM') hour += 12
        return new Date(activeDay.getFullYear(), activeDay.getMonth(), activeDay.getDate(), hour, Number(exact.minute))
    }, [activeDay, exact])
    const exactProblem = exactAt ? explainSlot(exactAt, { minTime, maxTime, availability }) : 'Pick a date first.'
    const selectClass = 'h-9 rounded-lg border border-line bg-card text-[12.5px] text-ink px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'

    if (!firstBookable) {
        return (
            <div className='p-4 rounded-xl border border-amber-300 bg-amber-50/60 text-[13px] text-amber-800'>
                There are no interview slots left in this drive's window. Please contact the hiring team.
            </div>
        )
    }

    return (
        <div className='rounded-xl border border-line bg-card/40 p-3 sm:p-4'>
            <div className='grid gap-4 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]'>
                {/* Calendar */}
                <div>
                    <div className='flex items-center justify-between mb-2'>
                        <button
                            type='button'
                            disabled={!canGoBack}
                            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                            className='w-8 h-8 flex items-center justify-center rounded-lg border border-line text-text-secondary hover:text-ink disabled:opacity-40 disabled:pointer-events-none'
                            aria-label='Previous month'
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <p className='text-[13px] font-bold text-ink'>
                            {viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </p>
                        <button
                            type='button'
                            disabled={!canGoForward}
                            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                            className='w-8 h-8 flex items-center justify-center rounded-lg border border-line text-text-secondary hover:text-ink disabled:opacity-40 disabled:pointer-events-none'
                            aria-label='Next month'
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    <div className='grid grid-cols-7 gap-1 text-center'>
                        {WEEKDAYS.map((weekday) => (
                            <span key={weekday} className='text-[10.5px] font-semibold text-text-secondary uppercase py-1'>{weekday.slice(0, 2)}</span>
                        ))}
                        {cells.map((cell, index) => {
                            if (!cell) return <span key={`blank-${index}`} />
                            const isActive = activeDay && isSameDay(cell.date, activeDay)
                            const isToday = isSameDay(cell.date, new Date())
                            return (
                                <button
                                    type='button'
                                    key={cell.date.toISOString()}
                                    disabled={!cell.enabled}
                                    onClick={() => setActiveDay(cell.date)}
                                    aria-pressed={Boolean(isActive)}
                                    aria-label={cell.date.toDateString()}
                                    className={`aspect-square min-h-9 rounded-lg text-[12.5px] font-semibold transition-colors ${
                                        isActive
                                            ? 'bg-accent text-white shadow-sm'
                                            : cell.enabled
                                                ? 'text-ink hover:bg-accent/10'
                                                : 'text-text-secondary/40 cursor-not-allowed'
                                    } ${isToday && !isActive ? 'ring-1 ring-accent/40' : ''}`}
                                >
                                    {cell.date.getDate()}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Time slots */}
                <div className='min-w-0'>
                    <p className='text-[12px] font-bold text-ink uppercase tracking-wider mb-2'>
                        {activeDay ? activeDay.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Pick a date'}
                    </p>
                    <div className='grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1'>
                        {daySlots.map((slot) => {
                            const isSelected = selected && selected.getTime() === slot.at.getTime()
                            return (
                                <button
                                    type='button'
                                    key={slot.iso}
                                    disabled={!slot.available}
                                    onClick={() => onChange(slot.iso)}
                                    aria-pressed={Boolean(isSelected)}
                                    className={`px-2 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                                        isSelected
                                            ? 'bg-accent text-white shadow-sm'
                                            : slot.available
                                                ? 'bg-black/[0.03] dark:bg-white/[0.05] text-ink hover:bg-accent/10'
                                                : 'bg-black/[0.02] text-text-secondary/40 line-through cursor-not-allowed'
                                    }`}
                                >
                                    {formatSlotTime(slot.at)}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <fieldset className='mt-3 pt-3 border-t border-line'>
                <legend className='text-[12px] font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5'>
                    <Clock size={12} /> Or pick an exact time
                </legend>
                <div className='flex flex-wrap items-center gap-2'>
                    <select aria-label='Hour' className={selectClass} value={exact.hour} onChange={(e) => setExact({ ...exact, hour: e.target.value })}>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span aria-hidden className='text-ink font-bold'>:</span>
                    <select aria-label='Minute' className={selectClass} value={exact.minute} onChange={(e) => setExact({ ...exact, minute: e.target.value })}>
                        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select aria-label='AM or PM' className={selectClass} value={exact.meridiem} onChange={(e) => setExact({ ...exact, meridiem: e.target.value })}>
                        <option>AM</option><option>PM</option>
                    </select>
                    <button
                        type='button'
                        disabled={Boolean(exactProblem)}
                        onClick={() => onChange(exactAt.toISOString())}
                        className='h-9 px-3 rounded-lg bg-accent text-white text-[12.5px] font-semibold disabled:opacity-40 disabled:pointer-events-none'
                    >
                        Use this time
                    </button>
                </div>
                {exactProblem && activeDay && <p role='status' className='mt-1.5 text-[12px] text-text-secondary'>{exactProblem}</p>}
            </fieldset>

            <p className='mt-3 text-[11.5px] text-text-secondary flex items-center gap-1.5 flex-wrap'>
                <Globe size={12} className='shrink-0' /> Times shown in your local timezone: <span className='font-semibold text-ink'>{timezoneLabel()}</span>
            </p>
        </div>
    )
}
