import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Users, ClipboardList, TrendingUp, CheckCircle2, Plus, X, Power, Coins } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Button from '../components/Button'
import { addEmployee, listEmployees, getEmployeeInterviews, updateEmployee, getTrends } from '../utils/adminApi'

function StatCard({ icon: Icon, label, value }) {
    return (
        <div className='bg-card border border-line rounded-2xl p-5 shadow-[var(--shadow-soft)]'>
            <div className='flex items-center gap-2 text-text-secondary text-[12.5px] mb-3'>
                <Icon size={14} /> {label}
            </div>
            <p className='text-[26px] font-bold text-ink'>{value}</p>
        </div>
    )
}

function AddEmployeeModal({ onClose, onAdded, organizationId }) {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim() || !email.trim()) return
        setSaving(true)
        setError("")
        try {
            await addEmployee(name.trim(), email.trim(), organizationId)
            onAdded()
        } catch (err) {
            setError(err.response?.data?.message || "Failed to add employee.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4' onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                className='w-full max-w-sm bg-card border border-line rounded-2xl shadow-[var(--shadow-lift)] p-6'>
                <div className='flex items-center justify-between mb-5'>
                    <h3 className='text-[17px] font-semibold text-ink'>Add Employee</h3>
                    <button onClick={onClose} className='text-text-secondary hover:text-ink'><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className='space-y-3'>
                    <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                        className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
                        className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />
                    {error && <p className='text-[12.5px] text-red-500'>{error}</p>}
                    <Button type="submit" disabled={saving} className='w-full !py-2.5'>
                        {saving ? "Adding..." : "Add Employee"}
                    </Button>
                </form>
            </motion.div>
        </div>
    )
}

function EmployeeDetailModal({ employee, organizationId, onClose }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getEmployeeInterviews(employee._id, organizationId)
            .then(setData)
            .catch(() => setData({ interviews: [] }))
            .finally(() => setLoading(false))
    }, [employee._id])

    return (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4' onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                className='w-full max-w-lg max-h-[80vh] overflow-y-auto bg-card border border-line rounded-2xl shadow-[var(--shadow-lift)] p-6'>
                <div className='flex items-center justify-between mb-5'>
                    <div>
                        <h3 className='text-[17px] font-semibold text-ink'>{employee.name}</h3>
                        <p className='text-[13px] text-text-secondary'>{employee.email}</p>
                    </div>
                    <button onClick={onClose} className='text-text-secondary hover:text-ink'><X size={18} /></button>
                </div>

                {loading ? (
                    <p className='text-text-secondary text-[13.5px]'>Loading...</p>
                ) : data.interviews.length === 0 ? (
                    <p className='text-text-secondary text-[13.5px]'>No interviews yet.</p>
                ) : (
                    <div className='space-y-3'>
                        {data.interviews.map((iv) => (
                            <div key={iv._id} className='bg-bg border border-line rounded-xl p-4 flex items-center justify-between gap-4'>
                                <div>
                                    <p className='text-[14px] font-medium text-ink'>{iv.role}</p>
                                    <p className='text-[12.5px] text-text-secondary'>{iv.experience} &bull; {iv.mode} &bull; {new Date(iv.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className='text-right shrink-0'>
                                    <p className='text-[16px] font-bold text-ink'>{iv.finalScore || 0}<span className='text-[12px] text-text-secondary'>/10</span></p>
                                    <p className='text-[11px] text-text-secondary'>{iv.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    )
}

function EmployeeRow({ employee, organizationId, onChanged }) {
    const [editingCredits, setEditingCredits] = useState(false)
    const [credits, setCredits] = useState(employee.credits)
    const [showDetail, setShowDetail] = useState(false)
    const [busy, setBusy] = useState(false)

    const saveCredits = async () => {
        setBusy(true)
        try {
            await updateEmployee(employee._id, { credits: Number(credits) }, organizationId)
            onChanged()
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update credits.")
        } finally {
            setBusy(false)
            setEditingCredits(false)
        }
    }

    const toggleActive = async () => {
        setBusy(true)
        try {
            await updateEmployee(employee._id, { active: !employee.active }, organizationId)
            onChanged()
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update employee.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <tr className='border-b border-line last:border-0'>
                <td className='py-3 pr-4'>
                    <button onClick={() => setShowDetail(true)} className='text-left hover:text-accent transition-colors'>
                        <p className='text-[14px] font-medium text-ink'>{employee.name}</p>
                        <p className='text-[12px] text-text-secondary'>{employee.email}</p>
                    </button>
                </td>
                <td className='py-3 pr-4 text-[13.5px] text-ink'>
                    {editingCredits ? (
                        <div className='flex items-center gap-1.5'>
                            <input type="number" value={credits} onChange={(e) => setCredits(e.target.value)}
                                className='w-20 px-2 py-1 text-[13px] bg-card border border-line rounded-lg outline-none focus:border-accent' />
                            <button onClick={saveCredits} disabled={busy} className='text-accent text-[12px] font-medium'>Save</button>
                        </div>
                    ) : (
                        <button onClick={() => setEditingCredits(true)} className='inline-flex items-center gap-1 hover:text-accent transition-colors'>
                            <Coins size={13} /> {employee.credits}
                        </button>
                    )}
                </td>
                <td className='py-3 pr-4 text-[13.5px] text-ink'>{employee.interviewCount}</td>
                <td className='py-3 pr-4 text-[13.5px] text-ink'>{employee.avgScore || '-'}</td>
                <td className='py-3 pr-4 text-[12.5px] text-text-secondary'>
                    {employee.lastActive ? new Date(employee.lastActive).toLocaleDateString() : 'Never'}
                </td>
                <td className='py-3 pr-4'>
                    <span className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium ${employee.active ? "bg-success/10 text-success" : "bg-black/[0.06] dark:bg-white/[0.08] text-text-secondary"}`}>
                        {employee.active ? "Active" : "Deactivated"}
                    </span>
                </td>
                <td className='py-3'>
                    <button onClick={toggleActive} disabled={busy}
                        title={employee.active ? "Deactivate" : "Reactivate"}
                        className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-text-secondary hover:text-red-500 transition-colors'>
                        <Power size={14} />
                    </button>
                </td>
            </tr>
            {showDetail && (
                <EmployeeDetailModal employee={employee} organizationId={organizationId} onClose={() => setShowDetail(false)} />
            )}
        </>
    )
}

function AdminPanel() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const organizationId = searchParams.get("organizationId") || undefined

    const [tab, setTab] = useState("trends")
    const [trends, setTrends] = useState(null)
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [showAddForm, setShowAddForm] = useState(false)

    const load = async () => {
        setLoading(true)
        setError("")
        try {
            const [t, e] = await Promise.all([getTrends(organizationId), listEmployees(organizationId)])
            setTrends(t)
            setEmployees(e)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load admin data.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [organizationId])

    return (
        <div className='min-h-screen bg-bg flex flex-col'>
            <Navbar />

            <div className='flex-1 bg-noise'>
                <div className='max-w-[1280px] mx-auto px-6 py-16'>

                    <div className='mb-10 flex items-start gap-4 flex-wrap justify-between'>
                        <div className='flex items-start gap-4'>
                            <button onClick={() => navigate("/")} className='mt-1.5 w-11 h-11 shrink-0 rounded-full bg-card border border-line shadow-[var(--shadow-soft)] flex items-center justify-center hover:border-black/20 dark:hover:border-white/20 transition-colors'>
                                <ArrowLeft size={16} className='text-text-secondary' />
                            </button>
                            <div>
                                <p className='text-[13px] font-semibold text-accent tracking-wide uppercase mb-2'>Admin</p>
                                <h1 className='text-[32px] font-semibold text-ink leading-tight'>Admin Panel</h1>
                                <p className='text-text-secondary mt-2 text-[15px]'>Manage employees and track interview performance</p>
                            </div>
                        </div>

                        <Button onClick={() => setShowAddForm(true)} className='!px-5'>
                            <Plus size={16} /> Add Employee
                        </Button>
                    </div>

                    <div className='flex items-center gap-1 mb-8 bg-black/[0.03] dark:bg-white/[0.05] p-1 rounded-full w-fit'>
                        {[{ id: "trends", label: "Trends" }, { id: "employees", label: "Employees" }].map((t) => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`px-5 py-2 rounded-full text-[13.5px] font-medium transition-colors ${tab === t.id ? "bg-accent text-white" : "text-text-secondary hover:text-ink"}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <p className='text-text-secondary text-[14px]'>Loading...</p>
                    ) : error ? (
                        <p className='text-red-500 text-[14px]'>{error}</p>
                    ) : tab === "trends" ? (
                        <div className='space-y-6'>
                            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                                <StatCard icon={Users} label="Employees" value={trends.employeeCount} />
                                <StatCard icon={ClipboardList} label="Total Interviews" value={trends.totalInterviews} />
                                <StatCard icon={CheckCircle2} label="Completed" value={trends.completedInterviews} />
                                <StatCard icon={TrendingUp} label="Avg Score" value={`${trends.avgScore}/10`} />
                            </div>

                            <div className='grid md:grid-cols-3 gap-4'>
                                {[
                                    { label: "Confidence", value: trends.skillAverages.confidence },
                                    { label: "Communication", value: trends.skillAverages.communication },
                                    { label: "Correctness", value: trends.skillAverages.correctness },
                                ].map((s) => (
                                    <div key={s.label} className='bg-card border border-line rounded-2xl p-5'>
                                        <div className='flex justify-between mb-2 text-[13.5px]'>
                                            <span className='text-text-secondary'>{s.label}</span>
                                            <span className='font-semibold text-ink'>{s.value}</span>
                                        </div>
                                        <div className='bg-black/[0.06] dark:bg-white/[0.08] h-1.5 rounded-full overflow-hidden'>
                                            <div className='bg-success h-full rounded-full' style={{ width: `${s.value * 10}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className='bg-card border border-line rounded-2xl p-6'>
                                <h3 className='text-[15px] font-semibold text-ink mb-6'>Weekly Score Trend</h3>
                                <div className='h-64'>
                                    {trends.weeklyTrend.length === 0 ? (
                                        <p className='text-text-secondary text-[13.5px]'>Not enough data yet.</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={trends.weeklyTrend.map((w) => ({ ...w, week: new Date(w.week).toLocaleDateString() }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                                                <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }} />
                                                <Area type="monotone" dataKey="avgScore" stroke="#22C55E" fill="#22C55E" fillOpacity={0.12} strokeWidth={2.5} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className='bg-card border border-line rounded-2xl p-6 overflow-x-auto'>
                            {employees.length === 0 ? (
                                <p className='text-text-secondary text-[14px]'>No employees yet. Add your first one.</p>
                            ) : (
                                <table className='w-full min-w-[720px]'>
                                    <thead>
                                        <tr className='border-b border-line text-left'>
                                            <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Name</th>
                                            <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Credits</th>
                                            <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Interviews</th>
                                            <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Avg Score</th>
                                            <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Last Active</th>
                                            <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Status</th>
                                            <th className='pb-3 text-[12px] font-medium text-text-secondary uppercase tracking-wide'></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp) => (
                                            <EmployeeRow key={emp._id} employee={emp} organizationId={organizationId} onChanged={load} />
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Footer />

            {showAddForm && (
                <AddEmployeeModal
                    organizationId={organizationId}
                    onClose={() => setShowAddForm(false)}
                    onAdded={() => { setShowAddForm(false); load() }}
                />
            )}
        </div>
    )
}

export default AdminPanel
