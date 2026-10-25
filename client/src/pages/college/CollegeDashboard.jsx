import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, GraduationCap, CalendarClock } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CreateExamModal from '../../components/college/CreateExamModal'
import { ExamStatusBadge, ResultBadge } from '../../components/college/ExamStatusBadge'
import { Card, Button, StatCard, Skeleton, EmptyState, useToast } from '../../components/ui'
import { listInterviewDrives } from '../../api/organization/organizationApi'
import { overallStats, examStats, studentsOf, passMarkOf, resultOf, hasResult } from '../../utils/collegeStats'

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—')

function CollegeDashboard() {
    const navigate = useNavigate()
    const toast = useToast()
    const [drives, setDrives] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [createOpen, setCreateOpen] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try { setDrives((await listInterviewDrives({ pageSize: 100 })).items) } catch (err) { setError(err.message || 'Could not load your exams.') } finally { setLoading(false) }
    }, [])
    useEffect(() => { load() }, [load])

    const totals = useMemo(() => overallStats(drives), [drives])
    const open = useMemo(() => drives.filter((d) => d.status === 'ACTIVE').slice(0, 5), [drives])
    const recent = useMemo(() => drives.flatMap((d) => {
        const passMark = passMarkOf(d)
        return studentsOf(d).filter(hasResult).map((s) => ({ s, exam: d, result: resultOf(s, passMark) }))
    }).sort((a, b) => new Date(b.s.attemptedDate || 0) - new Date(a.s.attemptedDate || 0)).slice(0, 6), [drives])

    return (
        <OrganizationLayout
            title="Dashboard"
            description="Your exams and how your students are doing."
            action={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Create exam</Button>}
        >
            {error ? (
                <Card className="p-10 text-center space-y-3"><p className="text-[14px] text-red-600">{error}</p><Button variant="secondary" onClick={load}>Try again</Button></Card>
            ) : loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px]" />)}</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard icon={GraduationCap} value={totals.activeExams} label="Open exams" helperText={`${totals.exams} in total`} onClick={() => navigate('/college/drives')} />
                        <StatCard value={totals.enrolled} label="Students enrolled" />
                        <StatCard value={totals.completed} label="Exams completed" />
                        <StatCard value={totals.avgScore ?? '—'} label="Average score" helperText={totals.passRate == null ? 'No results yet' : `${totals.passRate}% pass rate`} />
                    </div>

                    <div className="grid lg:grid-cols-5 gap-6">
                        <Card className="lg:col-span-3 overflow-hidden">
                            <div className="flex items-center justify-between p-5 border-b border-line">
                                <h2 className="text-[15px] font-medium text-ink">Open exams</h2>
                                <button type="button" onClick={() => navigate('/college/drives')} className="text-[13px] text-accent font-medium hover:underline min-h-[44px]">View all</button>
                            </div>
                            {open.length === 0 ? (
                                <EmptyState
                                    icon={CalendarClock}
                                    title="No open exams"
                                    description="Create an exam, add your students, and they are invited by email."
                                    actionLabel="Create exam"
                                    onAction={() => setCreateOpen(true)}
                                    className="py-10"
                                />
                            ) : (
                                <ul>
                                    {open.map((d) => {
                                        const st = examStats(d)
                                        return (
                                            <li key={d._id || d.id}>
                                                <button type="button" onClick={() => navigate(`/college/drives/${d._id || d.id}`)} className="w-full text-left px-5 py-4 border-b border-line last:border-0 hover:bg-black/[0.02] flex items-center justify-between gap-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                                                    <span className="min-w-0">
                                                        <span className="block font-medium text-ink truncate">{d.title}</span>
                                                        <span className="block text-[12.5px] text-text-secondary">{d.department} · closes {fmt(d.expiryDate)}</span>
                                                    </span>
                                                    <span className="text-right shrink-0">
                                                        <span className="block text-[13.5px] tabular-nums text-ink">{st.completed}/{st.enrolled} done</span>
                                                        <ExamStatusBadge status={d.status} />
                                                    </span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </Card>

                        <Card className="lg:col-span-2 overflow-hidden">
                            <div className="p-5 border-b border-line"><h2 className="text-[15px] font-medium text-ink">Recent results</h2></div>
                            {recent.length === 0 ? (
                                <p className="p-8 text-center text-[13.5px] text-text-secondary">Results appear here as students finish their exams.</p>
                            ) : (
                                <ul>
                                    {recent.map(({ s, exam, result }) => (
                                        <li key={`${exam._id || exam.id}-${s.id}`} className="px-5 py-3.5 border-b border-line last:border-0 flex items-center justify-between gap-3">
                                            <span className="min-w-0"><span className="block text-[13.5px] font-medium text-ink truncate">{s.name}</span><span className="block text-[12px] text-text-secondary truncate">{exam.title}</span></span>
                                            <span className="flex items-center gap-2 shrink-0"><span className="text-[13.5px] tabular-nums">{s.aiScore}</span><ResultBadge result={result} /></span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                </>
            )}

            <CreateExamModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={(drive) => { toast.success('Exam created. Add your students to send the invites.'); navigate(`/college/drives/${drive._id || drive.id}`) }}
            />
        </OrganizationLayout>
    )
}

export default CollegeDashboard
