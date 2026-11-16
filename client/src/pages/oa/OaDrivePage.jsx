import React, { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion as M } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, BarChart3, Bot, CalendarClock, ClipboardCheck, ListChecks, Lock, Pencil, Plus, Radio, Rocket, RotateCcw, Users } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import Button from '../../components/Button'
import Badge from '../../components/ui/Badge'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { AssessmentStatus, ErrorState, PageHeader, PhaseBadge } from '../../components/oa/oaUi'
import { formatDate, formatDateTime } from '../../components/oa/oaFormat'
import { TextField } from '../../components/oa/oaFields'
import { FILTERS, LIMITS, lengthError } from '../../components/oa/oaRules'
import { DriveStepper, StepFooter, StepIntro } from '../../components/oa/DriveStepper'
import AddRoundModal from '../../components/oa/AddRoundModal'
import PublishStep from '../../components/oa/PublishStep'
import AiInterviewRound from '../../components/oa/AiInterviewRound'
import RoundKindChoice from '../../components/oa/RoundKindChoice'
import SetupTab from '../../components/oa/SetupTab'
import QuestionsTab from '../../components/oa/QuestionsTab'
import StudentsTab from '../../components/oa/StudentsTab'
import LiveTab from '../../components/oa/LiveTab'
import ResultsTab from '../../components/oa/ResultsTab'

const MAX_ROUNDS = 10
const NOT_STARTED = 'Opens as soon as the first candidate starts the test'

const roundState = (r) => r.status === 'ARCHIVED' ? 'Archived' : r.kind === 'AI_INTERVIEW' ? 'AI interview' : r.status === 'DRAFT' ? 'Draft' : ['OPEN', 'CLOSED_TO_ENTRY'].includes(r.phase) ? 'Live' : r.phase === 'ENDED' ? 'Ended' : 'Published'

// Round 1, Round 2, ... side by side: pick one to work on it.
function RoundRail({ rounds, current, onSelect, onAdd, canAdd, addReason }) {
    return (
        <div className='flex items-stretch gap-2 overflow-x-auto pb-1 mb-5' role='tablist' aria-label='Rounds of this drive'>
            {rounds.map((r) => {
                const active = r.id === current
                const Icon = r.kind === 'AI_INTERVIEW' ? Bot : ClipboardCheck
                const state = roundState(r)
                return (
                    <button key={r.id} type='button' role='tab' aria-selected={active} onClick={() => onSelect(r.id)}
                        className={`relative shrink-0 min-w-[168px] max-w-[240px] text-left rounded-2xl border-2 px-3.5 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${active ? 'border-accent bg-card' : 'border-line bg-card hover:border-accent/40'}`}>
                        {active && <M.span layoutId='oa-round-active' aria-hidden='true' className='absolute inset-x-3 -bottom-[2px] h-[3px] rounded-full bg-accent' transition={{ type: 'spring', duration: 0.45, bounce: 0.2 }} />}
                        <span className='flex items-center gap-2'>
                            <span className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${active ? 'bg-accent text-white' : 'bg-surface-muted text-text-secondary'}`} aria-hidden='true'><Icon size={16} strokeWidth={1.9} /></span>
                            <span className='min-w-0'>
                                <span className={`block text-[13.5px] font-bold ${active ? 'text-ink' : 'text-text-secondary'}`}>Round {r.roundNumber}</span>
                                <span className='block text-[12px] text-text-secondary truncate'>{r.name || (r.kind === 'AI_INTERVIEW' ? 'AI interview' : 'Online test')}</span>
                            </span>
                        </span>
                        <span className={`mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${state === 'Archived' ? 'text-[var(--color-danger)]' : ['Live', 'Published'].includes(state) ? 'text-[var(--color-success)]' : 'text-text-secondary'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full bg-current ${state === 'Live' ? 'oa-ring' : ''}`} aria-hidden='true' />{state}{r.kind !== 'AI_INTERVIEW' || r.stats.candidates ? ` · ${r.stats.candidates} candidate${r.stats.candidates === 1 ? '' : 's'}` : ''}
                        </span>
                    </button>
                )
            })}
            <button type='button' onClick={onAdd} disabled={!canAdd} title={canAdd ? undefined : addReason}
                className='shrink-0 min-w-[132px] rounded-2xl border-2 border-dashed border-line px-3.5 py-2.5 flex flex-col items-center justify-center gap-1 text-[13px] font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:text-text-secondary'>
                <Plus size={18} aria-hidden='true' /> Add round
            </button>
        </div>
    )
}

const TEST_STEPS = {
    questions: [ListChecks, 'Add the questions', 'Write them, upload a file or let AI draft them. Group them into sections if you like.'],
    candidates: [Users, 'Add the candidates', 'Upload a CSV or type them in. Each candidate gets a personal access code.'],
    schedule: [CalendarClock, 'Set the schedule and the rules', 'Choose when the test is open, how long it lasts and how strictly it is proctored.'],
    publish: [Rocket, 'Publish and invite', 'One last check, then publish the round and send the invitations.'],
    live: [Radio, 'Watch the test live', 'See who is in the test room right now and any proctoring alerts.'],
    results: [BarChart3, 'Read the results', 'Scores, ranks and proctoring evidence for every candidate. Move the qualifiers to the next round from here.'],
}

// The six steps of an online test round.
function TestRound({ assessment: a, driveArchived, step, onStep, onNextRound }) {
    const started = (a.stats?.started || 0) > 0
    const scheduled = Boolean(a.schedule?.startAt && a.schedule?.endAt)
    const published = a.status === 'PUBLISHED'
    const steps = [
        { id: 'questions', label: 'Questions', done: a.questionCount > 0 },
        { id: 'candidates', label: 'Candidates', done: (a.stats?.students || 0) > 0 },
        { id: 'schedule', label: 'Schedule & rules', done: scheduled },
        { id: 'publish', label: 'Publish & invite', done: published },
        { id: 'live', label: 'Live', done: started && a.phase === 'ENDED', locked: !started, lockReason: NOT_STARTED },
        { id: 'results', label: 'Results', done: (a.stats?.finished || 0) > 0 && a.phase === 'ENDED', locked: !started, lockReason: NOT_STARTED },
    ]
    // Where to land: the step asked for, else the first thing still to do.
    const fallback = started ? (a.phase === 'ENDED' || a.status === 'ARCHIVED' ? 'results' : 'live') : steps.slice(0, 4).find((s) => !s.done)?.id || 'publish'
    const current = steps.find((s) => s.id === step && !s.locked)?.id || fallback
    const index = steps.findIndex((s) => s.id === current)
    const [Icon, title, text] = TEST_STEPS[current]

    return (
        <>
            <DriveStepper steps={steps} current={current} onSelect={onStep} />
            <StepIntro number={index + 1} total={steps.length} icon={Icon} title={title} text={text}
                aside={<span className='inline-flex flex-wrap items-center gap-2'><AssessmentStatus status={a.status} />{published && <PhaseBadge phase={a.phase} />}</span>} />
            {a.locked && ['questions', 'schedule'].includes(current) && (
                <div role='status' className='mb-5 flex items-start gap-2.5 text-[13px] bg-[var(--color-warning-soft)] text-[var(--color-warning)] rounded-xl px-4 py-3'>
                    <Lock size={15} className='mt-0.5 shrink-0' aria-hidden='true' />Candidates have started this test, so its questions, sections, rules and schedule are locked to keep the results fair.
                </div>
            )}
            <AnimatePresence mode='wait' initial={false}>
                <M.div key={current} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: [0.2, 0.75, 0.2, 1] }}>
                    {current === 'questions' && <QuestionsTab assessment={a} />}
                    {current === 'candidates' && <StudentsTab assessment={a} />}
                    {current === 'schedule' && <SetupTab assessment={a} />}
                    {current === 'publish' && <PublishStep assessment={a} driveArchived={driveArchived} goTo={onStep} />}
                    {current === 'live' && <LiveTab assessment={a} />}
                    {current === 'results' && <ResultsTab assessment={a} onNextRound={onNextRound} />}
                </M.div>
            </AnimatePresence>
            <StepFooter previous={steps[index - 1]} next={steps[index + 1]} onSelect={onStep}
                note={steps[index + 1]?.locked ? `Step ${index + 2} ${NOT_STARTED.toLowerCase()}.` : undefined} />
        </>
    )
}

// Loads one round in full (the drive only carries a summary of each) and shows the right set of steps for its kind.
function RoundWorkspace({ roundId, drive, step, onStep, onNextRound }) {
    const { data: a, isLoading, isError, error, refetch } = useQuery({ queryKey: ['oa', 'assessment', roundId], queryFn: () => oaApi.getAssessment(roundId) })
    if (isError) return <ErrorState title='Could not open this round' message={error.message} onRetry={refetch} />
    if (isLoading) return <div className='space-y-4' aria-busy='true' aria-label='Loading the round'><Skeleton className='h-[92px] w-full rounded-2xl' /><Skeleton className='h-20 w-full rounded-2xl' /><Skeleton className='h-64 w-full rounded-2xl' /></div>
    const driveArchived = drive.status === 'ARCHIVED'
    return (
        <>
            {!driveArchived && <KindSwitch assessment={a} />}
            {a.kind === 'AI_INTERVIEW'
                ? <AiInterviewRound assessment={a} driveArchived={driveArchived} step={step} onStep={onStep} />
                : <TestRound assessment={a} driveArchived={driveArchived} step={step} onStep={onStep} onNextRound={onNextRound} />}
        </>
    )
}

// While a round is an empty draft its type can still be changed; once it has questions or candidates have started, it is fixed.
function KindSwitch({ assessment: a }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const change = useMutation({
        mutationFn: (kind) => oaApi.updateAssessment(a.id, { kind }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['oa'] }); toast.success('Round type changed.') },
        onError: (err) => toast.error(err.message),
    })
    if (a.status !== 'DRAFT' || a.locked || a.questionCount > 0) return null
    return (
        <div className='mb-5 rounded-2xl border border-line bg-card p-4' aria-busy={change.isPending}>
            <p className='text-[13px] font-bold text-ink mb-0.5'>Type of this round</p>
            <p className='text-[12.5px] text-text-secondary mb-3'>You can change it until you add questions.</p>
            <fieldset disabled={change.isPending}><RoundKindChoice value={a.kind} onChange={(kind) => kind !== a.kind && change.mutate(kind)} name={`kind-${a.id}`} /></fieldset>
        </div>
    )
}

function RenameModal({ drive, onClose }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [title, setTitle] = useState(drive.title)
    const [serverError, setServerError] = useState('')
    const problem = lengthError(title, { ...LIMITS.title, label: 'The name' })
    const save = useMutation({
        mutationFn: () => oaApi.updateDrive(drive.id, { title: title.trim() }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['oa'] }); toast.success('Drive renamed.'); onClose() },
        onError: (err) => setServerError(err.fields?.title || err.message),
    })
    const submit = (e) => { e?.preventDefault(); if (!problem && !save.isPending) save.mutate() }
    return (
        <Modal open onClose={onClose} title='Rename this drive' size='sm'
            footer={<><Button variant='secondary' size='sm' onClick={onClose}>Cancel</Button><Button size='sm' disabled={save.isPending || Boolean(problem) || title.trim() === drive.title} onClick={submit}>{save.isPending ? 'Saving…' : 'Save'}</Button></>}>
            <form onSubmit={submit}>
                <TextField autoFocus label='Name of the drive' filter={FILTERS.title} value={title} onChange={(v) => { setTitle(v); setServerError('') }} max={LIMITS.title.max} error={serverError || problem} forceError />
            </form>
        </Modal>
    )
}

/** One drive: its rounds across the top, and the numbered steps of the round in view below. */
export default function OaDrivePage() {
    const { id } = useParams()
    const toast = useToast()
    const queryClient = useQueryClient()
    const [params, setParams] = useSearchParams()
    const [renaming, setRenaming] = useState(false)
    const [confirm, setConfirm] = useState(null)
    const [adding, setAdding] = useState(null)

    const { data: drive, isLoading, isError, error, refetch } = useQuery({ queryKey: ['oa', 'drive', id], queryFn: () => oaApi.getDrive(id) })
    const setStatus = useMutation({
        mutationFn: (status) => oaApi.updateDrive(id, { status }),
        onSuccess: (_, status) => { queryClient.invalidateQueries({ queryKey: ['oa'] }); setConfirm(null); toast.success(status === 'ARCHIVED' ? 'Drive archived.' : 'Drive restored. Its rounds stay archived until you restore each one.') },
        onError: (err) => { setConfirm(null); toast.error(err.message) },
    })

    if (isError) return error.status === 404 ? <Navigate to='/oa/admin/drives' replace /> : <ErrorState title='Could not open this drive' message={error.message} onRetry={refetch} />
    if (isLoading) return <div className='space-y-4' aria-busy='true' aria-label='Loading the drive'><Skeleton className='h-8 w-1/2' /><Skeleton className='h-[76px] w-full rounded-2xl' /><Skeleton className='h-64 w-full rounded-2xl' /></div>

    const archived = drive.status === 'ARCHIVED'
    const rounds = drive.rounds
    const round = rounds.find((r) => r.id === params.get('round')) || rounds[rounds.length - 1]
    const go = (patch) => setParams((p) => { const next = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k))); return next })
    const selectRound = (roundId) => setParams({ round: roundId })
    const full = rounds.length >= MAX_ROUNDS

    return (
        <>
            <PageHeader
                back={<Link to='/oa/admin/drives' className='inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-ink mb-2'><ArrowLeft size={14} /> All drives</Link>}
                title={<span className='inline-flex flex-wrap items-center gap-x-2.5 gap-y-1'>{drive.title}
                    {!archived && <button type='button' onClick={() => setRenaming(true)} aria-label='Rename this drive' title='Rename' className='inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10'><Pencil size={15} /></button>}</span>}
                subtitle={<span className='inline-flex flex-wrap items-center gap-2'><Badge variant={archived ? 'danger' : 'success'}>{archived ? 'Archived' : 'Active'}</Badge>
                    <span title={formatDateTime(drive.createdAt)}>Created {formatDate(drive.createdAt)}</span><span aria-hidden='true'>·</span><span>{rounds.length} round{rounds.length === 1 ? '' : 's'}</span></span>}
                actions={archived
                    ? <Button size='sm' variant='secondary' disabled={setStatus.isPending} onClick={() => setStatus.mutate('ACTIVE')}><RotateCcw size={15} /> {setStatus.isPending ? 'Restoring…' : 'Restore drive'}</Button>
                    : <Button size='sm' variant='ghost' onClick={() => setConfirm('archive')}><Archive size={15} /> Archive drive</Button>}
            />

            {archived && <div role='status' className='mb-5 text-[13px] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-xl px-4 py-3'>This drive is archived. Candidates cannot sign in to any of its rounds. Results stay stored.</div>}

            <RoundRail rounds={rounds} current={round?.id} onSelect={selectRound} onAdd={() => setAdding('ANY')} canAdd={!archived && !full}
                addReason={archived ? 'Restore the drive to add a round' : `A drive can have at most ${MAX_ROUNDS} rounds`} />

            {round
                ? <RoundWorkspace key={round.id} roundId={round.id} drive={drive} step={params.get('step')} onStep={(step) => go({ round: round.id, step })} onNextRound={archived || full ? undefined : () => setAdding('QUALIFIED')} />
                : <ErrorState title='This drive has no rounds' message='Add a round to get started.' />}

            {renaming && <RenameModal drive={drive} onClose={() => setRenaming(false)} />}
            <AddRoundModal open={Boolean(adding)} drive={drive} preset={adding === 'QUALIFIED' ? 'QUALIFIED' : undefined} onClose={() => setAdding(null)}
                onAdded={(made) => { setAdding(null); queryClient.invalidateQueries({ queryKey: ['oa'] }); setParams({ round: made.assessmentId }) }} />
            <ConfirmModal open={confirm === 'archive'} onClose={() => setConfirm(null)} title='Archive this drive?' danger confirmLabel='Archive drive' onConfirm={() => setStatus.mutateAsync('ARCHIVED').catch(() => {})}>
                All {rounds.length} round{rounds.length === 1 ? '' : 's'} of "{drive.title}" are archived with it, and candidates can no longer sign in. Results stay stored and you can restore the drive later.
            </ConfirmModal>
        </>
    )
}
