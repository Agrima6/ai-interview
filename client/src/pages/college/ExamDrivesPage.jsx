import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, GraduationCap } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CreateExamModal from '../../components/college/CreateExamModal'
import { ExamStatusBadge } from '../../components/college/ExamStatusBadge'
import { Card, Button, SearchInput, Tabs, Skeleton, EmptyState, useToast } from '../../components/ui'
import { listInterviewDrives } from '../../api/organization/organizationApi'
import { examStats } from '../../utils/collegeStats'
import { formatEnumLabel } from '../../utils/formatEnumLabel'

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const TABS = [
    { id: 'ALL', label: 'All exams' },
    { id: 'ACTIVE', label: 'Open' },
    { id: 'COMPLETED', label: 'Closed' },
    { id: 'ARCHIVED', label: 'Archived' },
]

function ExamDrivesPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const [drives, setDrives] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [tab, setTab] = useState('ALL')
    const [search, setSearch] = useState('')
    const [createOpen, setCreateOpen] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const { items } = await listInterviewDrives({ pageSize: 100 })
            setDrives(items)
        } catch (err) {
            setError(err.message || 'Could not load exams.')
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => { load() }, [load])

    const rows = useMemo(() => drives
        .filter((d) => tab === 'ALL' || d.status === tab)
        .filter((d) => !search.trim() || `${d.title} ${d.department}`.toLowerCase().includes(search.trim().toLowerCase()))
        .map((d) => ({ drive: d, stats: examStats(d) })), [drives, tab, search])

    return (
        <OrganizationLayout
            title="Exam Drives"
            description="Run an exam for your students and see how each one did."
            action={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Create exam</Button>}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <Tabs tabs={TABS} value={tab} onChange={setTab} />
                <div className="w-full sm:w-72"><SearchInput placeholder="Search exams or branches..." value={search} onChange={setSearch} /></div>
            </div>

            {loading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[72px]" />)}</div>
            ) : error ? (
                <Card className="p-10 text-center space-y-3">
                    <p className="text-[14px] text-red-600">{error}</p>
                    <Button variant="secondary" onClick={load}>Try again</Button>
                </Card>
            ) : rows.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={GraduationCap}
                        title={drives.length ? 'No exams match' : 'No exams yet'}
                        description={drives.length ? 'Try a different filter or search.' : 'Create your first exam, add your students, and they will be invited by email.'}
                        actionLabel={drives.length ? undefined : 'Create exam'}
                        onAction={() => setCreateOpen(true)}
                    />
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13.5px]">
                            <thead>
                                <tr className="text-left text-[12px] uppercase tracking-wide text-text-secondary border-b border-line">
                                    <th className="px-5 py-3 font-medium">Exam</th>
                                    <th className="px-3 py-3 font-medium">Window</th>
                                    <th className="px-3 py-3 font-medium text-right">Students</th>
                                    <th className="px-3 py-3 font-medium text-right">Completed</th>
                                    <th className="px-3 py-3 font-medium text-right">Avg score</th>
                                    <th className="px-3 py-3 font-medium text-right">Pass rate</th>
                                    <th className="px-5 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(({ drive, stats }) => (
                                    <tr
                                        key={drive._id || drive.id}
                                        onClick={() => navigate(`/college/drives/${drive._id || drive.id}`)}
                                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/college/drives/${drive._id || drive.id}`)}
                                        tabIndex={0}
                                        className="border-b border-line last:border-0 hover:bg-black/[0.02] cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                                    >
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-ink">{drive.title}</p>
                                            <p className="text-[12.5px] text-text-secondary">{drive.department} · {formatEnumLabel(drive.roleCategory)}</p>
                                        </td>
                                        <td className="px-3 py-3.5 text-text-secondary whitespace-nowrap">{fmt(drive.startDate)} – {fmt(drive.expiryDate)}</td>
                                        <td className="px-3 py-3.5 text-right tabular-nums">{stats.enrolled}</td>
                                        <td className="px-3 py-3.5 text-right tabular-nums">{stats.completed}</td>
                                        <td className="px-3 py-3.5 text-right tabular-nums">{stats.avgScore ?? '—'}</td>
                                        <td className="px-3 py-3.5 text-right tabular-nums">{stats.passRate == null ? '—' : `${stats.passRate}%`}</td>
                                        <td className="px-5 py-3.5"><ExamStatusBadge status={drive.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <CreateExamModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={(drive) => { toast.success('Exam created. Add your students to send the invites.'); navigate(`/college/drives/${drive._id || drive.id}`) }}
            />
        </OrganizationLayout>
    )
}

export default ExamDrivesPage
