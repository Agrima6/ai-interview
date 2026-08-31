import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ListChecks, Users, CheckCircle2, Star, Plus, AlertCircle } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import FunnelChart from '../../components/charts/FunnelChart'
import AttentionPanel from '../../components/organization/AttentionPanel'
import ActivityFeed from '../../components/ActivityFeed'
import { StatCard, Card, Button, Skeleton, SkeletonText } from '../../components/ui'
import { useOrganizationDashboard } from '../../hooks/organization/useOrganizationDashboard'

const RANGE_OPTIONS = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
]

const chartTooltipStyle = { borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }
const axisTick = { fontSize: 12, fill: 'var(--color-text-secondary)' }

function SectionError({ message, onRetry }) {
    return (
        <div className='py-6 text-center'>
            <AlertCircle size={18} className='text-red-500 mx-auto mb-2' />
            <p className='text-[13px] text-text-secondary mb-3'>{message}</p>
            <Button variant='secondary' size='sm' onClick={onRetry}>Retry</Button>
        </div>
    )
}

function OrganizationDashboard() {
    const navigate = useNavigate()
    const location = useLocation()
    const [range, setRange] = useState('30d')
    const { metrics, trends, attention, activity } = useOrganizationDashboard(range)

    const basePath = location.pathname.startsWith('/college') ? '/college'
        : location.pathname.startsWith('/candidate') ? '/candidate'
        : location.pathname.startsWith('/organization') ? '/organization'
        : '/platform/client'

    const title = location.pathname.startsWith('/college') ? 'College Dashboard'
        : location.pathname.startsWith('/candidate') ? 'Candidate Dashboard'
        : 'Dashboard'

    const description = location.pathname.startsWith('/college')
        ? 'Track your campus hiring drives, student batches, and AI interview pipeline.'
        : location.pathname.startsWith('/candidate')
        ? 'Track your applications, AI interviews, and evaluation scorecards.'
        : 'Track your hiring and AI interview pipeline.'

    const cards = [
        [ListChecks, 'Active Drives', metrics.data?.activeDrives],
        [Users, 'Candidates This Month', metrics.data?.candidatesThisMonth],
        [CheckCircle2, 'Interviews Done', metrics.data?.interviewsDone],
        [Star, 'Average Candidate Score', metrics.data?.averageScore],
    ]

    return (
        <OrganizationLayout
            title={title}
            description={description}
            action={<Button size='sm' onClick={() => navigate(`${basePath}/drives`)}><Plus size={14} /> Create interview drive</Button>}
        >
            <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
                {metrics.isError ? (
                    <div className='sm:col-span-2 lg:col-span-4'>
                        <Card className='p-6'><SectionError message="Unable to load your KPI cards." onRetry={metrics.refetch} /></Card>
                    </div>
                ) : cards.map(([Icon, label, metric]) => (
                    metrics.isLoading || !metric ? (
                        <Skeleton key={label} className='h-[150px]' />
                    ) : (
                        <StatCard key={label} icon={Icon} label={label} value={metric.value.toLocaleString()} trend={metric.trend} />
                    )
                ))}
            </div>

            <div className='grid lg:grid-cols-[1.3fr_1fr] gap-6 mb-6'>
                <Card className='p-6'>
                    <h3 className='text-[15px] font-semibold text-ink mb-6'>Interview Pipeline</h3>
                    {trends.isError ? <SectionError message="Unable to load the pipeline." onRetry={trends.refetch} />
                        : trends.isLoading ? <SkeletonText lines={5} />
                            : <FunnelChart stages={trends.data.pipeline} />}
                </Card>

                <Card className='p-6'>
                    <h3 className='text-[15px] font-semibold text-ink mb-4'>Needs Attention</h3>
                    {attention.isError ? <SectionError message="Unable to load attention items." onRetry={attention.refetch} />
                        : attention.isLoading ? <SkeletonText lines={4} />
                            : <AttentionPanel items={attention.data} />}
                </Card>
            </div>

            <div className='grid lg:grid-cols-[1.3fr_1fr] gap-6'>
                <div className='space-y-6'>
                    <Card className='p-6'>
                        <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
                            <h3 className='text-[15px] font-semibold text-ink'>Interview Activity</h3>
                            <div className='flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.05] rounded-full p-1'>
                                {RANGE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setRange(opt.value)}
                                        className={`px-3 py-1.5 text-[12.5px] font-medium rounded-full transition-colors ${range === opt.value ? 'bg-card text-ink shadow-sm' : 'text-text-secondary hover:text-ink'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className='h-64'>
                            {trends.isError ? <SectionError message="Unable to load interview activity." onRetry={trends.refetch} />
                                : trends.isLoading ? <Skeleton className='w-full h-full' /> : (
                                    <ResponsiveContainer width='100%' height='100%'>
                                        <LineChart data={trends.data.interviewTrend.map((d) => ({ date: d.date.slice(5), count: d.count }))}>
                                            <CartesianGrid strokeDasharray='3 3' stroke='var(--color-line)' />
                                            <XAxis dataKey='date' tick={axisTick} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={chartTooltipStyle} />
                                            <Line type='monotone' dataKey='count' name='Interviews' stroke='var(--color-accent)' strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                        </div>
                    </Card>

                    <Card className='p-6'>
                        <h3 className='text-[15px] font-semibold text-ink mb-6'>Score Distribution</h3>
                        <div className='h-56'>
                            {trends.isError ? <SectionError message="Unable to load score distribution." onRetry={trends.refetch} />
                                : trends.isLoading ? <Skeleton className='w-full h-full' /> : (
                                    <ResponsiveContainer width='100%' height='100%'>
                                        <BarChart data={trends.data.scoreDistribution}>
                                            <CartesianGrid strokeDasharray='3 3' stroke='var(--color-line)' />
                                            <XAxis dataKey='bucket' tick={axisTick} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={chartTooltipStyle} />
                                            <Bar dataKey='count' fill='var(--color-accent)' radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                        </div>
                    </Card>
                </div>

                <Card className='p-6'>
                    <h3 className='text-[15px] font-semibold text-ink mb-5'>Live Activity</h3>
                    {activity.isError ? <SectionError message="Unable to load recent activity." onRetry={activity.refetch} />
                        : activity.isLoading ? <SkeletonText lines={5} />
                            : <ActivityFeed items={activity.data} />}
                </Card>
            </div>
        </OrganizationLayout>
    )
}

export default OrganizationDashboard
