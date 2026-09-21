import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Briefcase, CalendarClock, LogOut, PlayCircle, Clock, CheckCircle2, XCircle, AlertCircle,
    Sparkles, Video, FileText, ChevronRight, ArrowRight, Search, Zap, Lock, RefreshCw, Inbox,
} from 'lucide-react'
import { Card, Badge, Skeleton, EmptyState, Button, Pagination } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth.jsx'
import { getMyInterviews } from '../../api/organization/organizationApi'
import CompleteApplicationModal from '../../components/candidate/CompleteApplicationModal'
import RescheduleSlotModal from '../../components/candidate/RescheduleSlotModal'
import DeviceCheckModal from '../../components/candidate/DeviceCheckModal'
import useNow from '../../hooks/useNow'
import { formatCountdown, getSlotGate } from '../../utils/slotRules'
import logo from '../../assets/logo.png'

const STATUS_CONFIG = {
    INVITED: { variant: 'neutral', label: 'Invited' },
    SCHEDULED: { variant: 'info', label: 'Scheduled' },
    SHORTLISTED: { variant: 'success', label: 'Shortlisted' },
    COMPLETED: { variant: 'info', label: 'Completed' },
    REJECTED: { variant: 'danger', label: 'Not Selected' },
}

const PAGE_SIZES = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 20

// One place decides which tab an interview belongs to, so the counters, the tabs and the cards agree.
// (Completed interviews used to stay "Upcoming" because their status was never moved on from SCHEDULED.)
// aiScore defaults to 0 on every candidate record, so only a real (non-zero) score counts as "scored".
const hasScore = (i) => Number(i.aiScore) > 0
const isCompleted = (i) =>
    i.candidateStatus !== 'REJECTED' &&
    (i.candidateStatus === 'COMPLETED' || i.candidateStatus === 'SHORTLISTED' || Boolean(i.attemptedDate) || hasScore(i))
const isNotSelected = (i) => i.candidateStatus === 'REJECTED'
const isPending = (i) => i.isPendingApplication && !isCompleted(i) && !isNotSelected(i)
const isUpcoming = (i) => !i.isPendingApplication && !isCompleted(i) && !isNotSelected(i)

const TABS = [
    { id: 'ALL', label: 'All Drives', match: () => true },
    { id: 'PENDING', label: 'Action Needed', match: isPending },
    { id: 'UPCOMING', label: 'Upcoming & Live', match: isUpcoming },
    { id: 'COMPLETED', label: 'Completed', match: isCompleted },
    { id: 'REJECTED', label: 'Not Selected', match: isNotSelected },
]

const SORTS = [
    { id: 'SLOT_ASC', label: 'Slot date: soonest first' },
    { id: 'SLOT_DESC', label: 'Slot date: latest first' },
    { id: 'DEADLINE', label: 'Application deadline' },
]

const EMPTY_COPY = {
    ALL: 'You have not been assigned to any interview drives yet.',
    PENDING: 'No applications currently need your action.',
    UPCOMING: 'You have no scheduled upcoming interviews right now.',
    COMPLETED: 'You have not completed any interviews yet.',
    REJECTED: 'Nothing here - no drives marked as not selected.',
}

const initialsOf = (text) => (text || '?').trim().charAt(0).toUpperCase()

export default function CandidateRoomPage() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const now = useNow(10000) // drives every countdown and live/locked transition without a page reload

    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeFilter, setActiveFilter] = useState('ALL')
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState('SLOT_ASC')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

    const [selectedInterviewForApply, setSelectedInterviewForApply] = useState(null)
    const [reschedulingInterview, setReschedulingInterview] = useState(null)
    const [testingDeviceInterview, setTestingDeviceInterview] = useState(null)

    const fetchInterviews = async () => {
        setLoading(true)
        setError('')
        try {
            setInterviews((await getMyInterviews()) || [])
        } catch (err) {
            setError(err.message || 'Failed to load your interview schedule.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchInterviews() }, [])

    const displayName = user?.displayName || user?.email?.split('@')[0] || 'Candidate'

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const counts = useMemo(() => {
        const result = {}
        TABS.forEach((tab) => { result[tab.id] = interviews.filter(tab.match).length })
        return result
    }, [interviews])

    const visible = useMemo(() => {
        const tab = TABS.find((t) => t.id === activeFilter) || TABS[0]
        const needle = search.trim().toLowerCase()
        const list = interviews.filter((i) => tab.match(i) && (!needle ||
            [i.driveTitle, i.department, i.companyName, i.roundTitle].some((field) => (field || '').toLowerCase().includes(needle))))
        const time = (value, fallback) => (value ? new Date(value).getTime() : fallback)
        return list.sort((a, b) => {
            if (sortBy === 'SLOT_DESC') return time(b.interviewSlot, 0) - time(a.interviewSlot, 0)
            if (sortBy === 'DEADLINE') return time(a.expiryDate, Infinity) - time(b.expiryDate, Infinity)
            return time(a.interviewSlot, Infinity) - time(b.interviewSlot, Infinity)
        })
    }, [interviews, activeFilter, search, sortBy])

    // Any change to what is being listed starts again from page 1 (page size is kept).
    useEffect(() => { setPage(1) }, [activeFilter, search, sortBy])
    const pageCount = Math.max(Math.ceil(visible.length / pageSize), 1)
    const currentPage = Math.min(page, pageCount)
    const pageItems = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const startInterview = (interview) => navigate(`/candidate/interview/${interview.driveId}/${interview.roundNumber}`)

    const driveStillOpen = (i) => i.roundStatus === 'ACTIVE' && (!i.expiryDate || new Date(i.expiryDate).getTime() > now)

    const renderActions = (interview) => {
        const gate = getSlotGate(interview.interviewSlot, now)
        const testButton = (
            <button
                type='button'
                onClick={() => setTestingDeviceInterview(interview)}
                className='inline-flex items-center justify-center gap-1.5 border border-line bg-card hover:bg-black/[0.02] text-text-secondary hover:text-ink text-[12.5px] font-semibold px-3 py-2 rounded-xl transition-colors'
            >
                <Video size={13} /> Test Cam/Mic
            </button>
        )
        const rescheduleAllowed = gate.canReschedule && driveStillOpen(interview)
        const rescheduleButton = (
            <span title={rescheduleAllowed ? 'Pick a different slot' : 'Rescheduling closes 30 minutes before your scheduled interview.'} className='inline-flex'>
                <button
                    type='button'
                    disabled={!rescheduleAllowed}
                    onClick={() => setReschedulingInterview(interview)}
                    className='w-full inline-flex items-center justify-center gap-1.5 border border-line bg-card hover:bg-black/[0.02] text-ink text-[12.5px] font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    <RefreshCw size={13} /> Reschedule Slot
                </button>
            </span>
        )

        if (isNotSelected(interview)) {
            return (
                <span className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl'>
                    <XCircle size={15} /> Not Selected
                </span>
            )
        }
        if (isCompleted(interview)) {
            return (
                <div className='flex items-center gap-3 flex-wrap'>
                    {hasScore(interview) && (
                        <span className='inline-flex items-center gap-1.5 text-[13px] font-bold text-ink bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 rounded-xl'>
                            AI Score: <span className='text-success'>{interview.aiScore}/100</span>
                        </span>
                    )}
                    <span className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-success bg-success/10 px-3 py-2 rounded-xl'>
                        <CheckCircle2 size={15} /> Interview Completed
                    </span>
                </div>
            )
        }
        if (isPending(interview)) {
            return (
                <Button
                    size='sm'
                    onClick={() => setSelectedInterviewForApply(interview)}
                    className='w-full sm:w-auto bg-accent hover:opacity-90 text-white font-semibold text-[13px] shadow-sm'
                >
                    Complete Application & Upload Resume <ChevronRight size={14} className='ml-1' />
                </Button>
            )
        }
        if (interview.roundStatus !== 'ACTIVE') {
            return (
                <div className='flex flex-wrap items-center gap-2'>
                    {testButton}
                    <span className='inline-flex items-center gap-1.5 text-[12px] font-medium text-text-secondary bg-black/[0.03] dark:bg-white/[0.05] px-3 py-2 rounded-xl'>
                        <Clock size={12} /> Round not open yet
                    </span>
                </div>
            )
        }
        if (gate.state === 'LIVE') {
            return (
                <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                    {testButton}
                    <Button
                        size='sm'
                        onClick={() => startInterview(interview)}
                        className='bg-accent hover:opacity-90 text-white font-semibold text-[13px] shadow-sm inline-flex items-center justify-center gap-1.5 animate-pulse'
                    >
                        <PlayCircle size={15} /> Start AI Interview <Zap size={13} />
                    </Button>
                </div>
            )
        }
        if (gate.state === 'EXPIRED') {
            return (
                <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                    <span className='inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl'>
                        <AlertCircle size={13} /> Slot Expired
                    </span>
                    {rescheduleButton}
                </div>
            )
        }
        // LOCKED: not yet open - countdown, reschedule and the device check stay available.
        return (
            <div className='flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2'>
                {testButton}
                {rescheduleButton}
                <span className='inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-text-secondary bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 rounded-xl cursor-not-allowed' aria-disabled='true'>
                    <Lock size={13} /> Starts in {formatCountdown(gate.msToOpen)}
                </span>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-bg text-ink flex flex-col'>
            {/* Header */}
            <header className='sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3 min-w-0'>
                    <img src={logo} alt='WorkmateIQ' className='w-8 h-8 rounded-lg object-contain shrink-0' />
                    <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                            <p className='font-display text-[15px] font-bold text-ink leading-tight'>Candidate Hub</p>
                            <span className='hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-success/10 text-success'>
                                <span className='w-1.5 h-1.5 rounded-full bg-success animate-pulse' /> Portal Active
                            </span>
                        </div>
                        <p className='text-[12px] text-text-secondary truncate'>{user?.email}</p>
                    </div>
                </div>

                <div className='flex items-center gap-2 sm:gap-3 shrink-0'>
                    <div className='hidden sm:flex items-center gap-2 pr-3 border-r border-line'>
                        <span className='w-7 h-7 rounded-full bg-accent/10 text-accent text-[12px] font-bold flex items-center justify-center'>{initialsOf(displayName)}</span>
                        <span className='text-[12.5px] font-semibold text-ink max-w-[10rem] truncate'>{displayName}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        aria-label='Sign out'
                        className='inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-text-secondary hover:text-red-500 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-black/[0.03]'
                    >
                        <LogOut size={14} /> <span className='hidden sm:inline'>Sign out</span>
                    </button>
                </div>
            </header>

            <main className='flex-1 max-w-5xl w-full mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-6'>
                {/* Welcome + summary counters */}
                <section className='rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-xs'>
                    <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-5'>
                        <div className='space-y-1.5 min-w-0'>
                            <div className='inline-flex items-center gap-1.5 text-[11.5px] font-bold text-accent uppercase tracking-wider'>
                                <Sparkles size={13} /> WorkmateIQ Interview Portal
                            </div>
                            <h1 className='font-display text-[21px] sm:text-[24px] font-bold text-ink break-words'>Welcome back, {displayName}</h1>
                            <p className='text-[13.5px] text-text-secondary max-w-xl leading-relaxed'>
                                Manage your invitations, pick or change your interview time, and launch your AI interview when your slot opens.
                            </p>
                        </div>
                        <dl className='grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:shrink-0'>
                            {[
                                { label: 'Total Drives', value: counts.ALL, tone: 'text-ink' },
                                { label: 'Action Required', value: counts.PENDING, tone: counts.PENDING > 0 ? 'text-amber-500' : 'text-text-secondary' },
                                { label: 'Scheduled / Live', value: counts.UPCOMING, tone: 'text-accent' },
                                { label: 'Completed', value: counts.COMPLETED, tone: 'text-success' },
                            ].map((stat) => (
                                <div key={stat.label} className='px-3 py-2.5 rounded-xl border border-line bg-bg/60 text-center sm:min-w-[92px]'>
                                    <dt className='text-[10.5px] font-semibold text-text-secondary uppercase tracking-wider'>{stat.label}</dt>
                                    <dd className={`text-[20px] font-extrabold mt-0.5 ${stat.tone}`}>{stat.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* Action-required banner */}
                {counts.PENDING > 0 && (
                    <div className='p-4 rounded-2xl border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                        <div className='flex items-start gap-3 min-w-0'>
                            <div className='w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0'>
                                <AlertCircle size={19} />
                            </div>
                            <div className='min-w-0'>
                                <h2 className='text-[14px] font-bold text-amber-900 dark:text-amber-200'>Complete your application</h2>
                                <p className='text-[12.5px] text-amber-800/90 dark:text-amber-300/90 mt-0.5'>
                                    {counts.PENDING} invitation{counts.PENDING > 1 ? 's' : ''} waiting: upload your resume and pick an interview slot to confirm.
                                </p>
                            </div>
                        </div>
                        <Button
                            size='sm'
                            onClick={() => setSelectedInterviewForApply(interviews.find(isPending) || null)}
                            className='w-full sm:w-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white'
                        >
                            Complete Application <ArrowRight size={14} className='ml-1' />
                        </Button>
                    </div>
                )}

                {/* Search, sort and status tabs */}
                <section className='space-y-3'>
                    <div className='flex flex-col sm:flex-row gap-2.5'>
                        <label className='relative flex-1 min-w-0'>
                            <span className='sr-only'>Search interviews</span>
                            <Search size={15} className='absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none' />
                            <input
                                type='search'
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder='Search by job title, department or company...'
                                className='w-full h-10 pl-9 pr-3 rounded-xl border border-line bg-card text-[13px] text-ink placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30'
                            />
                        </label>
                        <label className='sm:w-60'>
                            <span className='sr-only'>Sort interviews</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className='w-full h-10 px-3 rounded-xl border border-line bg-card text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30'
                            >
                                {SORTS.map((sort) => <option key={sort.id} value={sort.id}>{sort.label}</option>)}
                            </select>
                        </label>
                    </div>

                    <div className='flex items-center justify-between gap-3 border-b border-line pb-3'>
                        <div role='tablist' aria-label='Interview status' className='flex items-center gap-2 overflow-x-auto py-1 -mx-1 px-1'>
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    role='tab'
                                    aria-selected={activeFilter === tab.id}
                                    onClick={() => setActiveFilter(tab.id)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-all inline-flex items-center gap-1.5 ${activeFilter === tab.id ? 'bg-ink text-bg shadow-xs' : 'bg-card border border-line text-text-secondary hover:text-ink'}`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`px-1.5 text-[11px] rounded-full ${activeFilter === tab.id ? 'bg-bg text-ink' : 'bg-black/[0.05] dark:bg-white/[0.08]'}`}>{counts[tab.id]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Loading */}
                {loading && (
                    <div className='space-y-4'>
                        <Skeleton className='h-36 w-full rounded-2xl' />
                        <Skeleton className='h-36 w-full rounded-2xl' />
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <Card className='p-8 text-center'>
                        <div className='w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3'>
                            <AlertCircle size={24} />
                        </div>
                        <h3 className='font-bold text-[15px] text-ink mb-1'>Unable to load your interviews</h3>
                        <p className='text-[13px] text-text-secondary mb-4'>{error}</p>
                        <Button size='sm' variant='secondary' onClick={fetchInterviews}>Try Again</Button>
                    </Card>
                )}

                {/* Empty */}
                {!loading && !error && visible.length === 0 && (
                    <EmptyState
                        icon={Inbox}
                        title={search ? 'No interviews match your search' : 'No interviews here'}
                        description={search ? 'Try a different job title, department or company name.' : EMPTY_COPY[activeFilter]}
                    />
                )}

                {/* Cards */}
                {!loading && !error && visible.length > 0 && (
                    <>
                        <ul className='space-y-4'>
                            {pageItems.map((interview) => {
                                const status = STATUS_CONFIG[interview.candidateStatus] || STATUS_CONFIG.INVITED
                                const pending = isPending(interview)
                                const gate = getSlotGate(interview.interviewSlot, now)
                                const inProgressWindow = isUpcoming(interview) && interview.roundStatus === 'ACTIVE'
                                return (
                                    <li key={`${interview.driveId}-${interview.roundNumber}`}>
                                        <Card className={`p-4 sm:p-5 border transition-colors ${pending ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/10' : 'border-line hover:border-line-hover bg-card'}`}>
                                            <div className='flex flex-col gap-4'>
                                                <div className='flex items-start gap-3 sm:gap-4 min-w-0'>
                                                    <div className='w-11 h-11 rounded-xl bg-accent/10 text-accent font-display font-bold text-[16px] flex items-center justify-center shrink-0' aria-hidden='true'>
                                                        {initialsOf(interview.companyName || interview.driveTitle)}
                                                    </div>
                                                    <div className='min-w-0 flex-1 space-y-2.5'>
                                                        <div>
                                                            {interview.companyName && (
                                                                <p className='text-[11.5px] font-semibold text-text-secondary uppercase tracking-wider truncate'>{interview.companyName}</p>
                                                            )}
                                                            <div className='flex items-center gap-2 flex-wrap'>
                                                                <h3 className='font-display font-bold text-ink text-[16px] break-words'>{interview.driveTitle}</h3>
                                                                {pending ? (
                                                                    <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/60'>
                                                                        <Clock size={11} /> Action Required
                                                                    </span>
                                                                ) : (
                                                                    <Badge variant={status.variant}>{isCompleted(interview) && !isNotSelected(interview) ? 'Completed' : status.label}</Badge>
                                                                )}
                                                                {inProgressWindow && gate.state === 'LIVE' && (
                                                                    <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-success/10 text-success'>
                                                                        <span className='w-1.5 h-1.5 rounded-full bg-success animate-pulse' /> Live Now
                                                                    </span>
                                                                )}
                                                                {inProgressWindow && gate.state === 'LOCKED' && gate.msToOpen < 60 * 60 * 1000 && (
                                                                    <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'>
                                                                        <Zap size={11} /> Live in {formatCountdown(gate.msToOpen)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-text-secondary'>
                                                            <span className='inline-flex items-center gap-1.5 min-w-0'>
                                                                <Briefcase size={13} className='text-accent shrink-0' />
                                                                <span className='px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.05] font-medium'>{interview.department || 'General'}</span>
                                                                <span className='truncate'>{interview.roundTitle}</span>
                                                            </span>
                                                            {interview.passingThreshold && (
                                                                <span className='text-[11.5px] font-semibold px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.05]'>Benchmark: {interview.passingThreshold}%</span>
                                                            )}
                                                        </div>

                                                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-[12.5px]'>
                                                            <span className='inline-flex items-center gap-1.5 min-w-0'>
                                                                <CalendarClock size={13} className='text-accent shrink-0' />
                                                                {interview.interviewSlot ? (
                                                                    <span className='text-ink font-semibold'>
                                                                        {new Date(interview.interviewSlot).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                                    </span>
                                                                ) : (
                                                                    <span className='text-amber-600 font-medium'>Slot pending selection</span>
                                                                )}
                                                            </span>
                                                            <span className='inline-flex items-center gap-1.5 min-w-0'>
                                                                <FileText size={13} className='text-accent shrink-0' />
                                                                {interview.resumeFilename ? (
                                                                    <span className='text-success font-semibold truncate inline-flex items-center gap-1'>
                                                                        <CheckCircle2 size={12} className='shrink-0' /> <span className='truncate'>{interview.resumeOriginalName || 'Resume attached'}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className={interview.resumeOptional ? 'text-text-secondary' : 'text-amber-600 font-medium'}>
                                                                        {interview.resumeOptional ? 'Resume optional' : 'Resume required'}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className='pt-3 border-t border-line'>{renderActions(interview)}</div>
                                            </div>
                                        </Card>
                                    </li>
                                )
                            })}
                        </ul>

                        <Pagination
                            page={currentPage}
                            pageSize={pageSize}
                            total={visible.length}
                            pageSizeOptions={PAGE_SIZES}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
                        />
                    </>
                )}
            </main>

            {selectedInterviewForApply && (
                <CompleteApplicationModal
                    open
                    onClose={() => setSelectedInterviewForApply(null)}
                    interview={selectedInterviewForApply}
                    onSuccess={fetchInterviews}
                />
            )}

            {reschedulingInterview && (
                <RescheduleSlotModal
                    open
                    onClose={() => setReschedulingInterview(null)}
                    interview={reschedulingInterview}
                    onRescheduled={fetchInterviews}
                />
            )}

            {testingDeviceInterview && (
                <DeviceCheckModal
                    open
                    onClose={() => setTestingDeviceInterview(null)}
                    onReadyToStart={() => {
                        const target = testingDeviceInterview
                        setTestingDeviceInterview(null)
                        // The device check can be run any time, but the room only opens inside the slot window.
                        if (getSlotGate(target.interviewSlot).state === 'LIVE') startInterview(target)
                    }}
                />
            )}
        </div>
    )
}
