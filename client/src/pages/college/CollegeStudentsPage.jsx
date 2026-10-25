import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { ResultBadge } from '../../components/college/ExamStatusBadge'
import { Card, Button, SearchInput, Skeleton, Pagination, EmptyState } from '../../components/ui'
import { listAllCandidates } from '../../api/organization/organizationApi'
import { resultOf } from '../../utils/collegeStats'

// Every student across every exam, server-paginated. The result is judged against the pass mark of the exam the
// student belongs to (the row carries it), so the same student can pass one exam and not another.
function CollegeStudentsPage() {
    const navigate = useNavigate()
    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const { items, total: count } = await listAllCandidates({ search: search || undefined, page, limit: pageSize })
            setRows(items || [])
            setTotal(count || 0)
        } catch (err) {
            setError(err.message || 'Could not load students.')
        } finally {
            setLoading(false)
        }
    }, [search, page, pageSize])
    useEffect(() => { load() }, [load])
    useEffect(() => { setPage(1) }, [search, pageSize])

    return (
        <OrganizationLayout title="Students" description="Everyone enrolled in your exams, across all drives.">
            <Card className="p-5">
                <div className="mb-4 w-full sm:w-80"><SearchInput placeholder="Search name, email or roll number..." value={search} onChange={setSearch} /></div>
                {error ? (
                    <div className="py-10 text-center space-y-3"><p className="text-[14px] text-red-600">{error}</p><Button variant="secondary" onClick={load}>Try again</Button></div>
                ) : loading ? (
                    <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
                ) : rows.length === 0 ? (
                    <EmptyState title={search ? 'No students match' : 'No students yet'} description={search ? 'Try a different search.' : 'Add students to an exam and they appear here.'} actionLabel={search ? undefined : 'Go to exams'} onAction={() => navigate('/college/drives')} className="py-10" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13.5px]">
                            <thead><tr className="text-left text-[12px] uppercase tracking-wide text-text-secondary border-b border-line">
                                <th className="py-3 pr-3 font-medium">Roll no.</th><th className="py-3 px-3 font-medium">Student</th><th className="py-3 px-3 font-medium">Branch</th>
                                <th className="py-3 px-3 font-medium">Exam</th><th className="py-3 px-3 font-medium text-right">Score</th><th className="py-3 pl-3 font-medium">Result</th>
                            </tr></thead>
                            <tbody>{rows.map((row) => {
                                const s = row.candidate
                                const result = resultOf(s, row.passingThreshold || 70)
                                return (
                                    <tr key={`${row.driveId}-${s.id}`} onClick={() => navigate(`/college/drives/${row.driveId}`)} className="border-b border-line last:border-0 hover:bg-black/[0.02] cursor-pointer">
                                        <td className="py-3 pr-3 text-text-secondary">{s.rollNumber || '—'}</td>
                                        <td className="py-3 px-3"><p className="font-medium text-ink">{s.name}</p><p className="text-[12.5px] text-text-secondary">{s.email}</p></td>
                                        <td className="py-3 px-3 text-text-secondary">{s.branch || '—'}</td>
                                        <td className="py-3 px-3 text-text-secondary max-w-[240px] truncate">{row.driveTitle}</td>
                                        <td className="py-3 px-3 text-right tabular-nums">{result === 'PENDING' ? '—' : s.aiScore}</td>
                                        <td className="py-3 pl-3"><ResultBadge result={result} /></td>
                                    </tr>
                                )
                            })}</tbody>
                        </table>
                        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
                    </div>
                )}
            </Card>
        </OrganizationLayout>
    )
}

export default CollegeStudentsPage
