import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { RadioTower, WifiOff } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import useNow from '../../hooks/useNow'
import { AttemptStatus, ErrorState, PhaseBadge, TableSkeleton } from './oaUi'
import { formatDay, formatTime } from './oaFormat'

const clock = (ms) => {
    if (ms <= 0) return '0:00'
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// What is happening right now: who is writing, who has not shown up, whose connection dropped, who is being flagged.
export default function LiveTab({ assessment: a }) {
    const now = useNow(1000)
    const live = useQuery({ queryKey: ['oa', 'assessment', a.id, 'live'], queryFn: () => oaApi.live(a.id), refetchInterval: 8000 })
    const data = live.data

    if (live.isError) return <ErrorState title='Could not load the live view' message={live.error.message} onRetry={live.refetch} />
    const c = data?.counts
    const slotted = a.schedule?.mode === 'SLOTS'
    const tz = a.schedule?.timezone

    return (
        <>
            <div className='flex flex-wrap items-center gap-3 mb-4'>
                <span className='inline-flex items-center gap-2 text-[13px] text-text-secondary'><RadioTower size={15} /> Updates every few seconds</span>
                {data && <PhaseBadge phase={data.phase} />}
            </div>
            <dl className='grid grid-cols-2 sm:grid-cols-5 bg-card border border-line rounded-2xl divide-x divide-y sm:divide-y-0 divide-line mb-5'>
                {[['Invited', c?.total], ['Not started', c?.notStarted], ['Writing now', c?.inProgress], ['Finished', c?.submitted], ['Ended by proctor', c?.terminated]].map(([label, value]) => (
                    <div key={label} className='px-4 py-3.5'><dt className='text-[12px] font-semibold text-text-secondary'>{label}</dt><dd className='text-[22px] font-display font-bold text-ink tabular-nums'>{value ?? '—'}</dd></div>
                ))}
            </dl>
            {c?.offline > 0 && <p role='status' className='mb-4 text-[13px] text-[var(--color-warning)] bg-[var(--color-warning-soft)] rounded-xl px-4 py-2.5 inline-flex items-center gap-2'><WifiOff size={15} /> {c.offline} student{c.offline === 1 ? ' has' : 's have'} not been heard from for over a minute.</p>}

            <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                {live.isLoading ? <TableSkeleton cols={5} /> : data.items.length === 0 ? (
                    <EmptyState compact title='Nobody is on this test yet' description='Add students on the Students tab.' />
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-[13.5px] min-w-[720px]'>
                            <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'><tr><th className='px-4 py-3'>Student</th><th className='px-4 py-3'>Status</th>{slotted && <th className='px-4 py-3'>Slot</th>}<th className='px-4 py-3 text-right'>Time left</th><th className='px-4 py-3 text-right'>Violations</th><th className='px-4 py-3'>Connection</th></tr></thead>
                            <tbody className='divide-y divide-line'>
                                {data.items.map((s) => (
                                    <tr key={s.studentId} className='ui-row'>
                                        <td className='px-4 py-3'><div className='font-semibold text-ink'>{s.name}</div><div className='text-[12px] text-text-secondary'>{s.rollNumber || s.email}</div></td>
                                        <td className='px-4 py-3'><AttemptStatus status={s.status} /></td>
                                        {slotted && <td className='px-4 py-3 whitespace-nowrap text-[13px]'>{s.slotStartAt ? `${formatDay(s.slotStartAt, tz)}, ${formatTime(s.slotStartAt, tz)}` : <span className='text-text-secondary'>Not chosen</span>}</td>}
                                        <td className='px-4 py-3 text-right tabular-nums'>{s.status === 'IN_PROGRESS' && s.deadline ? clock(new Date(s.deadline) - now) : '—'}</td>
                                        <td className='px-4 py-3 text-right'>{s.violationCount > 0 ? <Badge variant={s.violationCount >= 3 ? 'danger' : 'warning'}>{s.violationCount}</Badge> : <span className='text-text-secondary'>0</span>}</td>
                                        <td className='px-4 py-3'>{s.status === 'IN_PROGRESS' ? (s.offline ? <Badge variant='danger'>Offline {s.silentForSec}s</Badge> : <Badge variant='success' dot>Connected</Badge>) : <span className='text-text-secondary'>—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}
