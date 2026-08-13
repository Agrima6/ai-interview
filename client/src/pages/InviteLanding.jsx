import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from "axios"
import { ServerUrl } from '../App'
import { useSelector } from 'react-redux'
import { motion } from 'motion/react'
import { CalendarClock, CheckCircle2, Clock, Sparkles, Target, Zap } from 'lucide-react'
import Step2Interview from '../components/Step2Interview'
import Step3Report from '../components/Step3Report'

function InviteLanding() {
    const { token } = useParams()
    const { userData } = useSelector((state) => state.user)
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [invite, setInvite] = useState(null)
    const [starting, setStarting] = useState(false)
    const [sessionMode, setSessionMode] = useState("practice")
    const [interviewData, setInterviewData] = useState(null)
    const [report, setReport] = useState(null)
    const [advancing, setAdvancing] = useState(false)
    const [roundTransition, setRoundTransition] = useState(null)

    useEffect(() => {
        const fetchInvite = async () => {
            try {
                const result = await axios.get(ServerUrl + "/api/invite/token/" + token)
                setInvite(result.data)
                if (result.data.template?.defaultMode) setSessionMode(result.data.template.defaultMode)
            } catch (err) {
                setError(err.response?.data?.message || "This invite link is invalid.")
            } finally {
                setLoading(false)
            }
        }
        fetchInvite()
    }, [token])

    const handleStart = async () => {
        if (!userData) {
            navigate("/login", { state: { from: `/interview/invite/${token}` } })
            return
        }
        setStarting(true)
        try {
            const startRes = await axios.post(
                ServerUrl + "/api/invite/token/" + token + "/start",
                { sessionMode },
                { withCredentials: true }
            )
            const interviewId = startRes.data.interviewId

            const reportRes = await axios.get(ServerUrl + "/api/interview/report/" + interviewId, { withCredentials: true })

            const round = invite?.template?.rounds?.[reportRes.data.roundIndex || 0]
            const totalRounds = invite?.template?.rounds?.length || 1

            setInterviewData({
                interviewId,
                questions: reportRes.data.questionWiseScore,
                userName: userData.name,
                language: "English",
                voicePreference: "auto",
                sessionMode: reportRes.data.sessionMode || sessionMode,
                roundLabel: totalRounds > 1
                    ? `Round ${(reportRes.data.roundIndex || 0) + 1} of ${totalRounds}${round ? `: ${round.name}` : ""}`
                    : null,
            })
        } catch (err) {
            setError(err.response?.data?.message || "Failed to start this interview.")
        } finally {
            setStarting(false)
        }
    }

    const buildInterviewData = (finishedReport, roundIndex) => {
        const totalRounds = invite?.template?.rounds?.length || 1
        const round = invite?.template?.rounds?.[roundIndex]
        return {
            interviewId: finishedReport.interviewId,
            questions: finishedReport.questionWiseScore,
            userName: userData.name,
            language: "English",
            voicePreference: "auto",
            sessionMode: finishedReport.sessionMode || sessionMode,
            roundLabel: totalRounds > 1
                ? `Round ${roundIndex + 1} of ${totalRounds}${round ? `: ${round.name}` : ""}`
                : null,
        }
    }

    const handleRoundFinish = async (finishedReport) => {
        const totalRounds = invite?.template?.rounds?.length || 1
        const isLastRound = (finishedReport.roundIndex ?? 0) + 1 >= totalRounds

        if (isLastRound) {
            setReport(finishedReport)
            return
        }

        setAdvancing(true)
        try {
            const res = await axios.post(
                ServerUrl + "/api/invite/token/" + token + "/next-round",
                {},
                { withCredentials: true }
            )
            if (res.data.done) {
                setReport(finishedReport)
                return
            }
            const reportRes = await axios.get(ServerUrl + "/api/interview/report/" + res.data.interviewId, { withCredentials: true })
            setInterviewData(null)
            setRoundTransition({
                completedRoundIndex: finishedReport.roundIndex ?? 0,
                nextData: buildInterviewData(
                    { interviewId: res.data.interviewId, questionWiseScore: reportRes.data.questionWiseScore, sessionMode: reportRes.data.sessionMode },
                    res.data.roundIndex
                ),
            })
        } catch (err) {
            setError(err.response?.data?.message || "Failed to advance to the next round.")
        } finally {
            setAdvancing(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <p className="text-text-secondary text-[15px]">Loading invite...</p>
            </div>
        )
    }

    if (error || !invite) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-card border border-line rounded-3xl shadow-[var(--shadow-lift)] p-8 text-center">
                    <h2 className="text-[19px] font-semibold text-ink mb-3">Invite unavailable</h2>
                    <p className="text-text-secondary text-[14px] leading-relaxed">{error || "This invite could not be found."}</p>
                </div>
            </div>
        )
    }

    if (invite.status === "expired") {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-card border border-line rounded-3xl shadow-[var(--shadow-lift)] p-8 text-center">
                    <Clock size={28} className="mx-auto text-text-secondary mb-4" />
                    <h2 className="text-[19px] font-semibold text-ink mb-3">This invite has expired</h2>
                    <p className="text-text-secondary text-[14px] leading-relaxed">
                        Please reach out to whoever sent you this link for a new invite.
                    </p>
                </div>
            </div>
        )
    }

    if (invite.status === "completed") {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-card border border-line rounded-3xl shadow-[var(--shadow-lift)] p-8 text-center">
                    <CheckCircle2 size={28} className="mx-auto text-success mb-4" />
                    <h2 className="text-[19px] font-semibold text-ink mb-3">Interview already completed</h2>
                    <p className="text-text-secondary text-[14px] leading-relaxed mb-6">
                        You've already taken this interview. You can view your report from your dashboard.
                    </p>
                    <button
                        onClick={() => navigate(invite.interviewId ? `/report/${invite.interviewId}` : "/history")}
                        className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-xl font-medium transition-colors">
                        View Report
                    </button>
                </div>
            </div>
        )
    }

    if (report) {
        return <Step3Report report={report} />
    }

    if (advancing) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <p className="text-text-secondary text-[15px]">Setting up your next round...</p>
                </div>
            </div>
        )
    }

    if (roundTransition) {
        const totalRounds = invite?.template?.rounds?.length || 1
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-card border border-line rounded-3xl shadow-[var(--shadow-lift)] p-8 text-center">
                    <CheckCircle2 size={28} className="mx-auto text-success mb-4" />
                    <h2 className="text-[19px] font-semibold text-ink mb-2">
                        Round {roundTransition.completedRoundIndex + 1} complete
                    </h2>
                    <p className="text-text-secondary text-[14px] leading-relaxed mb-6">
                        Nice work. Up next: Round {roundTransition.completedRoundIndex + 2} of {totalRounds}.
                    </p>
                    <button
                        onClick={() => {
                            setInterviewData(roundTransition.nextData)
                            setRoundTransition(null)
                        }}
                        className="w-full bg-accent hover:bg-accent-dark text-white py-3.5 rounded-2xl font-medium transition-colors">
                        Continue to next round
                    </button>
                </motion.div>
            </div>
        )
    }

    if (interviewData) {
        return (
            <Step2Interview
                interviewData={interviewData}
                onFinish={handleRoundFinish}
            />
        )
    }

    const template = invite.template || {}
    const rounds = template.rounds || []

    return (
        <div className="min-h-screen bg-bg bg-noise flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-2xl bg-card border border-line rounded-3xl shadow-[var(--shadow-lift)] overflow-hidden">

                <div className="relative bg-[#120f10] p-8 sm:p-10 text-white bg-noise">
                    <div className="absolute top-[-80px] right-[-80px] w-[280px] h-[280px] rounded-full bg-[radial-gradient(closest-side,rgba(196,22,31,0.35),transparent)] blur-2xl" />
                    <div className="relative inline-flex items-center gap-2 bg-white/10 text-[12.5px] px-3.5 py-1.5 rounded-full mb-5 w-fit">
                        <Sparkles size={12} className="text-accent" /> Interview Invitation
                    </div>
                    <h1 className="text-[26px] sm:text-[30px] font-semibold leading-tight mb-3">
                        {invite.candidateName ? `Hi ${invite.candidateName}, you've` : "You've"} been invited to interview for <span className="text-accent">{template.title || "a role"}</span>
                    </h1>
                    {template.description && (
                        <p className="text-white/60 text-[14.5px] leading-relaxed">{template.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-white/50 text-[12.5px] mt-5">
                        <CalendarClock size={13} />
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                </div>

                <div className="p-8 sm:p-10 space-y-7">
                    {rounds.length > 0 && (
                        <div>
                            <p className="text-[13px] font-semibold text-ink mb-3">Rounds ({rounds.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {rounds.map((r, i) => (
                                    <span key={i} className="bg-black/[0.04] dark:bg-white/[0.06] border border-line px-3 py-1.5 rounded-full text-[12.5px] text-text-secondary">
                                        {i + 1}. {r.name} <span className="text-text-secondary/60">({r.type})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-[13px] font-semibold text-ink mb-3">Choose how you'd like to take this interview</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => setSessionMode("practice")}
                                className={`text-left p-4 rounded-2xl border transition-colors ${sessionMode === "practice" ? "border-accent bg-accent/[0.06]" : "border-line hover:border-black/20 dark:hover:border-white/20"}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Target size={15} className="text-accent" />
                                    <span className="font-semibold text-ink text-[14px]">Practice Mode</span>
                                </div>
                                <p className="text-text-secondary text-[12.5px] leading-relaxed">
                                    Low-stakes. Get AI feedback after every answer so you can improve as you go.
                                </p>
                            </button>
                            <button
                                onClick={() => setSessionMode("real")}
                                className={`text-left p-4 rounded-2xl border transition-colors ${sessionMode === "real" ? "border-accent bg-accent/[0.06]" : "border-line hover:border-black/20 dark:hover:border-white/20"}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={15} className="text-accent" />
                                    <span className="font-semibold text-ink text-[14px]">Real Mode</span>
                                </div>
                                <p className="text-text-secondary text-[12.5px] leading-relaxed">
                                    Timed and proctored. Feedback is only revealed at the end in your full report.
                                </p>
                            </button>
                        </div>
                    </div>

                    {!userData && (
                        <p className="text-[12.5px] text-text-secondary bg-black/[0.03] dark:bg-white/[0.04] border border-line rounded-xl p-3.5">
                            You'll need to sign in before starting - we'll bring you right back here.
                        </p>
                    )}

                    <button
                        onClick={handleStart}
                        disabled={starting}
                        className="w-full bg-accent hover:bg-accent-dark text-white py-3.5 rounded-2xl shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all duration-300 font-medium disabled:opacity-60">
                        {starting ? "Starting..." : userData ? "Start Interview" : "Sign In to Start"}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

export default InviteLanding
