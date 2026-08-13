import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from "axios"
import { ServerUrl } from '../App'
import { ArrowLeft, Target, TrendingUp, Award, ListChecks } from 'lucide-react'
import { motion } from 'motion/react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function StatCard({ icon: Icon, label, value, sub }) {
    return (
        <div className='bg-card p-5 rounded-2xl border border-line shadow-[var(--shadow-soft)]'>
            <div className='flex items-center gap-3 mb-3'>
                <div className='w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0'>
                    <Icon size={16} className='text-accent' />
                </div>
                <span className='text-[12.5px] text-text-secondary'>{label}</span>
            </div>
            <p className='text-[24px] font-bold text-ink leading-none'>{value}</p>
            {sub && <p className='text-[12px] text-text-secondary mt-1.5'>{sub}</p>}
        </div>
    )
}

function InterviewHistory() {
    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("all") // all | practice | real
    const navigate = useNavigate()

    useEffect(() => {
        const getMyInterviews = async () => {
            try {
                const result = await axios.get(ServerUrl + "/api/interview/get-interview", { withCredentials: true })
                setInterviews(result.data)
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false)
            }
        }
        getMyInterviews()
    }, [])

    const completed = useMemo(() => interviews.filter((i) => i.status === "completed"), [interviews])

    const stats = useMemo(() => {
        const total = interviews.length
        const scores = completed.map((i) => i.finalScore || 0)
        const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0
        const best = scores.length ? Math.max(...scores) : 0
        const practice = interviews.filter((i) => i.sessionMode === "practice").length
        const real = interviews.filter((i) => i.sessionMode === "real" || !i.sessionMode).length
        return { total, avg: avg.toFixed(1), best: best.toFixed(1), practice, real }
    }, [interviews, completed])

    const trendData = useMemo(() => {
        return [...completed]
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((i, idx) => ({
                name: `#${idx + 1}`,
                score: i.finalScore || 0,
                date: new Date(i.createdAt).toLocaleDateString(),
            }))
    }, [completed])

    const filtered = useMemo(() => {
        if (filter === "all") return interviews
        return interviews.filter((i) => (i.sessionMode || "real") === filter)
    }, [interviews, filter])

    return (
        <div className='min-h-screen bg-bg flex flex-col'>
            <Navbar />

            <div className='flex-1 bg-noise'>
                <div className='max-w-[1100px] mx-auto px-6 py-16'>

                    <div className='mb-10 flex items-start gap-4'>
                        <button
                            onClick={() => navigate("/")}
                            className='mt-1.5 w-11 h-11 shrink-0 rounded-full bg-card border border-line shadow-[var(--shadow-soft)] flex items-center justify-center hover:border-black/20 dark:hover:border-white/20 transition-colors'>
                            <ArrowLeft size={16} className='text-text-secondary' />
                        </button>

                        <div>
                            <p className='text-[13px] font-semibold text-accent tracking-wide uppercase mb-2'>Dashboard</p>
                            <h1 className='text-[32px] font-semibold text-ink leading-tight'>
                                Your Interview Dashboard
                            </h1>
                            <p className='text-text-secondary mt-2 text-[15px]'>
                                Track your progress and review past reports
                            </p>
                        </div>
                    </div>

                    {!loading && interviews.length > 0 && (
                        <>
                            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
                                <StatCard icon={ListChecks} label="Total Interviews" value={stats.total} />
                                <StatCard icon={TrendingUp} label="Average Score" value={`${stats.avg}/10`} />
                                <StatCard icon={Award} label="Best Score" value={`${stats.best}/10`} />
                                <StatCard icon={Target} label="Practice / Real" value={`${stats.practice} / ${stats.real}`} />
                            </div>

                            {trendData.length > 1 && (
                                <div className='bg-card p-5 sm:p-8 rounded-3xl border border-line shadow-[var(--shadow-soft)] mb-8'>
                                    <h3 className="text-[15px] font-semibold text-ink mb-6">Score Trend</h3>
                                    <div className='h-56 sm:h-64'>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                                                <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }} />
                                                <Line type="monotone" dataKey="score" stroke="#c4161f" strokeWidth={2.5} dot={{ r: 4, fill: "#c4161f" }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            <div className='flex items-center gap-2 mb-4'>
                                {["all", "practice", "real"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-4 py-2 rounded-full text-[12.5px] font-medium capitalize transition-colors ${filter === f ? "bg-accent text-white" : "bg-card border border-line text-text-secondary hover:border-black/20 dark:hover:border-white/20"}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {loading ? (
                        <div className='bg-card p-14 rounded-3xl border border-line text-center'>
                            <p className='text-text-secondary text-[15px]'>Loading...</p>
                        </div>
                    ) : filtered.length === 0 ?
                        <div className='bg-card p-14 rounded-3xl border border-line text-center'>
                            <p className='text-text-secondary text-[15px]'>
                                No interviews found. Start your first interview.
                            </p>
                        </div>

                        :

                        <div className='grid gap-4'>
                            {filtered.map((item, index) => (
                                <motion.div key={index}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, delay: index * 0.05 }}
                                    onClick={() => navigate(`/report/${item._id}`)}
                                    className='bg-card p-6 rounded-2xl border border-line hover:border-black/20 dark:hover:border-white/20 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] transition-all duration-300 cursor-pointer'>
                                    <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                                        <div>
                                            <div className='flex items-center gap-2 flex-wrap'>
                                                <h3 className="text-[16px] font-semibold text-ink">
                                                    {item.role}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${item.sessionMode === "practice" ? "bg-success/10 text-success" : "bg-black/[0.06] dark:bg-white/10 text-text-secondary"}`}>
                                                    {item.sessionMode === "practice" ? "Practice" : "Real"}
                                                </span>
                                            </div>

                                            <p className="text-text-secondary text-[13.5px] mt-1">
                                                {item.experience} • {item.mode}
                                            </p>

                                            <p className="text-[12px] text-text-secondary/70 mt-2">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className='flex items-center gap-6'>

                                            <div className="text-right">
                                                <p className="text-[20px] font-bold text-ink">
                                                    {item.finalScore || 0}<span className='text-[13px] font-medium text-text-secondary'>/10</span>
                                                </p>
                                                <p className="text-[11.5px] text-text-secondary">
                                                    Overall Score
                                                </p>
                                            </div>

                                            <span
                                                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium ${item.status === "completed"
                                                        ? "bg-success/10 text-success"
                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                                                    }`}
                                            >
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                            }
                        </div>
                    }
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default InterviewHistory
