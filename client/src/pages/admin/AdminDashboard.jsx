import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ListChecks, Send, CheckCircle2, TrendingUp, Plus, Library, Users, Award } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Button from '../../components/Button'
import AdminNav from './AdminNav'
import { Card, Badge, PageHeader, Skeleton } from './adminUi'
import { listInterviewTemplates, listInvites } from '../../utils/conductApi'
import { getTrends } from '../../utils/adminApi'

function StatCard({ icon: Icon, label, value }) {
    return (
        <Card className='p-5'>
            <div className='flex items-center gap-2 text-text-secondary text-[12.5px] mb-3'>
                <Icon size={14} /> {label}
            </div>
            <p className='text-[26px] font-bold text-ink'>{value}</p>
        </Card>
    )
}

function AdminDashboard() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const organizationId = searchParams.get('organizationId') || undefined

    const [templates, setTemplates] = useState([])
    const [invites, setInvites] = useState([])
    const [trends, setTrends] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setError('')
            try {
                const [t, i, tr] = await Promise.all([
                    listInterviewTemplates(organizationId),
                    listInvites(organizationId),
                    getTrends(organizationId).catch(() => null),
                ])
                setTemplates(t)
                setInvites(i)
                setTrends(tr)
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load dashboard data.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [organizationId])

    const totalInvites = invites.length
    const completed = invites.filter((i) => i.status === 'completed').length
    const completionRate = totalInvites ? Math.round((completed / totalInvites) * 100) : 0

    // Simple funnel: count invites that have reached at least this stage
    const stageRank = { pending: 0, sent: 1, opened: 2, started: 3, completed: 4, expired: 1 }
    const funnel = ['sent', 'opened', 'started', 'completed'].map((stage) => ({
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: invites.filter((i) => (stageRank[i.status] ?? 0) >= stageRank[stage]).length,
    }))

    const recentInvites = [...invites].slice(0, 8)

    return (
        <div className='min-h-screen bg-bg flex flex-col'>
            <Navbar />
            <div className='flex-1 bg-noise'>
                <div className='max-w-[1280px] mx-auto px-6 py-16'>
                    <PageHeader
                        title="Admin Dashboard"
                        subtitle="An overview of your interview templates, invites and outcomes"
                        actions={
                            <>
                                <Button variant="secondary" onClick={() => navigate('/admin/question-banks')} className='!px-5'>
                                    <Library size={16} /> Question Banks
                                </Button>
                                <Button onClick={() => navigate('/admin/invites')} className='!px-5'>
                                    <Plus size={16} /> Invite Candidate
                                </Button>
                            </>
                        }
                    />

                    <AdminNav />

                    {loading ? (
                        <div className='space-y-6'>
                            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                                {[...Array(4)].map((_, i) => <Skeleton key={i} className='h-24' />)}
                            </div>
                            <Skeleton className='h-72' />
                        </div>
                    ) : error ? (
                        <p className='text-red-500 text-[14px]'>{error}</p>
                    ) : (
                        <div className='space-y-6'>
                            <div className='grid grid-cols-2 lg:grid-cols-5 gap-4'>
                                <StatCard icon={ListChecks} label="Templates" value={templates.length} />
                                <StatCard icon={Send} label="Invites Sent" value={totalInvites} />
                                <StatCard icon={CheckCircle2} label="Completion Rate" value={`${completionRate}%`} />
                                <StatCard icon={TrendingUp} label="Completed Interviews" value={completed} />
                                <StatCard icon={Award} label="Org Avg Score" value={trends ? `${trends.avgScore ?? 0}` : '-'} />
                            </div>

                            <Card className='p-6'>
                                <h3 className='text-[15px] font-semibold text-ink mb-6'>Invite Funnel</h3>
                                <div className='h-64'>
                                    {totalInvites === 0 ? (
                                        <p className='text-text-secondary text-[13.5px]'>No invites sent yet.</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={funnel}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }} />
                                                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </Card>

                            <div>
                                <h3 className='text-[15px] font-semibold text-ink mb-4'>Recent Activity</h3>
                                {recentInvites.length === 0 ? (
                                    <Card className='p-6'>
                                        <p className='text-text-secondary text-[13.5px]'>No recent invites yet.</p>
                                    </Card>
                                ) : (
                                    <Card className='divide-y divide-line'>
                                        {recentInvites.map((inv) => (
                                            <div key={inv._id} className='p-4 flex items-center justify-between gap-4 flex-wrap'>
                                                <div>
                                                    <p className='text-[14px] font-medium text-ink'>{inv.candidateName || inv.candidateEmail}</p>
                                                    <p className='text-[12.5px] text-text-secondary'>{inv.templateId?.title || 'Interview'} &bull; {new Date(inv.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <Badge tone={inv.status}>{inv.status}</Badge>
                                            </div>
                                        ))}
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default AdminDashboard
