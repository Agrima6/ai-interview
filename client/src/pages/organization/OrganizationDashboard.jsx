import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ListChecks, Users, CheckCircle2, Star, Plus, AlertCircle, ArrowRight } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import FunnelChart from '../../components/charts/FunnelChart'
import AttentionPanel from '../../components/organization/AttentionPanel'
import DashboardHeroIllustration from '../../components/organization/DashboardHeroIllustration'
import ActivityFeed from '../../components/ActivityFeed'
import { StatCard, Card, Button, Badge, Skeleton, SkeletonText, Tabs, EmptyState } from '../../components/ui'
import { useOrganizationDashboard } from '../../hooks/organization/useOrganizationDashboard'
import { listInterviewDrives } from '../../api/organization/organizationApi'
import { formatEnumLabel } from '../../utils/formatEnumLabel'

const RANGE_OPTIONS = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
]

const STATUS_BADGE = { ACTIVE: 'success', DRAFT: 'neutral', COMPLETED: 'info', ARCHIVED: 'danger' }

const chartTooltipStyle = { borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }
const axisTick = { fontSize: 12, fill: 'var(--color-text-secondary)' }
const PIE_COLORS = ['var(--color-accent)', 'var(--color-info)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-neutral)', 'var(--color-accent-cyan)']

function SectionError({ message, onRetry }) {
    return (
        <div className='py-6 text-center'>
            <AlertCircle size={18} className='text-red-500 mx-auto mb-2' />
            <p className='text-[13px] text-text-secondary mb-3'>{message}</p>
            <Button variant='secondary' size='sm' onClick={onRetry}>Retry</Button>
        </div>
    )
}

// Small, dashboard-scoped preview of live drives - not a duplicate of
// DrivesListPage's table (no filters/pagination/actions here), just a
// glanceable top-N pulled from the same real API.
function useActiveDrivesPreview() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchDrives = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const { items } = await listInterviewDrives({ status: 'ACTIVE', pageSize: 5 })
            setData(items || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchDrives() }, [fetchDrives])

    return { data, loading, error, refetch: fetchDrives }
}

function ActiveDrivesTable({ basePath }) {
    const navigate = useNavigate()
    const { data, loading, error, refetch } = useActiveDrivesPreview()

    if (error) return <SectionError message='Unable to load active drives.' onRetry={refetch} />
    if (loading) return <SkeletonText lines={5} />
    if (!data.length) return <EmptyState icon={ListChecks} title='No active drives yet' description='Create an interview drive to see it here.' />

    return (
        <div className='overflow-x-auto -mx-2'>
            <table className='w-full text-left border-collapse'>
                <thead>
                    <tr className='text-[11.5px] uppercase tracking-wide text-text-secondary'>
                        <th className='font-medium px-2 pb-3'>Drive</th>
                        <th className='font-medium px-2 pb-3'>Role</th>
                        <th className='font-medium px-2 pb-3'>Candidates</th>
                        <th className='font-medium px-2 pb-3'>Status</th>
                        <th className='font-medium px-2 pb-3'>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((drive) => {
                        const id = drive._id || drive.id
                        return (
                            <tr
                                key={id}
                                onClick={() => navigate(`${basePath}/drives/${id}`)}
                                className='cursor-pointer border-t border-line hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors'
                            >
                                <td className='px-2 py-3 text-[13.5px] font-medium text-ink whitespace-nowrap'>{drive.title}</td>
                                <td className='px-2 py-3 text-[13px] text-text-secondary whitespace-nowrap'>{formatEnumLabel(drive.roleCategory)}</td>
                                <td className='px-2 py-3 text-[13px] text-text-secondary'>{drive.candidatesCount || drive.rounds?.[0]?.candidates?.length || 0}</td>
                                <td className='px-2 py-3'><Badge variant={STATUS_BADGE[drive.status] || 'neutral'}>{drive.status}</Badge></td>
                                <td className='px-2 py-3 text-[13px] text-text-secondary whitespace-nowrap'>
                                    {drive.createdAt ? new Date(drive.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
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

    const sectionTabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'drives', label: 'Interview Drives' },
        { id: 'candidates', label: 'Candidates' },
        { id: 'team', label: 'Team Activity' },
    ]
    const handleTabChange = (id) => {
        if (id === 'drives') navigate(`${basePath}/drives`)
        else if (id === 'candidates') navigate(`${basePath}/candidates`)
        else if (id === 'team') navigate(`${basePath}/team`)
    }

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
            <Tabs tabs={sectionTabs} value='overview' onChange={handleTabChange} className='mb-6' />

            <div className='grid lg:grid-cols-[1.3fr_1fr] gap-6 mb-6'>
                <Card className='p-6 flex items-center justify-between gap-6 overflow-hidden'>
                    <div className='flex flex-col justify-between h-full min-w-0'>
                        <div>
                            <h2 className='text-[19px] font-bold text-ink mb-1.5'>Find the right talent, faster.</h2>
                            <p className='text-[13.5px] text-text-secondary leading-relaxed max-w-md'>
                                Create interview drives, assess candidates, and make data-driven hiring decisions — all in one place.
                            </p>
                        </div>
                        <div className='flex items-center gap-2.5 mt-5'>
                            <Button size='sm' onClick={() => navigate(`${basePath}/drives`)}><Plus size={14} /> Create Interview Drive</Button>
                            <Button size='sm' variant='secondary' onClick={() => navigate(`${basePath}/drives`)}>View All Drives</Button>
                        </div>
                    </div>
                    <DashboardHeroIllustration className='hidden sm:block w-[150px] h-[110px] shrink-0' />
                </Card>

                <Card className='p-6'>
                    <div className='flex items-center justify-between mb-4'>
                        <h3 className='text-[15px] font-semibold text-ink'>Your Tasks</h3>
                        <button onClick={() => navigate(`${basePath}/drives`)} className='text-[12.5px] font-medium text-accent flex items-center gap-1 hover:underline'>
                            View All <ArrowRight size={12} />
                        </button>
                    </div>
                    {attention.isError ? <SectionError message='Unable to load your tasks.' onRetry={attention.refetch} />
                        : attention.isLoading ? <SkeletonText lines={4} />
                            : <AttentionPanel items={attention.data} />}
                </Card>
            </div>

            <Card className='p-6 mb-6'>
                <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
                    <div>
                        <h3 className='text-[15px] font-semibold text-ink'>Hiring Overview</h3>
                        <p className='text-[12.5px] text-text-secondary'>Track your interview pipeline at a glance.</p>
                    </div>
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

                <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
                    {metrics.isError ? (
                        <div className='sm:col-span-2 lg:col-span-4'>
                            <SectionError message='Unable to load your KPI cards.' onRetry={metrics.refetch} />
                        </div>
                    ) : cards.map(([Icon, label, metric]) => (
                        metrics.isLoading || !metric ? (
                            <Skeleton key={label} className='h-[110px]' />
                        ) : (
                            <StatCard key={label} icon={Icon} label={label} value={metric.value.toLocaleString()} trend={metric.trend} />
                        )
                    ))}
                </div>

                <div className='h-64'>
                    {trends.isError ? <SectionError message='Unable to load interview activity.' onRetry={trends.refetch} />
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

            <Card className='p-6 mb-6'>
                <div className='flex items-center justify-between mb-4'>
                    <h3 className='text-[15px] font-semibold text-ink'>Active Interview Drives</h3>
                    <button onClick={() => navigate(`${basePath}/drives`)} className='text-[12.5px] font-medium text-accent flex items-center gap-1 hover:underline'>
                        View All <ArrowRight size={12} />
                    </button>
                </div>
                <ActiveDrivesTable basePath={basePath} />
            </Card>

            <div className='grid lg:grid-cols-3 gap-6 mb-6'>
                <Card className='p-6'>
                    <h3 className='text-[15px] font-semibold text-ink mb-2'>Department Wise Hiring</h3>
                    {trends.isError ? <SectionError message='Unable to load department breakdown.' onRetry={trends.refetch} />
                        : trends.isLoading ? <Skeleton className='h-48 w-full' />
                        : !trends.data.departmentBreakdown?.length ? (
                            <p className='text-[13px] text-text-secondary py-10 text-center'>No candidate data yet.</p>
                        ) : (
                            <div className='flex items-center gap-4'>
                                <div className='w-28 h-28 shrink-0'>
                                    <ResponsiveContainer width='100%' height='100%'>
                                        <PieChart>
                                            <Pie data={trends.data.departmentBreakdown} dataKey='count' nameKey='department' innerRadius={34} outerRadius={54} paddingAngle={2}>
                                                {trends.data.departmentBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={chartTooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className='flex-1 space-y-1.5 min-w-0'>
                                    {trends.data.departmentBreakdown.slice(0, 5).map((d, i) => (
                                        <div key={d.department} className='flex items-center justify-between text-[12.5px] gap-2'>
                                            <span className='flex items-center gap-1.5 min-w-0'>
                                                <span className='w-2 h-2 rounded-full shrink-0' style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                <span className='text-ink truncate'>{d.department}</span>
                                            </span>
                                            <span className='text-text-secondary font-medium shrink-0'>{d.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                </Card>

                <Card className='p-6'>
                    <h3 className='text-[15px] font-semibold text-ink mb-6'>Interview Funnel</h3>
                    {trends.isError ? <SectionError message='Unable to load the pipeline.' onRetry={trends.refetch} />
                        : trends.isLoading ? <SkeletonText lines={5} />
                            : <FunnelChart stages={trends.data.pipeline} />}
                </Card>

                <Card className='p-6'>
                    <h3 className='text-[15px] font-semibold text-ink mb-5'>Recent Activity</h3>
                    {activity.isError ? <SectionError message='Unable to load recent activity.' onRetry={activity.refetch} />
                        : activity.isLoading ? <SkeletonText lines={5} />
                            : <ActivityFeed items={activity.data} />}
                </Card>
            </div>

            <Card className='p-6'>
                <h3 className='text-[15px] font-semibold text-ink mb-6'>Score Distribution</h3>
                <div className='h-56'>
                    {trends.isError ? <SectionError message='Unable to load score distribution.' onRetry={trends.refetch} />
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
        </OrganizationLayout>
    )
}

export default OrganizationDashboard
