import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, UserPlus, Lock, Archive, Users, Mail } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import AddStudentsModal from '../../components/college/AddStudentsModal'
import CandidateDetailModal from '../../components/organization/CandidateDetailModal'
import PublicLinkPopover from '../../components/organization/PublicLinkPopover'
import { ExamStatusBadge, ResultBadge } from '../../components/college/ExamStatusBadge'
import { Card, Button, StatCard, SearchInput, Skeleton, EmptyState, ConfirmModal, useToast } from '../../components/ui'
import { getInterviewDriveById, addCandidatesToDrive, updateDriveStatus, exportDriveResultsCsv, resendInvites } from '../../api/organization/organizationApi'
import { examStats, branchBreakdown, resultOf, studentsOf, passMarkOf } from '../../utils/collegeStats'
import { formatEnumLabel } from '../../utils/formatEnumLabel'

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const INVITE_LABEL = { SENT: 'Sent', OPENED: 'Sent', FAILED: 'Failed', QUEUED: 'Queued', MOCK_SENT: 'Sent' }

function ExamDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()
    const [drive, setDrive] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [addOpen, setAddOpen] = useState(false)
    const [adding, setAdding] = useState(false)
    const [selected, setSelected] = useState(null)
    const [confirm, setConfirm] = useState(null)   // 'close' | 'archive'
    const [busy, setBusy] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [resending, setResending] = useState(() => new Set())   // student ids with a resend in flight

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try { setDrive(await getInterviewDriveById(id)) } catch (err) { setError(err.message || 'Could not load this exam.') } finally { setLoading(false) }
    }, [id])
    useEffect(() => { load() }, [load])

    const passMark = passMarkOf(drive)
    const stats = useMemo(() => (drive ? examStats(drive) : null), [drive])
    const branches = useMemo(() => (drive ? branchBreakdown(drive) : []), [drive])
    // Anyone who has not finished can be invited again.
    const pendingIds = useMemo(() => studentsOf(drive).filter((s) => resultOf(s, passMarkOf(drive)) === 'PENDING').map((s) => s.id), [drive])
    const students = useMemo(() => {
        const q = search.trim().toLowerCase()
        return studentsOf(drive).filter((s) => !q || `${s.name} ${s.email} ${s.rollNumber || ''} ${s.branch || ''}`.toLowerCase().includes(q))
    }, [drive, search])

    // What the exam already holds, so the dialog can flag duplicates before anything is sent.
    const existing = useMemo(() => {
        const list = studentsOf(drive)
        return {
            emails: new Set(list.map((s) => s.email?.toLowerCase()).filter(Boolean)),
            phones: new Set(list.map((s) => s.phone).filter(Boolean)),
            rolls: new Set(list.map((s) => s.rollNumber?.toLowerCase()).filter(Boolean)),
        }
    }, [drive])

    const addStudents = async (list) => {
        if (adding) return
        setAdding(true)
        try {
            const updated = await addCandidatesToDrive(id, list, 1)
            setDrive(updated)
            setAddOpen(false)
            const sum = updated.inviteSummary
            const added = updated.addSummary?.added ?? list.length
            const skippedCount = updated.addSummary?.skipped?.length || 0
            const head = `${added} student${added === 1 ? '' : 's'} added${skippedCount ? `, ${skippedCount} skipped as already on the exam` : ''}.`
            if (sum?.skipped === 'NO_PUBLIC_LINK') toast.warning(`${head} No invites were sent because this exam has no public link.`)
            else if (sum?.failed?.length) toast.warning(`${head} ${sum.failed.length} invite email${sum.failed.length === 1 ? '' : 's'} could not be sent - see the Invite column.`)
            else toast.success(`${head} ${sum?.pending ? 'Invites are being sent.' : 'They were invited by email.'}`)
        } catch (err) {
            toast.error(err.message || 'Could not add the students.')
        } finally {
            setAdding(false)
        }
    }

    // Sends the invite email again. Completed students are never re-invited (the server refuses them too).
    const resend = async (ids) => {
        const fresh = ids.filter((sid) => !resending.has(sid))
        if (fresh.length === 0) return
        setResending((cur) => new Set([...cur, ...fresh]))
        try {
            const res = await resendInvites(id, 1, fresh)
            const failed = res.inviteSummary?.failed?.length || 0
            const skippedCount = res.skipped?.length || 0
            if (res.inviteSummary?.skipped === 'NO_PUBLIC_LINK') toast.warning('No invites were sent because this exam has no public link.')
            else if (failed) toast.warning(`${res.sent - failed} of ${res.sent} invite${res.sent === 1 ? '' : 's'} sent. ${failed} could not be sent - the email service rejected them. Try again, or contact support if it keeps failing.`)
            else toast.success(`${res.sent} invite${res.sent === 1 ? '' : 's'} sent${skippedCount ? `, ${skippedCount} skipped` : ''}.`)
            setDrive(await getInterviewDriveById(id))
        } catch (err) {
            toast.error(err.message || 'Could not send the invite.')
        } finally {
            setResending((cur) => { const next = new Set(cur); fresh.forEach((sid) => next.delete(sid)); return next })
        }
    }

    const changeStatus = async (status) => {
        setBusy(true)
        try {
            setDrive(await updateDriveStatus(id, status))
            toast.success(status === 'ARCHIVED' ? 'Exam archived.' : 'Exam closed. Students can no longer start it.')
        } catch (err) {
            toast.error(err.message || 'Could not update the exam.')
        } finally {
            setBusy(false)
            setConfirm(null)
        }
    }

    const download = async () => {
        if (exporting) return
        setExporting(true)
        try { await exportDriveResultsCsv(id) } catch (err) { toast.error(err.message || 'Could not download the results.') } finally { setExporting(false) }
    }

    if (loading) return <OrganizationLayout title="Exam"><Skeleton className="h-[320px]" /></OrganizationLayout>
    if (error || !drive) {
        return (
            <OrganizationLayout title="Exam">
                <Card className="p-10 text-center space-y-3">
                    <p className="text-[14px] text-red-600">{error || 'Exam not found.'}</p>
                    <div className="flex justify-center gap-2">
                        <Button variant="secondary" onClick={() => navigate('/college/drives')}>Back to exams</Button>
                        <Button onClick={load}>Try again</Button>
                    </div>
                </Card>
            </OrganizationLayout>
        )
    }

    const open = drive.status === 'ACTIVE'
    return (
        <OrganizationLayout
            title={drive.title}
            description={`${drive.department} · ${formatEnumLabel(drive.roleCategory)} · ${fmt(drive.startDate)} – ${fmt(drive.expiryDate)} · Pass mark ${passMark}%`}
            action={
                <div className="flex flex-wrap items-center gap-2">
                    {drive.publicLink && <PublicLinkPopover publicLink={drive.publicLink} />}
                    <Button variant="secondary" size="sm" onClick={download} disabled={exporting || stats.enrolled === 0}><Download size={14} /> {exporting ? 'Preparing...' : 'Results CSV'}</Button>
                    {drive.status !== 'ARCHIVED' && <Button size="sm" onClick={() => setAddOpen(true)} disabled={!open}><UserPlus size={14} /> Add students</Button>}
                </div>
            }
        >
            <button type="button" onClick={() => navigate('/college/drives')} className="inline-flex items-center gap-1.5 text-[13.5px] text-text-secondary hover:text-ink mb-4 min-h-[44px]">
                <ArrowLeft size={15} /> All exams
            </button>

            <div className="flex flex-wrap items-center gap-2 mb-5">
                <ExamStatusBadge status={drive.status} />
                {open && <Button variant="secondary" size="sm" onClick={() => setConfirm('close')}><Lock size={13} /> Close exam</Button>}
                {drive.status !== 'ARCHIVED' && <Button variant="secondary" size="sm" onClick={() => setConfirm('archive')}><Archive size={13} /> Archive</Button>}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard icon={Users} value={stats.enrolled} label="Students" />
                <StatCard value={stats.completed} label="Completed" helperText={stats.pending ? `${stats.pending} yet to finish` : undefined} />
                <StatCard value={stats.avgScore ?? '—'} label="Average score" />
                <StatCard value={stats.passRate == null ? '—' : `${stats.passRate}%`} label="Pass rate" helperText={stats.completed ? `${stats.passed} passed · ${stats.failed} below ${passMark}%` : 'No results yet'} />
                <StatCard value={stats.flagged} label="Integrity flags" helperText="Students with any proctoring flag" />
            </div>

            {branches.length > 1 && (
                <Card className="p-5 mb-6">
                    <h2 className="text-[15px] font-medium text-ink mb-3">By branch</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13.5px]">
                            <thead><tr className="text-left text-[12px] uppercase tracking-wide text-text-secondary"><th className="py-2 font-medium">Branch</th><th className="py-2 font-medium text-right">Students</th><th className="py-2 font-medium text-right">Completed</th><th className="py-2 font-medium text-right">Avg score</th><th className="py-2 font-medium text-right">Pass rate</th></tr></thead>
                            <tbody>{branches.map((b) => (
                                <tr key={b.branch} className="border-t border-line"><td className="py-2.5">{b.branch}</td><td className="py-2.5 text-right tabular-nums">{b.enrolled}</td><td className="py-2.5 text-right tabular-nums">{b.completed}</td><td className="py-2.5 text-right tabular-nums">{b.avgScore ?? '—'}</td><td className="py-2.5 text-right tabular-nums">{b.passRate == null ? '—' : `${b.passRate}%`}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 border-b border-line">
                    <h2 className="text-[15px] font-medium text-ink">Students</h2>
                    {open && pendingIds.length > 0 && (
                        <Button variant="secondary" size="sm" onClick={() => resend(pendingIds)} disabled={pendingIds.some((sid) => resending.has(sid))}>
                            <Mail size={14} /> Resend invite to {pendingIds.length} pending
                        </Button>
                    )}
                    <div className="w-full sm:w-72"><SearchInput placeholder="Search name, roll number, branch..." value={search} onChange={setSearch} /></div>
                </div>
                {studentsOf(drive).length === 0 ? (
                    <EmptyState icon={Users} title="No students yet" description="Add your students and they are invited by email with their login details." actionLabel={open ? 'Add students' : undefined} onAction={() => setAddOpen(true)} />
                ) : students.length === 0 ? (
                    <p className="p-8 text-center text-[13.5px] text-text-secondary">No students match your search.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13.5px]">
                            <thead>
                                <tr className="text-left text-[12px] uppercase tracking-wide text-text-secondary border-b border-line">
                                    <th className="px-5 py-3 font-medium">Roll no.</th><th className="px-3 py-3 font-medium">Student</th><th className="px-3 py-3 font-medium">Branch</th>
                                    <th className="px-3 py-3 font-medium">Invite</th><th className="px-3 py-3 font-medium text-right">Score</th><th className="px-3 py-3 font-medium">Result</th><th className="px-5 py-3 font-medium text-right">Flags</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s) => {
                                    const result = resultOf(s, passMark)
                                    return (
                                        <tr key={s.id} onClick={() => setSelected(s)} onKeyDown={(e) => e.key === 'Enter' && setSelected(s)} tabIndex={0}
                                            className="border-b border-line last:border-0 hover:bg-black/[0.02] cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                                            <td className="px-5 py-3 text-text-secondary">{s.rollNumber || '—'}</td>
                                            <td className="px-3 py-3"><p className="font-medium text-ink">{s.name}</p><p className="text-[12.5px] text-text-secondary">{s.email}</p></td>
                                            <td className="px-3 py-3 text-text-secondary">{s.branch || '—'}</td>
                                            <td className="px-3 py-3 text-text-secondary whitespace-nowrap">
                                                {INVITE_LABEL[s.inviteStatus] || '—'}
                                                {open && result === 'PENDING' && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); resend([s.id]) }}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                        disabled={resending.has(s.id)}
                                                        aria-label={`Resend invite to ${s.name}`}
                                                        className="ml-2 text-[12.5px] font-medium text-accent hover:underline disabled:opacity-50 min-h-[32px]"
                                                    >
                                                        {resending.has(s.id) ? 'Sending...' : 'Resend'}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">{result === 'PENDING' ? '—' : s.aiScore}</td>
                                            <td className="px-3 py-3"><ResultBadge result={result} /></td>
                                            <td className="px-5 py-3 text-right tabular-nums">{s.malpracticeFlags || 0}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {addOpen && <AddStudentsModal open onClose={() => setAddOpen(false)} onSubmit={addStudents} submitting={adding} existing={existing} />}
            {selected && <CandidateDetailModal open candidate={selected} onClose={() => setSelected(null)} examMode passMark={passMark} />}
            <ConfirmModal
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                title={confirm === 'archive' ? 'Archive this exam?' : 'Close this exam?'}
                confirmLabel={confirm === 'archive' ? 'Archive' : 'Close exam'}
                danger={confirm === 'archive'}
                loading={busy}
                onConfirm={() => changeStatus(confirm === 'archive' ? 'ARCHIVED' : 'CLOSED')}
            >
                <p className="text-[13.5px] text-text-secondary leading-relaxed">
                    {confirm === 'archive'
                        ? 'Archived exams are hidden from the active list and students can no longer start them. Results are kept.'
                        : 'Students who have not finished will no longer be able to start. Results already recorded are kept.'}
                </p>
            </ConfirmModal>
        </OrganizationLayout>
    )
}

export default ExamDetailPage
