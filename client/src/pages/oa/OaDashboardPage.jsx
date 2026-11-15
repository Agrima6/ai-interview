import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarClock, Check, ClipboardList, Plus, Radio, Users, Video } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import Button from '../../components/Button'
import { CountUp } from '../../components/ui/motionKit'
import { ErrorState, Panel } from '../../components/oa/oaUi'
import { formatDay, formatTime } from '../../components/oa/oaFormat'

const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// What the organizer is most likely to want to know first, in one sentence.
const summary = (d) => {
    if (!d) return 'Loading your assessments…'
    const { live, upcoming, draft } = d.assessments
    if (live) return `${live} test${live === 1 ? ' is' : 's are'} live right now${d.attempts.inProgress ? ` with ${d.attempts.inProgress} student${d.attempts.inProgress === 1 ? '' : 's'} sitting` : ''}.`
    if (upcoming) return `${upcoming} test${upcoming === 1 ? ' is' : 's are'} scheduled. Everything is ready when the time comes.`
    if (draft) return `${draft} draft${draft === 1 ? '' : 's'} waiting to be finished and published.`
    return 'Create your first assessment and invite students in minutes.'
}

const StatIcon = ({ icon }) => React.createElement(icon, { size: 18 })

function Stat({ icon, label, value, tone = 'accent', pulse = false, loading }) {
    const tones = { accent: 'bg-accent/10 text-accent', success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]', info: 'bg-[var(--color-info-soft)] text-[var(--color-info)]', warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]' }
    return (
        <div className='oa-lift bg-card border border-line rounded-2xl px-4 py-4 flex items-center gap-3.5'>
            <span className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
                <StatIcon icon={icon} />
                {pulse && value > 0 && <span className='absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] oa-ring' aria-hidden='true' />}
            </span>
            <div className='min-w-0'>
                <div className='font-display text-[26px] leading-none font-bold text-ink tabular-nums'>{loading ? <span className='oa-skel inline-block h-6 w-9 rounded-md align-middle' /> : <CountUp value={value ?? 0} />}</div>
                <div className='text-[12px] font-semibold text-text-secondary mt-1.5 truncate'>{label}</div>
            </div>
        </div>
    )
}

export default function OaDashboardPage() {
    const navigate = useNavigate()
    const me = useQuery({ queryKey: ['oa', 'me'], queryFn: oaApi.me, staleTime: 5 * 60 * 1000 })
    const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['oa', 'dashboard'], queryFn: oaApi.dashboard })
    const first = (me.data?.contactName || '').split(' ')[0]

    const steps = [
        ['Create an assessment', 'Name it and add sections.', (data?.assessments.total || 0) > 0, '/oa/admin/assessments?new=1'],
        ['Add questions and students', 'Write, upload or let AI draft them.', (data?.students || 0) > 0, '/oa/admin/assessments'],
        ['Schedule and publish', 'One start time, or let students pick a slot.', (data?.assessments.live || 0) + (data?.assessments.upcoming || 0) + (data?.assessments.ended || 0) > 0, '/oa/admin/assessments'],
        ['Review ranked results', 'Scores, rank and proctoring evidence.', (data?.attempts.finished || 0) > 0, '/oa/admin/assessments'],
    ]
    const done = steps.filter((s) => s[2]).length

    return (
        <div>
            <section className='oa-mesh rounded-3xl border border-line bg-card px-6 sm:px-8 py-7 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-5'>
                <div className='min-w-0'>
                    <p className='text-[12.5px] font-semibold text-accent tracking-wide uppercase'>Online Assessment</p>
                    <h1 className='font-display text-[26px] sm:text-[30px] font-bold text-ink tracking-tight mt-1 break-words'>{greeting()}{first ? `, ${first}` : ''}</h1>
                    <p className='text-[14.5px] text-text-secondary mt-1.5 max-w-xl'>{summary(data)}</p>
                </div>
                <Button size='sm' className='oa-press shrink-0' onClick={() => navigate('/oa/admin/assessments?new=1')}><Plus size={15} /> New assessment</Button>
            </section>

            {isError ? <ErrorState title='Could not load your dashboard' message={error.message} onRetry={refetch} /> : (
                <>
                    <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 oa-stagger'>
                        <Stat icon={Radio} label='Live now' value={data?.assessments.live} tone='success' pulse loading={isLoading} />
                        <Stat icon={CalendarClock} label='Upcoming' value={data?.assessments.upcoming} tone='info' loading={isLoading} />
                        <Stat icon={Users} label='Students invited' value={data?.students} tone='accent' loading={isLoading} />
                        <Stat icon={Video} label='Sitting right now' value={data?.attempts.inProgress} tone='warning' loading={isLoading} />
                    </div>

                    <div className='grid lg:grid-cols-[1fr_360px] gap-6 items-start'>
                        <Panel title='Starting soon' description='Published tests with a future start.' actions={<Link to='/oa/admin/assessments' className='text-[13px] font-semibold text-accent hover:underline inline-flex items-center gap-1'>All assessments <ArrowRight size={14} /></Link>} bodyClassName='!p-0'>
                            {isLoading ? (
                                <div className='p-5 space-y-3'>{[0, 1].map((i) => <div key={i} className='oa-skel h-14 rounded-xl' />)}</div>
                            ) : data.next.length ? (
                                <ul className='divide-y divide-line'>
                                    {data.next.map((a, i) => (
                                        <li key={a.id} className='oa-rise' style={{ animationDelay: `${i * 70}ms` }}>
                                            <Link to={`/oa/admin/assessments/${a.id}`} className='ui-row flex items-center gap-4 px-5 py-3.5 group'>
                                                <span className='w-12 shrink-0 rounded-xl border border-line bg-surface-muted text-center py-1.5 leading-tight'>
                                                    <span className='block text-[10.5px] font-bold uppercase text-accent'>{formatDay(a.startAt).split(' ').slice(-1)[0]}</span>
                                                    <span className='block text-[17px] font-display font-bold text-ink'>{formatDay(a.startAt).split(' ').slice(1, 2)[0]}</span>
                                                </span>
                                                <span className='min-w-0 flex-1'>
                                                    <span className='block text-[14.5px] font-semibold text-ink truncate group-hover:text-accent transition-colors'>{a.title}</span>
                                                    <span className='block text-[12.5px] text-text-secondary'>{formatDay(a.startAt)} · {formatTime(a.startAt)}</span>
                                                </span>
                                                <ArrowRight size={16} className='text-text-secondary transition-transform group-hover:translate-x-0.5' />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className='text-center py-10 px-6'>
                                    <span className='mx-auto w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3'><ClipboardList size={22} /></span>
                                    <p className='text-[14px] font-semibold text-ink'>Nothing scheduled yet</p>
                                    <p className='text-[13px] text-text-secondary mt-1 mb-4'>Published assessments with a future start time show up here.</p>
                                    <Link to='/oa/admin/assessments' className='text-[13.5px] font-semibold text-accent hover:underline'>Go to assessments</Link>
                                </div>
                            )}
                        </Panel>

                        <Panel title='Getting started' description={`${done} of ${steps.length} done`}>
                            <div className='h-1.5 rounded-full bg-line mb-4 overflow-hidden' role='progressbar' aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label='Setup progress'>
                                <div className='h-full rounded-full bg-accent transition-[width] duration-700 ease-out' style={{ width: `${(done / steps.length) * 100}%` }} />
                            </div>
                            <ol className='space-y-1'>
                                {steps.map(([title, text, complete, to]) => (
                                    <li key={title}>
                                        <Link to={to} className='flex gap-3 rounded-xl px-2 py-2 -mx-2 hover:bg-black/[0.03] transition-colors group'>
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[12px] font-bold transition-colors ${complete ? 'bg-[var(--color-success)] text-white' : 'border-[1.5px] border-line text-text-secondary group-hover:border-accent group-hover:text-accent'}`}>
                                                {complete ? <Check size={13} strokeWidth={3} /> : steps.findIndex((x) => x[0] === title) + 1}
                                            </span>
                                            <span><span className={`block text-[13.5px] font-semibold ${complete ? 'text-text-secondary line-through decoration-1' : 'text-ink'}`}>{title}</span><span className='block text-[12.5px] text-text-secondary leading-relaxed'>{text}</span></span>
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        </Panel>
                    </div>
                </>
            )}
        </div>
    )
}
