import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Briefcase, CalendarClock, LogOut, PlayCircle, Clock, CheckCircle2,
    XCircle, AlertCircle, Sparkles, Video, Mic, FileText, ChevronRight,
    TrendingUp, Award, Layers, ShieldAlert, ArrowRight, User
} from 'lucide-react'
import { Card, Badge, Skeleton, EmptyState, Button, Avatar } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth.jsx'
import { getMyInterviews } from '../../api/organization/organizationApi'
import CompleteApplicationModal from '../../components/candidate/CompleteApplicationModal'
import DeviceCheckModal from '../../components/candidate/DeviceCheckModal'
import logo from '../../assets/logo.png'

const STATUS_CONFIG = {
    INVITED: { variant: 'neutral', label: 'Invited', desc: 'Application pending' },
    SCHEDULED: { variant: 'info', label: 'Scheduled', desc: 'Slot confirmed' },
    SHORTLISTED: { variant: 'success', label: 'Shortlisted', desc: 'Met passing benchmark' },
    COMPLETED: { variant: 'info', label: 'Completed', desc: 'Awaiting review' },
    REJECTED: { variant: 'danger', label: 'Not Selected', desc: 'Did not meet benchmark' },
}

export default function CandidateRoomPage() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()

    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeFilter, setActiveFilter] = useState('ALL') // ALL | PENDING | UPCOMING | COMPLETED

    // Modals
    const [selectedInterviewForApply, setSelectedInterviewForApply] = useState(null)
    const [testingDeviceInterview, setTestingDeviceInterview] = useState(null)

    const fetchInterviews = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await getMyInterviews()
            setInterviews(data || [])
        } catch (err) {
            setError(err.message || 'Failed to load your interview schedule.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInterviews()
    }, [])

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    // Counts & metrics
    const metrics = useMemo(() => {
        const total = interviews.length
        const pending = interviews.filter((i) => i.isPendingApplication && i.candidateStatus !== 'COMPLETED').length
        const upcoming = interviews.filter((i) => !i.isPendingApplication && i.candidateStatus !== 'COMPLETED' && i.candidateStatus !== 'REJECTED').length
        const completed = interviews.filter((i) => i.candidateStatus === 'COMPLETED' || i.candidateStatus === 'SHORTLISTED' || i.candidateStatus === 'REJECTED').length
        return { total, pending, upcoming, completed }
    }, [interviews])

    const filteredInterviews = useMemo(() => {
        if (activeFilter === 'PENDING') {
            return interviews.filter((i) => i.isPendingApplication && i.candidateStatus !== 'COMPLETED')
        }
        if (activeFilter === 'UPCOMING') {
            return interviews.filter((i) => !i.isPendingApplication && i.candidateStatus !== 'COMPLETED' && i.candidateStatus !== 'REJECTED')
        }
        if (activeFilter === 'COMPLETED') {
            return interviews.filter((i) => i.candidateStatus === 'COMPLETED' || i.candidateStatus === 'SHORTLISTED' || i.candidateStatus === 'REJECTED')
        }
        return interviews
    }, [interviews, activeFilter])

    const canStart = (interview) =>
        !interview.isPendingApplication &&
        interview.roundStatus === 'ACTIVE' &&
        interview.candidateStatus !== 'REJECTED' &&
        interview.candidateStatus !== 'COMPLETED'

    const handleApplicationCompleted = () => {
        fetchInterviews()
    }

    return (
        <div className='min-h-screen bg-bg text-ink flex flex-col'>
            {/* Header */}
            <header className='sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                    <img src={logo} alt='WorkmateIQ' className='w-8 h-8 rounded-lg object-contain' />
                    <div>
                        <div className='flex items-center gap-2'>
                            <p className='font-display text-[15px] font-bold text-ink leading-tight'>Candidate Hub</p>
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-success/10 text-success'>
                                <span className='w-1.5 h-1.5 rounded-full bg-success animate-pulse' /> Portal Active
                            </span>
                        </div>
                        <p className='text-[12px] text-text-secondary'>{user?.email}</p>
                    </div>
                </div>

                <div className='flex items-center gap-3'>
                    <div className='hidden sm:flex items-center gap-2 pr-3 border-r border-line text-[12.5px] font-medium text-text-secondary'>
                        <User size={14} className='text-accent' />
                        <span className='text-ink font-semibold'>{user?.displayName || user?.email?.split('@')[0]}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className='inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-text-secondary hover:text-red-500 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-black/[0.03]'
                    >
                        <LogOut size={14} /> Sign out
                    </button>
                </div>
            </header>

            <main className='flex-1 max-w-5xl w-full mx-auto px-5 py-8 space-y-7'>
                {/* Hero Banner */}
                <div className='relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-card via-card to-accent/[0.04] p-6 sm:p-7 shadow-xs'>
                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-5'>
                        <div className='space-y-1.5'>
                            <div className='inline-flex items-center gap-1.5 text-[11.5px] font-bold text-accent uppercase tracking-wider'>
                                <Sparkles size={13} /> WorkmateIQ Interview Portal
                            </div>
                            <h1 className='font-display text-[22px] sm:text-[24px] font-bold text-ink'>
                                Welcome back, {user?.displayName || user?.email?.split('@')[0]}
                            </h1>
                            <p className='text-[13.5px] text-text-secondary max-w-xl leading-relaxed'>
                                Manage your interview invitations, complete profile details, and launch your real-time AI-powered assessments.
                            </p>
                        </div>

                        <div className='grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0'>
                            <div className='p-3.5 rounded-xl border border-line bg-card/80 text-center min-w-[85px] sm:min-w-[95px]'>
                                <p className='text-[11px] font-semibold text-text-secondary uppercase tracking-wider'>Scheduled</p>
                                <p className='text-[20px] font-extrabold text-accent mt-0.5'>{metrics.upcoming}</p>
                            </div>
                            <div className='p-3.5 rounded-xl border border-line bg-card/80 text-center min-w-[85px] sm:min-w-[95px]'>
                                <p className='text-[11px] font-semibold text-text-secondary uppercase tracking-wider'>Action Req.</p>
                                <p className={`text-[20px] font-extrabold mt-0.5 ${metrics.pending > 0 ? 'text-amber-500 animate-pulse' : 'text-text-secondary'}`}>{metrics.pending}</p>
                            </div>
                            <div className='p-3.5 rounded-xl border border-line bg-card/80 text-center min-w-[85px] sm:min-w-[95px]'>
                                <p className='text-[11px] font-semibold text-text-secondary uppercase tracking-wider'>Completed</p>
                                <p className='text-[20px] font-extrabold text-success mt-0.5'>{metrics.completed}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prominent Action Required Alert Banner */}
                {metrics.pending > 0 && (
                    <div className='p-4 sm:p-5 rounded-2xl border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                        <div className='flex items-start gap-3'>
                            <div className='w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5'>
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h2 className='text-[14px] font-bold text-amber-900 dark:text-amber-200'>
                                    Action Required: Complete Your Application Details
                                </h2>
                                <p className='text-[12.5px] text-amber-800/90 dark:text-amber-300/90 mt-0.5'>
                                    You have {metrics.pending} pending interview invitation(s). Please upload your resume and pick your interview slot to confirm your session.
                                </p>
                            </div>
                        </div>
                        <Button
                            size='sm'
                            onClick={() => {
                                const pendingDrive = interviews.find((i) => i.isPendingApplication && i.candidateStatus !== 'COMPLETED')
                                if (pendingDrive) setSelectedInterviewForApply(pendingDrive)
                            }}
                            className='shrink-0 bg-amber-600 hover:bg-amber-700 text-white'
                        >
                            Complete Application <ArrowRight size={14} className='ml-1' />
                        </Button>
                    </div>
                )}

                {/* Filter Pills */}
                <div className='flex items-center justify-between gap-3 flex-wrap border-b border-line pb-4'>
                    <div className='flex items-center gap-2 overflow-x-auto py-1'>
                        {[
                            { id: 'ALL', label: 'All Drives', count: metrics.total },
                            { id: 'PENDING', label: 'Action Required', count: metrics.pending },
                            { id: 'UPCOMING', label: 'Upcoming & Live', count: metrics.upcoming },
                            { id: 'COMPLETED', label: 'Completed', count: metrics.completed },
                        ].map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-all inline-flex items-center gap-1.5 ${activeFilter === filter.id ? 'bg-ink text-bg shadow-xs' : 'bg-card border border-line text-text-secondary hover:text-ink'}`}
                            >
                                <span>{filter.label}</span>
                                <span className={`px-1.5 py-0.2 text-[11px] rounded-full ${activeFilter === filter.id ? 'bg-bg text-ink' : 'bg-black/[0.05] dark:bg-white/[0.08]'}`}>
                                    {filter.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <p className='text-[12px] font-medium text-text-secondary'>
                        Showing {filteredInterviews.length} of {metrics.total} interviews
                    </p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className='space-y-4'>
                        <Skeleton className='h-36 w-full rounded-2xl' />
                        <Skeleton className='h-36 w-full rounded-2xl' />
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <Card className='p-8 text-center'>
                        <div className='w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3'>
                            <AlertCircle size={24} />
                        </div>
                        <h3 className='font-bold text-[15px] text-ink mb-1'>Unable to load interview list</h3>
                        <p className='text-[13px] text-text-secondary mb-4'>{error}</p>
                        <Button size='sm' variant='secondary' onClick={fetchInterviews}>Try Again</Button>
                    </Card>
                )}

                {/* Empty State */}
                {!loading && !error && filteredInterviews.length === 0 && (
                    <EmptyState
                        title='No interviews found'
                        description={
                            activeFilter === 'PENDING'
                                ? 'No applications currently require your action.'
                                : activeFilter === 'UPCOMING'
                                ? 'You have no scheduled upcoming interviews right now.'
                                : activeFilter === 'COMPLETED'
                                ? 'You have not completed any interviews yet.'
                                : 'You have not been assigned to any interview drives yet.'
                        }
                    />
                )}

                {/* Interviews List */}
                {!loading && !error && filteredInterviews.length > 0 && (
                    <div className='space-y-4'>
                        {filteredInterviews.map((interview) => {
                            const status = STATUS_CONFIG[interview.candidateStatus] || STATUS_CONFIG.INVITED
                            const isActionPending = interview.isPendingApplication && interview.candidateStatus !== 'COMPLETED'
                            const isReadyToStart = canStart(interview)

                            return (
                                <Card
                                    key={`${interview.driveId}-${interview.roundNumber}`}
                                    className={`p-5 sm:p-6 transition-all border ${isActionPending ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/10' : 'border-line hover:border-line-hover bg-card'}`}
                                >
                                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-5'>
                                        {/* Left info */}
                                        <div className='space-y-2.5 flex-1 min-w-0'>
                                            <div className='flex items-center gap-2.5 flex-wrap'>
                                                <h3 className='font-display font-bold text-ink text-[16px] truncate'>
                                                    {interview.driveTitle}
                                                </h3>
                                                {isActionPending ? (
                                                    <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/60'>
                                                        <Clock size={11} /> Action Required: Profile & Resume
                                                    </span>
                                                ) : (
                                                    <Badge variant={status.variant}>{status.label}</Badge>
                                                )}
                                                {interview.passingThreshold && (
                                                    <span className='text-[11px] font-semibold px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.05] text-text-secondary'>
                                                        Benchmark: {interview.passingThreshold}%
                                                    </span>
                                                )}
                                            </div>

                                            {/* Attributes Grid */}
                                            <div className='grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-[12.5px] text-text-secondary'>
                                                <div className='flex items-center gap-1.5'>
                                                    <Briefcase size={13} className='text-accent shrink-0' />
                                                    <span className='truncate'>{interview.department} &bull; {interview.roundTitle}</span>
                                                </div>

                                                <div className='flex items-center gap-1.5'>
                                                    <CalendarClock size={13} className='text-accent shrink-0' />
                                                    {interview.interviewSlot ? (
                                                        <span className='text-ink font-semibold truncate'>
                                                            {new Date(interview.interviewSlot).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </span>
                                                    ) : (
                                                        <span className='text-amber-600 font-medium'>Slot pending selection</span>
                                                    )}
                                                </div>

                                                <div className='flex items-center gap-1.5'>
                                                    <FileText size={13} className='text-accent shrink-0' />
                                                    {interview.resumeFilename ? (
                                                        <span className='text-success font-semibold truncate flex items-center gap-1'>
                                                            <CheckCircle2 size={12} /> {interview.resumeOriginalName || 'Resume Attached'}
                                                        </span>
                                                    ) : (
                                                        <span className={interview.resumeOptional ? 'text-text-secondary' : 'text-amber-600 font-medium'}>
                                                            {interview.resumeOptional ? 'Resume Optional' : 'Resume Required'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right actions */}
                                        <div className='flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line'>
                                            {interview.candidateStatus === 'COMPLETED' || interview.candidateStatus === 'SHORTLISTED' ? (
                                                <div className='flex items-center gap-3'>
                                                    {interview.aiScore !== undefined && (
                                                        <div className='text-right'>
                                                            <p className='text-[11px] font-semibold text-text-secondary uppercase'>AI Score</p>
                                                            <p className='text-[16px] font-extrabold text-success'>{interview.aiScore}/100</p>
                                                        </div>
                                                    )}
                                                    <span className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-success bg-success/10 px-3 py-2 rounded-xl'>
                                                        <CheckCircle2 size={15} /> Interview Submitted
                                                    </span>
                                                </div>
                                            ) : interview.candidateStatus === 'REJECTED' ? (
                                                <span className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl'>
                                                    <XCircle size={15} /> Not Selected
                                                </span>
                                            ) : isActionPending ? (
                                                <Button
                                                    size='sm'
                                                    onClick={() => setSelectedInterviewForApply(interview)}
                                                    className='bg-accent hover:opacity-90 text-white font-semibold text-[13px] shadow-sm'
                                                >
                                                    Complete Application & Upload Resume <ChevronRight size={14} className='ml-1' />
                                                </Button>
                                            ) : isReadyToStart ? (
                                                <div className='flex items-center gap-2'>
                                                    <button
                                                        type='button'
                                                        onClick={() => setTestingDeviceInterview(interview)}
                                                        className='inline-flex items-center gap-1.5 border border-line bg-card hover:bg-black/[0.02] text-text-secondary hover:text-ink text-[12.5px] font-semibold px-3 py-2 rounded-xl transition-colors'
                                                    >
                                                        <Video size={13} /> Test Cam/Mic
                                                    </button>
                                                    <Button
                                                        size='sm'
                                                        onClick={() => navigate(`/candidate/interview/${interview.driveId}/${interview.roundNumber}`)}
                                                        className='bg-accent hover:opacity-90 text-white font-semibold text-[13px] shadow-sm inline-flex items-center gap-1.5'
                                                    >
                                                        <PlayCircle size={15} /> Start AI Interview
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className='flex items-center gap-2'>
                                                    <button
                                                        type='button'
                                                        onClick={() => setTestingDeviceInterview(interview)}
                                                        className='inline-flex items-center gap-1.5 border border-line bg-card hover:bg-black/[0.02] text-text-secondary hover:text-ink text-[12px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors'
                                                    >
                                                        <Video size={12} /> Test Cam/Mic
                                                    </button>
                                                    <span className='inline-flex items-center gap-1.5 text-[12px] font-medium text-text-secondary bg-black/[0.03] dark:bg-white/[0.05] px-3 py-1.5 rounded-lg'>
                                                        <Clock size={12} /> Round not open yet
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Modal 1: Student Application Completion Modal */}
            {selectedInterviewForApply && (
                <CompleteApplicationModal
                    open={Boolean(selectedInterviewForApply)}
                    onClose={() => setSelectedInterviewForApply(null)}
                    interview={selectedInterviewForApply}
                    onSuccess={handleApplicationCompleted}
                />
            )}

            {/* Modal 2: Device & Audio Pre-Check Modal */}
            {testingDeviceInterview && (
                <DeviceCheckModal
                    open={Boolean(testingDeviceInterview)}
                    onClose={() => setTestingDeviceInterview(null)}
                    onReadyToStart={() => {
                        const target = testingDeviceInterview
                        setTestingDeviceInterview(null)
                        navigate(`/candidate/interview/${target.driveId}/${target.roundNumber}`)
                    }}
                />
            )}
        </div>
    )
}
