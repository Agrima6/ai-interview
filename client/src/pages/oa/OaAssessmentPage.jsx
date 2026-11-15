import React, { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Archive, CheckCircle2, Circle, Rocket, Undo2 } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import Button from '../../components/Button'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Skeleton from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { AssessmentStatus, ErrorState, PageHeader, PhaseBadge } from '../../components/oa/oaUi'
import { formatDateTime } from '../../components/oa/oaFormat'
import SetupTab from '../../components/oa/SetupTab'
import QuestionsTab from '../../components/oa/QuestionsTab'
import StudentsTab from '../../components/oa/StudentsTab'
import LiveTab from '../../components/oa/LiveTab'
import ResultsTab from '../../components/oa/ResultsTab'

const TABS = [
    { id: 'setup', label: 'Setup' }, { id: 'questions', label: 'Questions' }, { id: 'students', label: 'Students' },
    { id: 'live', label: 'Live', published: true }, { id: 'results', label: 'Results', published: true },
]

export default function OaAssessmentPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()
    const queryClient = useQueryClient()
    const [params, setParams] = useSearchParams()
    const [confirm, setConfirm] = useState(null)

    const { data: a, isLoading, isError, error, refetch } = useQuery({ queryKey: ['oa', 'assessment', id], queryFn: () => oaApi.getAssessment(id) })
    const students = useQuery({ queryKey: ['oa', 'assessment', id, 'student-count'], queryFn: () => oaApi.listStudents(id, { pageSize: 10 }), enabled: Boolean(a) })

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['oa'] })
    const act = useMutation({
        mutationFn: ({ kind }) => ({ publish: oaApi.publish, unpublish: oaApi.unpublish, archive: oaApi.archive })[kind](id),
        onSuccess: (_, { kind }) => {
            refresh(); setConfirm(null)
            toast.success({ publish: 'Published. You can now invite students.', unpublish: 'Moved back to draft.', archive: 'Archived.' }[kind])
            if (kind === 'archive') navigate('/oa/admin/assessments')
        },
        onError: (err) => { setConfirm(null); toast.error(err.message) },
    })

    if (isError) return <ErrorState title='Could not open this assessment' message={error.message} onRetry={refetch} />
    if (isLoading) return <div className='space-y-4'><Skeleton className='h-8 w-1/2' /><Skeleton className='h-64 w-full' /></div>

    const published = a.status === 'PUBLISHED'
    const tab = TABS.find((t) => t.id === params.get('tab') && (!t.published || published)) ? params.get('tab') : 'setup'
    const studentCount = students.data?.total ?? 0
    const checklist = [
        [a.questionCount > 0, `${a.questionCount} question${a.questionCount === 1 ? '' : 's'} added`, 'Add at least one question'],
        [Boolean(a.schedule?.startAt && a.schedule?.endAt), 'Date, time and duration set', 'Set the date, start time and duration'],
        [studentCount > 0, `${studentCount} student${studentCount === 1 ? '' : 's'} on the list`, 'Upload your students (you can do this after publishing)'],
    ]
    const ready = checklist[0][0] && checklist[1][0]

    return (
        <>
            <PageHeader
                back={<Link to='/oa/admin/assessments' className='inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-ink mb-2'><ArrowLeft size={14} /> All assessments</Link>}
                title={a.title}
                subtitle={<span className='inline-flex flex-wrap items-center gap-2'><AssessmentStatus status={a.status} />{published && <PhaseBadge phase={a.phase} />}{a.schedule?.startAt && <span>{a.schedule.mode === 'SLOTS' ? `${a.schedule.slots.length} time slot${a.schedule.slots.length === 1 ? '' : 's'}, from ${formatDateTime(a.schedule.startAt, a.schedule.timezone)}` : formatDateTime(a.schedule.startAt, a.schedule.timezone)} · {a.schedule.durationMinutes} min</span>}</span>}
                actions={<>
                    {a.status === 'DRAFT' && <Button size='sm' disabled={!ready || act.isPending} onClick={() => setConfirm('publish')}><Rocket size={15} /> Publish</Button>}
                    {published && !a.locked && <Button size='sm' variant='secondary' onClick={() => setConfirm('unpublish')}><Undo2 size={15} /> Back to draft</Button>}
                    {!a.locked || a.phase === 'ENDED' ? <Button size='sm' variant='ghost' onClick={() => setConfirm('archive')}><Archive size={15} /> Archive</Button> : null}
                </>}
            />

            {a.status === 'DRAFT' && (
                <div className='mb-5 bg-card border border-line rounded-2xl px-5 py-4'>
                    <div className='text-[13px] font-semibold text-ink mb-2'>Before you publish</div>
                    <ul className='grid sm:grid-cols-3 gap-x-6 gap-y-1.5'>
                        {checklist.map(([done, ok, todo]) => (
                            <li key={ok} className={`flex items-start gap-2 text-[13px] ${done ? 'text-ink' : 'text-text-secondary'}`}>
                                {done ? <CheckCircle2 size={16} className='text-[var(--color-success)] mt-0.5 shrink-0' /> : <Circle size={16} className='mt-0.5 shrink-0' />}{done ? ok : todo}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {a.locked && <div role='status' className='mb-5 text-[13px] bg-[var(--color-warning-soft)] text-[var(--color-warning)] rounded-xl px-4 py-3'>Students have started this test, so its questions, sections, rules and schedule are locked to keep the results fair.</div>}

            <div role='tablist' aria-label='Assessment sections' className='flex gap-1 border-b border-line mb-6 overflow-x-auto'>
                {TABS.filter((t) => !t.published || published).map((t) => (
                    <button key={t.id} role='tab' aria-selected={tab === t.id} onClick={() => setParams({ tab: t.id }, { replace: true })}
                        className={`px-4 py-2.5 text-[13.5px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-ink'}`}>{t.label}</button>
                ))}
            </div>

            {tab === 'setup' && <SetupTab assessment={a} />}
            {tab === 'questions' && <QuestionsTab assessment={a} />}
            {tab === 'students' && <StudentsTab assessment={a} />}
            {tab === 'live' && <LiveTab assessment={a} />}
            {tab === 'results' && <ResultsTab assessment={a} />}

            <ConfirmModal open={confirm === 'publish'} onClose={() => setConfirm(null)} title='Publish this assessment?' confirmLabel='Publish' onConfirm={() => act.mutateAsync({ kind: 'publish' })}>
                Students can sign in once you invite them, {a.schedule?.mode === 'SLOTS' ? `and each books one of the ${a.schedule.slots.length} time slots you set (the first is ${formatDateTime(a.schedule.startAt, a.schedule.timezone)})` : `and the test opens at ${formatDateTime(a.schedule?.startAt, a.schedule?.timezone)}`}. After the first student starts, the questions and rules are locked.
            </ConfirmModal>
            <ConfirmModal open={confirm === 'unpublish'} onClose={() => setConfirm(null)} title='Move back to draft?' confirmLabel='Move to draft' onConfirm={() => act.mutateAsync({ kind: 'unpublish' })}>
                Students will not be able to sign in until you publish again. Codes already emailed stay valid.
            </ConfirmModal>
            <ConfirmModal open={confirm === 'archive'} onClose={() => setConfirm(null)} title='Archive this assessment?' danger confirmLabel='Archive' onConfirm={() => act.mutateAsync({ kind: 'archive' })}>
                It disappears from your list and students can no longer sign in. Results stay stored.
            </ConfirmModal>
        </>
    )
}
