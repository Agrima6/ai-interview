import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarClock, ClipboardList, Plus } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import Button from '../../components/Button'
import Skeleton from '../../components/ui/Skeleton'
import { ErrorState, PageHeader, Panel } from '../../components/oa/oaUi'
import { formatDateTime } from '../../components/oa/oaFormat'

const STEPS = [
    ['Create an assessment', 'Name it, then add sections for MCQ, short and long answers, or coding.'],
    ['Add questions', 'Write them, upload a CSV, or describe a topic and let AI draft them for you to review.'],
    ['Upload students', 'Names and emails only. Each student gets their own access code.'],
    ['Schedule and publish', 'Pick the start time and duration. Students are emailed and everyone starts together.'],
    ['Review results', 'See the live board during the test, then ranked scores and proctoring evidence.'],
]

export default function OaDashboardPage() {
    const navigate = useNavigate()
    const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['oa', 'dashboard'], queryFn: oaApi.dashboard })

    const create = <Button size='sm' onClick={() => navigate('/oa/admin/assessments?new=1')}><Plus size={15} /> New assessment</Button>

    return (
        <>
            <PageHeader title='Dashboard' subtitle='Your online assessments at a glance.' actions={create} />
            {isError ? <ErrorState title='Could not load your dashboard' message={error.message} onRetry={refetch} /> : (
                <div className='grid lg:grid-cols-[1fr_340px] gap-6'>
                    <div className='space-y-6 min-w-0'>
                        <section className='bg-card border border-line rounded-2xl'>
                            <dl className='grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-line'>
                                {[
                                    ['Live now', data?.assessments.live], ['Upcoming', data?.assessments.upcoming],
                                    ['Students invited', data?.students], ['Sitting now', data?.attempts.inProgress],
                                ].map(([label, value]) => (
                                    <div key={label} className='px-5 py-4'>
                                        <dt className='text-[12px] font-semibold text-text-secondary'>{label}</dt>
                                        <dd className='text-[26px] font-display font-bold text-ink mt-0.5 tabular-nums'>{isLoading ? <Skeleton className='h-7 w-10' /> : value ?? 0}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        <Panel title='Starting soon' actions={<Link to='/oa/admin/assessments' className='text-[13px] font-semibold text-accent hover:underline inline-flex items-center gap-1'>All assessments <ArrowRight size={14} /></Link>}>
                            {isLoading ? <Skeleton className='h-16 w-full' /> : data.next.length ? (
                                <ul className='divide-y divide-line -my-2'>
                                    {data.next.map((a) => (
                                        <li key={a.id}>
                                            <Link to={`/oa/admin/assessments/${a.id}`} className='flex items-center gap-3 py-3 group'>
                                                <span className='w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0'><CalendarClock size={17} /></span>
                                                <span className='min-w-0 flex-1'>
                                                    <span className='block text-[14px] font-semibold text-ink truncate group-hover:text-accent'>{a.title}</span>
                                                    <span className='block text-[12.5px] text-text-secondary'>{formatDateTime(a.startAt)}</span>
                                                </span>
                                                <ArrowRight size={15} className='text-text-secondary' />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className='text-center py-6'>
                                    <p className='text-[14px] text-text-secondary mb-3'>Nothing is scheduled yet. Published assessments with a future start time show up here.</p>
                                    <Link to='/oa/admin/assessments' className='text-[13.5px] font-semibold text-accent hover:underline'>Go to assessments</Link>
                                </div>
                            )}
                        </Panel>
                    </div>

                    <Panel title='How it works' description='Five steps from idea to ranked results.'>
                        <ol className='space-y-4'>
                            {STEPS.map(([title, text], i) => (
                                <li key={title} className='flex gap-3'>
                                    <span className='w-6 h-6 rounded-full bg-accent text-white text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5'>{i + 1}</span>
                                    <div><div className='text-[13.5px] font-semibold text-ink'>{title}</div><p className='text-[12.5px] text-text-secondary leading-relaxed'>{text}</p></div>
                                </li>
                            ))}
                        </ol>
                        {!isLoading && data?.assessments.total === 0 && (
                            <Button className='w-full mt-5' size='sm' onClick={() => navigate('/oa/admin/assessments?new=1')}><ClipboardList size={15} /> Create your first assessment</Button>
                        )}
                    </Panel>
                </div>
            )}
        </>
    )
}
