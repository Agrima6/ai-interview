import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, CalendarClock, LogOut, PlayCircle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Card, Badge, Skeleton, EmptyState } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth.jsx'
import { getMyInterviews } from '../../api/organization/organizationApi'
import logo from '../../assets/logo.png'

const STATUS_BADGE = {
    INVITED: { variant: 'neutral', label: 'Scheduled' },
    SHORTLISTED: { variant: 'success', label: 'Shortlisted' },
    COMPLETED: { variant: 'info', label: 'Completed' },
    REJECTED: { variant: 'danger', label: 'Not selected' },
}

// A candidate can start any time once their round is open - there's no
// slot-proximity gate (e.g. "only within 15 min of your chosen time")
// because a live demo/walkthrough needs to start immediately regardless of
// what slot was picked at apply time. Re-add a window here if that
// scheduling discipline becomes a real product requirement later.
const canStart = (interview) =>
    interview.roundStatus === 'ACTIVE' && interview.candidateStatus !== 'REJECTED' && interview.candidateStatus !== 'COMPLETED'

function CandidateRoomPage() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        getMyInterviews()
            .then(setInterviews)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className='min-h-screen bg-bg'>
            <header className='border-b border-line bg-card px-6 py-4 flex items-center justify-between'>
                <div className='flex items-center gap-2.5'>
                    <img src={logo} alt='' className='w-8 h-8 rounded-lg' />
                    <div>
                        <p className='font-display text-[15px] font-bold text-ink leading-tight'>Your Interview Room</p>
                        <p className='text-[12.5px] text-text-secondary'>{user?.email}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className='flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-ink transition-colors'>
                    <LogOut size={14} /> Sign out
                </button>
            </header>

            <main className='max-w-3xl mx-auto px-6 py-10'>
                <h1 className='font-display text-[20px] font-bold text-ink mb-1'>Your scheduled interviews</h1>
                <p className='text-[13.5px] text-text-secondary mb-8'>
                    Once a round is open, you can start your interview any time.
                </p>

                {loading && (
                    <div className='space-y-3'>
                        <Skeleton className='h-24 w-full' />
                        <Skeleton className='h-24 w-full' />
                    </div>
                )}

                {!loading && error && (
                    <Card className='p-6 text-center text-[14px] text-red-500'>{error}</Card>
                )}

                {!loading && !error && interviews.length === 0 && (
                    <EmptyState
                        title='No interviews yet'
                        description="You haven't applied to any interview drives, or your application is still pending."
                    />
                )}

                {!loading && !error && interviews.length > 0 && (
                    <div className='space-y-4'>
                        {interviews.map((interview) => {
                            const badge = STATUS_BADGE[interview.candidateStatus] || STATUS_BADGE.INVITED
                            const startable = canStart(interview)
                            return (
                                <Card key={`${interview.driveId}-${interview.roundNumber}`} className='p-5'>
                                    <div className='flex items-start justify-between gap-4 flex-wrap'>
                                        <div>
                                            <div className='flex items-center gap-2 mb-1.5'>
                                                <h2 className='font-semibold text-ink text-[15px]'>{interview.driveTitle}</h2>
                                                <Badge variant={badge.variant}>{badge.label}</Badge>
                                            </div>
                                            <div className='flex flex-wrap gap-4 text-[13px] text-text-secondary'>
                                                <span className='inline-flex items-center gap-1.5'><Briefcase size={13} /> {interview.department} &middot; {interview.roundTitle}</span>
                                                {interview.interviewSlot && (
                                                    <span className='inline-flex items-center gap-1.5'><CalendarClock size={13} /> {new Date(interview.interviewSlot).toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>

                                        {interview.candidateStatus === 'COMPLETED' ? (
                                            <span className='inline-flex items-center gap-1.5 text-[13px] font-medium text-success'><CheckCircle2 size={15} /> Interview submitted</span>
                                        ) : interview.candidateStatus === 'REJECTED' ? (
                                            <span className='inline-flex items-center gap-1.5 text-[13px] font-medium text-red-500'><XCircle size={15} /> Not selected</span>
                                        ) : startable ? (
                                            <button
                                                onClick={() => navigate(`/candidate/interview/${interview.driveId}/${interview.roundNumber}`)}
                                                className='inline-flex items-center gap-2 bg-accent text-white font-semibold text-[13.5px] rounded-lg px-4 py-2.5 hover:opacity-90 transition-opacity shrink-0'
                                            >
                                                <PlayCircle size={16} /> Start Interview
                                            </button>
                                        ) : (
                                            <span className='inline-flex items-center gap-1.5 text-[12.5px] text-text-secondary'><Clock size={13} /> This round isn't open yet</span>
                                        )}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}

export default CandidateRoomPage
