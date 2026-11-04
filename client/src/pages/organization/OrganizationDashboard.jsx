import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ListChecks, Users, CheckCircle2, Star, Plus, AlertCircle, ArrowRight } from 'lucide-react'
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import FunnelChart from '../../components/charts/FunnelChart'
import AttentionPanel from '../../components/organization/AttentionPanel'
import DashboardHero from '../../components/organization/DashboardHero'
import ActivityFeed from '../../components/ActivityFeed'
import { Reveal } from '../../components/ui/motionKit'
import { motion } from 'motion/react'
import { StatCard, Card, Button, Badge, Skeleton, SkeletonText, Tabs, EmptyState } from '../../components/ui'
import { useOrganizationDashboard } from '../../hooks/organization/useOrganizationDashboard'
import { listInterviewDrives } from '../../api/organization/organizationApi'
import { formatEnumLabel } from '../../utils/formatEnumLabel'

const RANGE_OPTIONS = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
]

const STATUS_BADGE = { ACTIVE: 'success', DRAFT: 'neutral', COMPLETED: 'info', CLOSED: 'warning', ARCHIVED: 'danger' }

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
        <div className='overflow-x-auto -mx-1'>
            <table className='w-full text-left border-collapse'>
                <thead>
                    <tr className='text-[12px] font-bold tracking-[0.06em] uppercase text-text-secondary'>
                        <th className='px-3 pb-3'>Drive</th>
                        <th className='px-3 pb-3'>Role</th>
                        <th className='px-3 pb-3'>Candidates</th>
                        <th className='px-3 pb-3'>Status</th>
                        <th className='px-3 pb-3'>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((drive, rowIndex) => {
                        const id = drive._id || drive.id
                        return (
                            <motion.tr
                                key={id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: rowIndex * 0.05, duration: 0.3 }}
                                onClick={() => navigate(`${basePath}/drives/${id}`)}
                                className='ui-row cursor-pointer border-t border-line'
                            >
                                <td className='px-3 py-3.5 whitespace-nowrap'>
                                    <span className='flex items-center gap-3'>
                                        <span className='w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] text-accent text-[12px] font-bold flex items-center justify-center'>{(drive.title || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                                        <span className='text-[14px] font-bold text-ink'>{drive.title}</span>
                                    </span>
                                </td>
                                <td className='px-3 py-3.5 text-[13px] text-text-secondary whitespace-nowrap'>{formatEnumLabel(drive.roleCategory)}</td>
                                <td className='px-3 py-3.5 text-[13px] text-text-secondary'>{drive.candidatesCount || drive.rounds?.[0]?.candidates?.length || 0}</td>
                                <td className='px-3 py-3.5'><Badge dot variant={STATUS_BADGE[drive.status] || 'neutral'}>{drive.status}</Badge></td>
                                <td className='px-3 py-3.5 text-[13px] text-text-secondary whitespace-nowrap'>
                                    {drive.createdAt ? new Date(drive.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                                </td>
                            </motion.tr>
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
        [ListChecks, 'Active Drives', metrics.data?.activeDrives, 'brand'],
        [Users, 'Candidates This Month', metrics.data?.candidatesThisMonth, 'cyan'],
        [CheckCircle2, 'Interviews Done', metrics.data?.interviewsDone, 'success'],
        [Star, 'Average Candidate Score', metrics.data?.averageScore, 'neutral'],
    ]

    const greeting = (() => {
        const hour = new Date().getHours()
        return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    })()

    return (
        <OrganizationLayout
            title={title}
            description={description}
            eyebrow={greeting}
            onSearch={(q) => navigate(`${basePath}/drives?search=${encodeURIComponent(q)}`)}
        >
            <Tabs tabs={sectionTabs} value='overview' onChange={handleTabChange} className='mb-6' />

            <div className='grid xl:grid-cols-[1.6fr_1fr] gap-6 mb-6'>
                <DashboardHero onCreate={() => navigate(`${basePath}/drives`)} onViewAll={() => navigate(`${basePath}/drives`)} />

                <Card className='ui-rise p-6' style={{ animationDelay: '120ms' }}>
                    <div className='flex items-center justify-between mb-4'>
                        <div>
                            <h3 className='text-[16px] font-bold text-ink'>Needs your attention</h3>
                            <p className='text-[13px] text-text-secondary'>Items waiting on you today</p>
                        </div>
                        <button onClick={() => navigate(`${basePath}/drives`)} className='text-[13px] font-bold text-accent flex items-center gap-1 hover:underline'>
                            View all <ArrowRight size={13} />
                        </button>
                    </div>
                    {attention.isError ? <SectionError message='Unable to load your tasks.' onRetry={attention.refetch} />
                        : attention.isLoading ? <SkeletonText lines={4} />
                            : <AttentionPanel items={attention.data} />}
                </Card>
            </div>

            <Reveal index={1}><Card className='p-6 mb-6'>
                <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
                    <div>
                        <h3 className='text-[16px] font-bold text-ink'>Hiring Overview</h3>
                        <p className='text-[13px] text-text-secondary'>Track your interview pipeline at a glance.</p>
                    </div>
                    <div role='group' aria-label='Date range' className='flex items-center gap-1 bg-[var(--color-navy)] rounded-[14px] p-[5px]'>
                        {RANGE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setRange(opt.value)}
                                aria-pressed={range === opt.value}
                                className={`h-9 px-4 text-[13px] font-bold rounded-[10px] transition-all ${range === opt.value ? 'bg-accent text-white shadow-md' : 'text-[#c3c9ee] hover:text-white'}`}
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
                    ) : cards.map(([Icon, label, metric, accent]) => (
                        metrics.isLoading || !metric ? (
                            <Skeleton key={label} className='h-[130px] !rounded-[20px]' />
                        ) : (
                            <StatCard key={label} icon={Icon} accent={accent} label={label} value={metric.value.toLocaleString()} trend={metric.trend} />
                        )
                    ))}
                </div>

                <div className='h-64'>
                    {trends.isError ? <SectionError message='Unable to load interview activity.' onRetry={trends.refetch} />
                        : trends.isLoading ? <Skeleton className='w-full h-full' /> : (
                            <ResponsiveContainer width='100%' height='100%'>
                                <AreaChart data={trends.data.interviewTrend.map((d) => ({ date: d.date.slice(5), count: d.count }))}>
                                    <defs>
                                        <linearGradient id='interviewsFill' x1='0' y1='0' x2='0' y2='1'>
                                            <stop offset='0%' stopColor='var(--color-accent)' stopOpacity={0.28} />
                                            <stop offset='100%' stopColor='var(--color-accent)' stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray='3 3' stroke='var(--color-line)' vertical={false} />
                                    <XAxis dataKey='date' tick={axisTick} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: 'var(--color-accent)', strokeOpacity: 0.25 }} />
                                    <Area type='monotone' dataKey='count' name='Interviews' stroke='var(--color-accent)' strokeWidth={3} fill='url(#interviewsFill)' dot={false} activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff' }} animationDuration={1100} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                </div>
            </Card></Reveal>

            <Reveal index={1}><Card className='p-6 mb-6'>
                <div className='flex items-center justify-between mb-4'>
                    <div>
                        <h3 className='text-[16px] font-bold text-ink'>Active interview drives</h3>
                        <p className='text-[13px] text-text-secondary'>Your most recent live drives.</p>
                    </div>
                    <button onClick={() => navigate(`${basePath}/drives`)} className='text-[13px] font-bold text-accent flex items-center gap-1 hover:underline'>
                        View all <ArrowRight size={13} />
                    </button>
                </div>
                <ActiveDrivesTable basePath={basePath} />
            </Card></Reveal>

            <Reveal className='grid lg:grid-cols-3 gap-6 mb-6'>
                <Card className='p-6'>
                    <h3 className='text-[16px] font-bold text-ink mb-3'>Department wise hiring</h3>
                    {trends.isError ? <SectionError message='Unable to load department breakdown.' onRetry={trends.refetch} />
                        : trends.isLoading ? <Skeleton className='h-48 w-full' />
                        : !trends.data.departmentBreakdown?.length ? (
                            <EmptyState compact icon={Users} title='No candidate data yet' description='Department mix appears once candidates are added.' />
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
                                            <span className='text-text-secondary font-bold shrink-0'>{d.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                </Card>

                <Card className='p-6'>
                    <h3 className='text-[16px] font-bold text-ink mb-6'>Interview funnel</h3>
                    {trends.isError ? <SectionError message='Unable to load the pipeline.' onRetry={trends.refetch} />
                        : trends.isLoading ? <SkeletonText lines={5} />
                            : <FunnelChart stages={trends.data.pipeline} />}
                </Card>

                <Card className='p-6'>
                    <h3 className='text-[16px] font-bold text-ink mb-5'>Recent activity</h3>
                    {activity.isError ? <SectionError message='Unable to load recent activity.' onRetry={activity.refetch} />
                        : activity.isLoading ? <SkeletonText lines={5} />
                            : <ActivityFeed items={activity.data} />}
                </Card>
            </Reveal>

            <Reveal><Card className='p-6'>
                <h3 className='text-[16px] font-bold text-ink mb-6'>Score distribution</h3>
                <div className='h-56'>
                    {trends.isError ? <SectionError message='Unable to load score distribution.' onRetry={trends.refetch} />
                        : trends.isLoading ? <Skeleton className='w-full h-full' /> : (
                            <ResponsiveContainer width='100%' height='100%'>
                                <BarChart data={trends.data.scoreDistribution}>
                                    <CartesianGrid strokeDasharray='3 3' stroke='var(--color-line)' vertical={false} />
                                    <XAxis dataKey='bucket' tick={axisTick} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--color-accent)', fillOpacity: 0.06 }} />
                                    <Bar dataKey='count' fill='var(--color-accent)' radius={[10, 10, 0, 0]} animationDuration={900} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                </div>
            </Card></Reveal>
        </OrganizationLayout>
    )
}

export default OrganizationDashboard
