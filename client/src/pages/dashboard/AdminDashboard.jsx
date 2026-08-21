import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Loader2, CheckCircle2, Building2, TrendingUp, MessageCircleQuestion, AlertCircle, Clock } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import AdminShell from '../../components/layout/AdminShell'
import { StatCard, Card, Badge, Skeleton, SkeletonText } from '../../components/ui'
import { usePermission } from '../../hooks/useAuth.jsx'
import { featurePermissions } from '../../permissions/featurePermissions'
import { getDashboardSummary, getDashboardActivity, getDashboardTrends } from '../../api/dashboardApi'

const RANGE_OPTIONS = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
]

const TYPE_COLORS = { ORGANIZATION: '#c4161f', COLLEGE: '#f59e0b', CANDIDATE: '#3b82f6' }
const TYPE_LABELS = { ORGANIZATION: 'Organization', COLLEGE: 'College', CANDIDATE: 'Candidate' }

const ACTIVITY_STATUS_VARIANT = {
    NOT_STARTED: 'neutral',
    IN_PROGRESS: 'brand',
    SUBMITTED: 'warning',
    UNDER_REVIEW: 'warning',
    RESUBMITTED: 'warning',
    CHANGES_REQUESTED: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
}

const chartTooltipStyle = { borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }
const axisTick = { fontSize: 12, fill: 'var(--color-text-secondary)' }

function AdminDashboard() {
    const hasPermission = usePermission()
    const [summary, setSummary] = useState(null)
    const [summaryError, setSummaryError] = useState('')

    const [activity, setActivity] = useState(null)
    const [activityError, setActivityError] = useState('')

    const [range, setRange] = useState('30d')
    const [trends, setTrends] = useState(null)
    const [trendsError, setTrendsError] = useState('')
    const [trendsLoading, setTrendsLoading] = useState(true)

    const canViewDashboard = hasPermission(featurePermissions.dashboard)
    const canViewActivity = hasPermission(featurePermissions.dashboardActivity)
    const canViewAnalytics = hasPermission(featurePermissions.dashboardAnalytics)

    useEffect(() => {
        if (!canViewDashboard) return
        getDashboardSummary().then(setSummary).catch((err) => setSummaryError(err.message))
    }, [canViewDashboard])

    useEffect(() => {
        if (!canViewActivity) return
        getDashboardActivity().then(setActivity).catch((err) => setActivityError(err.message))
    }, [canViewActivity])

    useEffect(() => {
        if (!canViewAnalytics) return
        setTrendsLoading(true)
        setTrendsError('')
        getDashboardTrends(range)
            .then(setTrends)
            .catch((err) => setTrendsError(err.message))
            .finally(() => setTrendsLoading(false))
    }, [canViewAnalytics, range])

    if (!canViewDashboard) {
        return <AdminShell><p className='text-text-secondary text-[14px]'>You don't have access to the dashboard.</p></AdminShell>
    }

    const cards = [
        [FileText, 'Total registrations', summary?.totalRegistrations, '/platform/admin/onboarding'],
        [Loader2, 'Active onboarding', summary?.activeOnboarding, '/platform/admin/onboarding'],
        [TrendingUp, 'Pending review', summary?.pendingReview, '/platform/admin/onboarding'],
        [CheckCircle2, 'Completion rate', summary ? `${summary.completionRate}%` : undefined, '/platform/admin/onboarding'],
        [Building2, 'Active clients', summary?.activeClients, '/platform/admin/clients'],
        [MessageCircleQuestion, 'New enquiries', summary?.newEnquiries, '/platform/admin/enquiries'],
    ]

    // Only real, already-fetched counts - no invented metrics.
    const attentionItems = [
        summary?.pendingReview > 0 && { label: `${summary.pendingReview} onboarding review${summary.pendingReview === 1 ? '' : 's'} pending`, to: '/platform/admin/onboarding' },
        summary?.newEnquiries > 0 && { label: `${summary.newEnquiries} enquir${summary.newEnquiries === 1 ? 'y needs' : 'ies need'} follow-up`, to: '/platform/admin/enquiries' },
    ].filter(Boolean)

    const combinedTrendData = trends
        ? trends.registrations.map((r, i) => ({ date: r.date.slice(5), registrations: r.count, enquiries: trends.enquiries[i]?.count || 0 }))
        : []

    const typeData = trends
        ? Object.entries(trends.registrationsByType).map(([key, value]) => ({ key, label: TYPE_LABELS[key] || key, value }))
        : []

    const funnelData = trends
        ? [
            { stage: 'Registered', count: trends.onboardingFunnel.registered },
            { stage: 'In Progress', count: trends.onboardingFunnel.inProgress },
            { stage: 'Submitted', count: trends.onboardingFunnel.submitted },
            { stage: 'Approved', count: trends.onboardingFunnel.approved },
        ]
        : []

    return (
        <AdminShell>
            <div className='flex items-center justify-between mb-1'>
                <h1 className='font-display text-[22px] font-bold text-ink'>Dashboard</h1>
            </div>
            <p className='text-text-secondary text-[14px] mb-8'>An overview of registrations moving through WorkmateIQ.</p>

            {summaryError && <p className='text-[13.5px] text-red-500 mb-4'>{summaryError}</p>}

            <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
                {cards.map(([Icon, label, value, to]) => (
                    <Link key={label} to={to}>
                        <StatCard icon={Icon} label={label} value={value === undefined || value === null ? '—' : value} className='cursor-pointer' />
                    </Link>
                ))}
            </div>

            {attentionItems.length > 0 && (
                <Card className='p-5 mb-6 border-amber-500/25 bg-amber-500/[0.04]'>
                    <div className='flex items-center gap-2 mb-3'>
                        <AlertCircle size={16} className='text-amber-500' />
                        <h3 className='text-[13.5px] font-semibold text-ink'>Attention Required</h3>
                    </div>
                    <div className='space-y-1.5'>
                        {attentionItems.map((item) => (
                            <Link key={item.label} to={item.to} className='block text-[13px] text-text-secondary hover:text-ink transition-colors'>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </Card>
            )}

            {canViewAnalytics && (
                <div className='space-y-6 mb-6'>
                    <Card className='p-6'>
                        <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
                            <h3 className='text-[15px] font-semibold text-ink'>Registrations &amp; Enquiries over time</h3>
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
                        <div className='h-72'>
                            {trendsLoading ? (
                                <Skeleton className='w-full h-full' />
                            ) : trendsError ? (
                                <p className='text-[13.5px] text-red-500'>{trendsError}</p>
                            ) : combinedTrendData.every((d) => d.registrations === 0 && d.enquiries === 0) ? (
                                <p className='text-text-secondary text-[13.5px]'>No activity in this period.</p>
                            ) : (
                                <ResponsiveContainer width='100%' height='100%'>
                                    <LineChart data={combinedTrendData}>
                                        <CartesianGrid strokeDasharray='3 3' stroke='var(--color-line)' />
                                        <XAxis dataKey='date' tick={axisTick} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={chartTooltipStyle} />
                                        <Legend wrapperStyle={{ fontSize: 12.5 }} />
                                        <Line type='monotone' dataKey='registrations' name='Registrations' stroke='#c4161f' strokeWidth={2} dot={false} />
                                        <Line type='monotone' dataKey='enquiries' name='Enquiries' stroke='#3b82f6' strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>

                    <div className='grid lg:grid-cols-2 gap-6'>
                        <Card className='p-6'>
                            <h3 className='text-[15px] font-semibold text-ink mb-6'>Registrations by audience</h3>
                            <div className='h-64'>
                                {trendsLoading ? (
                                    <Skeleton className='w-full h-full' />
                                ) : typeData.every((d) => d.value === 0) || typeData.length === 0 ? (
                                    <p className='text-text-secondary text-[13.5px]'>No registrations in this period.</p>
                                ) : (
                                    <ResponsiveContainer width='100%' height='100%'>
                                        <PieChart>
                                            <Pie data={typeData} dataKey='value' nameKey='label' innerRadius={55} outerRadius={85} paddingAngle={2}>
                                                {typeData.map((d) => <Cell key={d.key} fill={TYPE_COLORS[d.key] || '#94a3b8'} />)}
                                            </Pie>
                                            <Tooltip contentStyle={chartTooltipStyle} />
                                            <Legend wrapperStyle={{ fontSize: 12.5 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>

                        <Card className='p-6'>
                            <h3 className='text-[15px] font-semibold text-ink mb-6'>Onboarding funnel</h3>
                            <div className='h-64'>
                                {trendsLoading ? (
                                    <Skeleton className='w-full h-full' />
                                ) : funnelData.every((d) => d.count === 0) ? (
                                    <p className='text-text-secondary text-[13.5px]'>No onboarding activity yet.</p>
                                ) : (
                                    <ResponsiveContainer width='100%' height='100%'>
                                        <BarChart data={funnelData} layout='vertical'>
                                            <CartesianGrid strokeDasharray='3 3' stroke='var(--color-line)' />
                                            <XAxis type='number' allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                                            <YAxis type='category' dataKey='stage' tick={axisTick} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} width={90} />
                                            <Tooltip contentStyle={chartTooltipStyle} />
                                            <Bar dataKey='count' fill='#c4161f' radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {canViewActivity && (
                <Card className='p-6'>
                    <h3 className='text-[15px] font-semibold text-ink mb-5'>Recent Activity</h3>
                    {activityError ? (
                        <p className='text-[13.5px] text-red-500'>{activityError}</p>
                    ) : activity === null ? (
                        <SkeletonText lines={4} />
                    ) : activity.length === 0 ? (
                        <p className='text-text-secondary text-[13.5px]'>No recent activity yet.</p>
                    ) : (
                        <div className='space-y-1'>
                            {activity.map((item) => (
                                <Link
                                    key={item.id}
                                    to={`/platform/admin/onboarding/${item.id}`}
                                    className='flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors'
                                >
                                    <div className='min-w-0'>
                                        <p className='text-[13.5px] text-ink font-medium truncate'>{item.name || 'Untitled'}</p>
                                        <p className='text-[12px] text-text-secondary flex items-center gap-1 mt-0.5'>
                                            <Clock size={11} /> {new Date(item.updatedAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <Badge variant={ACTIVITY_STATUS_VARIANT[item.status] || 'neutral'}>{item.status?.replace(/_/g, ' ').toLowerCase()}</Badge>
                                </Link>
                            ))}
                        </div>
                    )}
                </Card>
            )}
        </AdminShell>
    )
}

export default AdminDashboard
