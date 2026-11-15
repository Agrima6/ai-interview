import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CalendarClock, Check, Lock } from 'lucide-react'
import { examApi } from '../../../api/oaApi'
import { formatDay, formatTime } from '../oaFormat'

// The student's own choice of start time. Every card is a real radio so it works by keyboard and screen reader.
export default function SlotPicker({ slots, cutoffMinutes, timezone, durationMinutes, onBooked }) {
    const [error, setError] = useState('')
    const [pendingId, setPendingId] = useState(null)
    const book = useMutation({
        mutationFn: (slotId) => examApi.bookSlot(slotId),
        onMutate: (slotId) => { setError(''); setPendingId(slotId) },
        onSuccess: () => onBooked(),
        onError: (err) => { setError(err.message); onBooked() },       // reload so a full or closed slot is shown as such
        onSettled: () => setPendingId(null),
    })
    const mine = slots.find((s) => s.mine)
    const anyBookable = slots.some((s) => s.bookable)

    return (
        <section className='bg-card border border-line rounded-2xl p-6 oa-rise' aria-labelledby='slot-heading'>
            <h2 id='slot-heading' className='text-[15px] font-bold text-ink flex items-center gap-2'><CalendarClock size={17} className='text-accent' /> {mine ? 'Your time slot' : 'Choose when you want to take the test'}</h2>
            <p className='text-[12.5px] text-text-secondary mt-0.5 mb-4'>
                {mine ? `You can change it until ${cutoffMinutes} minutes before it starts.` : `Pick one start time. You can change it until ${cutoffMinutes} minutes before it starts. The test lasts ${durationMinutes} minutes.`}
            </p>
            {!anyBookable && !mine && <p role='alert' className='text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5 mb-3'>No slot can be booked any more. Please contact your organizer.</p>}
            {error && <p role='alert' className='oa-error-in text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5 mb-3'>{error}</p>}
            <div role='radiogroup' aria-label='Available time slots' className='grid sm:grid-cols-2 gap-3'>
                {slots.map((s) => {
                    const unavailable = !s.bookable && !s.mine
                    const status = s.mine ? 'Your slot' : s.full ? 'Full' : s.closed ? 'Booking closed' : s.remaining !== null ? `${s.remaining} seat${s.remaining === 1 ? '' : 's'} left` : 'Open'
                    return (
                        <button key={s.id} type='button' role='radio' aria-checked={s.mine} disabled={unavailable || book.isPending}
                            onClick={() => !s.mine && book.mutate(s.id)}
                            className={`oa-press text-left rounded-xl border-[1.5px] p-3.5 transition-all ${s.mine ? 'border-accent bg-accent/5 shadow-[0_8px_20px_-12px_var(--color-accent)]' : unavailable ? 'border-line opacity-55 cursor-not-allowed' : 'border-line hover:border-accent/50 hover:-translate-y-px'} ${pendingId === s.id ? 'animate-pulse' : ''}`}>
                            <span className='flex items-center justify-between gap-2'>
                                <span className='text-[12px] font-semibold text-text-secondary'>{formatDay(s.startAt, timezone)}</span>
                                {s.mine ? <span className='w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center'><svg className='oa-check' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12l5 5L20 7' /></svg></span>
                                    : unavailable ? <Lock size={13} className='text-text-secondary' /> : <Check size={13} className='text-transparent' />}
                            </span>
                            <span className='block font-display text-[22px] font-bold text-ink tabular-nums mt-0.5'>{formatTime(s.startAt, timezone)}</span>
                            <span className={`block text-[12px] mt-1 font-medium ${s.mine ? 'text-accent' : s.full || s.closed ? 'text-[var(--color-danger)]' : s.remaining !== null && s.remaining <= 3 ? 'text-[var(--color-warning)]' : 'text-text-secondary'}`}>{pendingId === s.id ? 'Booking…' : status}</span>
                        </button>
                    )
                })}
            </div>
        </section>
    )
}
