import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { ExamStatusBadge } from '../../components/college/ExamStatusBadge'
import { Card, Button, StatCard, Skeleton, EmptyState, useToast } from '../../components/ui'
import { listInterviewDrives, exportCandidatesCsv } from '../../api/organization/organizationApi'
import { overallStats, examStats } from '../../utils/collegeStats'

function CollegeResultsPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const [drives, setDrives] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [exporting, setExporting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try { setDrives((await listInterviewDrives({ pageSize: 100 })).items) } catch (err) { setError(err.message || 'Could not load results.') } finally { setLoading(false) }
    }, [])
    useEffect(() => { load() }, [load])

    const totals = useMemo(() => overallStats(drives), [drives])
    const rows = useMemo(() => drives.map((d) => ({ d, st: examStats(d) })).filter((r) => r.st.enrolled > 0), [drives])

    const exportAll = async () => {
        if (exporting) return
        setExporting(true)
        try { await exportCandidatesCsv({}) } catch (err) { toast.error(err.message || 'Could not download the file.') } finally { setExporting(false) }
    }

    return (
        <OrganizationLayout
            title="Results"
            description="How your students performed across every exam."
            action={<Button variant="secondary" onClick={exportAll} disabled={exporting || rows.length === 0}><Download size={14} /> {exporting ? 'Preparing...' : 'All students CSV'}</Button>}
        >
            {error ? (
                <Card className="p-10 text-center space-y-3"><p className="text-[14px] text-red-600">{error}</p><Button variant="secondary" onClick={load}>Try again</Button></Card>
            ) : loading ? (
                <Skeleton className="h-[260px]" />
            ) : rows.length === 0 ? (
                <Card><EmptyState title="No results yet" description="Once students are added to an exam and finish it, their results show up here." actionLabel="Go to exams" onAction={() => navigate('/college/drives')} /></Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard value={totals.exams} label="Exams" />
                        <StatCard value={totals.enrolled} label="Students" />
                        <StatCard value={totals.avgScore ?? '—'} label="Average score" />
                        <StatCard value={totals.passRate == null ? '—' : `${totals.passRate}%`} label="Pass rate" helperText={totals.flagged ? `${totals.flagged} integrity flag${totals.flagged === 1 ? '' : 's'}` : undefined} />
                    </div>
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13.5px]">
                                <thead><tr className="text-left text-[12px] uppercase tracking-wide text-text-secondary border-b border-line">
                                    <th className="px-5 py-3 font-medium">Exam</th><th className="px-3 py-3 font-medium text-right">Students</th><th className="px-3 py-3 font-medium text-right">Completed</th>
                                    <th className="px-3 py-3 font-medium text-right">Avg score</th><th className="px-3 py-3 font-medium text-right">Pass rate</th><th className="px-5 py-3 font-medium">Status</th>
                                </tr></thead>
                                <tbody>{rows.map(({ d, st }) => (
                                    <tr key={d._id || d.id} onClick={() => navigate(`/college/drives/${d._id || d.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/college/drives/${d._id || d.id}`)} tabIndex={0}
                                        className="border-b border-line last:border-0 hover:bg-black/[0.02] cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                                        <td className="px-5 py-3.5 font-medium text-ink">{d.title}</td>
                                        <td className="px-3 py-3.5 text-right tabular-nums">{st.enrolled}</td><td className="px-3 py-3.5 text-right tabular-nums">{st.completed}</td>
                                        <td className="px-3 py-3.5 text-right tabular-nums">{st.avgScore ?? '—'}</td><td className="px-3 py-3.5 text-right tabular-nums">{st.passRate == null ? '—' : `${st.passRate}%`}</td>
                                        <td className="px-5 py-3.5"><ExamStatusBadge status={d.status} /></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </OrganizationLayout>
    )
}

export default CollegeResultsPage
