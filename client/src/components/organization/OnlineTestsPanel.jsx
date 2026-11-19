import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarClock, ClipboardCheck, Radio, UserCheck, Users, Video } from 'lucide-react'
import { oaApi, oaTokens } from '../../api/oaApi'
import { Skeleton } from '../ui'
import { formatDay, formatTime } from '../oa/oaFormat'

const Stat = ({ icon, label, value, tone }) => {
    const Icon = icon
    return (
        <div className='flex items-center gap-3 px-4 py-3.5 min-w-0'>
            <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${tone}`} aria-hidden='true'><Icon size={17} /></span>
            <div className='min-w-0'><div className='font-display text-[22px] leading-none font-bold text-ink tabular-nums'>{value ?? 0}</div><div className='text-[12px] font-semibold text-text-secondary mt-1 truncate'>{label}</div></div>
        </div>
    )
}

/**
 * The online-test side of the organization's dashboard: what is live, who is sitting, and which registrations are waiting
 * for approval. It sits next to the AI interview figures so one dashboard covers both.
 */
export default function OnlineTestsPanel({ basePath }) {
    const [ready, setReady] = useState(() => Boolean(oaTokens.get('admin')))
    useEffect(() => { if (!ready) oaApi.orgSession().then(() => setReady(true)).catch(() => {}) }, [ready])
    const { data, isLoading, isError } = useQuery({ queryKey: ['oa', 'dashboard'], queryFn: oaApi.dashboard, enabled: ready, staleTime: 60 * 1000 })
    if (isError) return null
    const empty = data && data.assessments.total === 0

    return (
        <section aria-label='Online tests' className='mb-6 border border-line rounded-2xl bg-card overflow-hidden'>
            <div className='flex items-center justify-between gap-3 px-5 py-4 border-b border-line'>
                <div className='flex items-center gap-2.5'><span className='w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center' aria-hidden='true'><ClipboardCheck size={17} /></span>
                    <div><h2 className='text-[15px] font-bold text-ink'>Online tests</h2><p className='text-[12.5px] text-text-secondary'>Rounds that candidates take as a proctored test</p></div></div>
                <Link to={`${basePath}/drives`} className='inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline'>All drives <ArrowRight size={14} aria-hidden='true' /></Link>
            </div>
            {isLoading || !ready ? <div className='p-5'><Skeleton className='h-16 w-full rounded-xl' /></div> : empty ? (
                <p className='px-5 py-6 text-[13.5px] text-text-secondary'>No online tests yet. Open a drive and add an online test round, or <Link to={`${basePath}/drives?new=1`} className='font-semibold text-accent hover:underline'>create a new drive</Link>.</p>
            ) : (
                <>
                    <div className='grid grid-cols-2 lg:grid-cols-4 divide-line lg:divide-x'>
                        <Stat icon={Radio} label='Live now' value={data.assessments.live} tone='bg-[var(--color-success-soft)] text-[var(--color-success)]' />
                        <Stat icon={CalendarClock} label='Upcoming' value={data.assessments.upcoming} tone='bg-[var(--color-info-soft)] text-[var(--color-info)]' />
                        <Stat icon={Users} label='Candidates invited' value={data.students} tone='bg-accent/10 text-accent' />
                        <Stat icon={Video} label='Sitting right now' value={data.attempts.inProgress} tone='bg-[var(--color-warning-soft)] text-[var(--color-warning)]' />
                    </div>
                    {data.pending?.total > 0 && (
                        <div className='border-t border-line bg-[var(--color-warning-soft)]/60 px-5 py-3.5'>
                            <p className='flex items-center gap-2 text-[13.5px] font-bold text-ink'><UserCheck size={16} className='text-[var(--color-warning)]' aria-hidden='true' /> {data.pending.total} registration{data.pending.total === 1 ? '' : 's'} waiting for your approval</p>
                            <ul className='mt-1.5 divide-y divide-[var(--color-warning)]/20'>
                                {data.pending.rounds.map((r) => (
                                    <li key={r.id}><Link to={r.driveId ? `${basePath}/drives/rounds/${r.driveId}?round=${r.id}&step=candidates` : `${basePath}/drives`} className='flex items-center gap-3 py-2 group'>
                                        <span className='flex-1 min-w-0 text-[13px] font-semibold text-ink truncate group-hover:text-accent'>{r.title}<span className='font-normal text-text-secondary'> · Round {r.roundNumber}</span></span>
                                        <span className='text-[12.5px] font-bold text-[var(--color-warning)] tabular-nums'>{r.count} waiting</span><ArrowRight size={14} className='text-text-secondary' aria-hidden='true' /></Link></li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {data.next?.length > 0 && (
                        <div className='border-t border-line px-5 py-3'>
                            <p className='text-[12px] font-semibold text-text-secondary mb-1'>Starting soon</p>
                            <ul className='text-[13px] text-ink space-y-0.5'>{data.next.map((n) => <li key={n.id} className='flex justify-between gap-3'><span className='truncate'>{n.title}</span><span className='text-text-secondary whitespace-nowrap'>{formatDay(n.startAt)} · {formatTime(n.startAt)}</span></li>)}</ul>
                        </div>
                    )}
                </>
            )}
        </section>
    )
}
