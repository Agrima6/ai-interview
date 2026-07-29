import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, Users, ClipboardList, TrendingUp, CheckCircle2, Plus, X, Power, Coins, Settings2, FileText, Building2, Upload } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Button from '../components/Button'
import Dropdown from '../components/Dropdown'
import { addEmployee, bulkAddEmployees, listEmployees, getEmployeeInterviews, updateEmployee, getTrends } from '../utils/adminApi'
import { parseEmployeeCsv } from '../utils/csv'

// Kept in sync with the modes offered in Step1SetUp.jsx - what an admin can
// assign here is a subset of what an employee could otherwise pick freely.
const INTERVIEW_MODES = ["Technical", "HR", "Behavioral", "System Design", "Case Study", "Group Discussion", "Managerial Round"]
const MODE_OPTIONS = INTERVIEW_MODES.map((m) => ({ value: m, label: m }))

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

function AssignmentFields({ department, setDepartment, assignedRole, setAssignedRole, assignedExperience, setAssignedExperience, assignedMode, setAssignedMode, assignedContext, setAssignedContext }) {
    return (
        <div className='space-y-3'>
            <input type="text" placeholder="Department (e.g. Engineering)" value={department} onChange={(e) => setDepartment(e.target.value)}
                className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />
            <input type="text" placeholder="Role to interview for (e.g. Backend Developer)" value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)}
                className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />
            <input type="text" placeholder="Experience level (e.g. 2 years)" value={assignedExperience} onChange={(e) => setAssignedExperience(e.target.value)}
                className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />
            <Dropdown value={assignedMode} onChange={setAssignedMode} options={MODE_OPTIONS} placeholder="Interview type" />
            <textarea placeholder="Interview context / job description (optional) - shapes the AI's questions" value={assignedContext} onChange={(e) => setAssignedContext(e.target.value)} rows={3}
                className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors resize-none' />
        </div>
    )
}

function AddEmployeeModal({ onClose, onAdded, organizationId }) {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [showAssignment, setShowAssignment] = useState(false)
    const [department, setDepartment] = useState("")
    const [assignedRole, setAssignedRole] = useState("")
    const [assignedExperience, setAssignedExperience] = useState("")
    const [assignedMode, setAssignedMode] = useState("")
    const [assignedContext, setAssignedContext] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim() || !email.trim()) return
        setSaving(true)
        setError("")
        try {
            await addEmployee(name.trim(), email.trim(), organizationId, {
                department, assignedRole, assignedExperience, assignedMode, assignedContext,
            })
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
                className='w-full max-w-sm max-h-[85vh] overflow-y-auto bg-card border border-line rounded-2xl shadow-[var(--shadow-lift)] p-6'>
                <div className='flex items-center justify-between mb-5'>
                    <h3 className='text-[17px] font-semibold text-ink'>Add Employee</h3>
                    <button onClick={onClose} className='text-text-secondary hover:text-ink'><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className='space-y-3'>
                    <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                        className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
                        className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />

                    {!showAssignment ? (
                        <button type="button" onClick={() => setShowAssignment(true)}
                            className='text-[13px] font-medium text-accent hover:underline'>
                            + Assign a specific interview (optional)
                        </button>
                    ) : (
                        <div className='pt-1 border-t border-line'>
                            <p className='text-[12.5px] text-text-secondary my-3'>
                                Leave blank to let them choose their own role/mode when they sign in.
                            </p>
                            <AssignmentFields
                                department={department} setDepartment={setDepartment}
                                assignedRole={assignedRole} setAssignedRole={setAssignedRole}
                                assignedExperience={assignedExperience} setAssignedExperience={setAssignedExperience}
                                assignedMode={assignedMode} setAssignedMode={setAssignedMode}
                                assignedContext={assignedContext} setAssignedContext={setAssignedContext}
                            />
                        </div>
                    )}

                    {error && <p className='text-[12.5px] text-red-500'>{error}</p>}
                    <Button type="submit" disabled={saving} className='w-full !py-2.5'>
                        {saving ? "Adding..." : "Add Employee"}
                    </Button>
                </form>
            </motion.div>
        </div>
    )
}

function AssignInterviewModal({ employee, organizationId, onClose, onSaved }) {
    const [department, setDepartment] = useState(employee.department || "")
    const [assignedRole, setAssignedRole] = useState(employee.assignedRole || "")
    const [assignedExperience, setAssignedExperience] = useState(employee.assignedExperience || "")
    const [assignedMode, setAssignedMode] = useState(employee.assignedMode || "")
    const [assignedContext, setAssignedContext] = useState(employee.assignedContext || "")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const handleSave = async () => {
        setSaving(true)
        setError("")
        try {
            await updateEmployee(employee._id, { department, assignedRole, assignedExperience, assignedMode, assignedContext }, organizationId)
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update assignment.")
        } finally {
            setSaving(false)
        }
    }

    const handleClear = async () => {
        setSaving(true)
        setError("")
        try {
            await updateEmployee(employee._id, { department: "", assignedRole: "", assignedExperience: "", assignedMode: "", assignedContext: "" }, organizationId)
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || "Failed to clear assignment.")
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
                className='w-full max-w-sm max-h-[85vh] overflow-y-auto bg-card border border-line rounded-2xl shadow-[var(--shadow-lift)] p-6'>
                <div className='flex items-center justify-between mb-5'>
                    <div>
                        <h3 className='text-[17px] font-semibold text-ink'>Assign Interview</h3>
                        <p className='text-[13px] text-text-secondary'>{employee.name}</p>
                    </div>
                    <button onClick={onClose} className='text-text-secondary hover:text-ink'><X size={18} /></button>
                </div>
                <div className='space-y-3'>
                    <AssignmentFields
                        department={department} setDepartment={setDepartment}
                        assignedRole={assignedRole} setAssignedRole={setAssignedRole}
                        assignedExperience={assignedExperience} setAssignedExperience={setAssignedExperience}
                        assignedMode={assignedMode} setAssignedMode={setAssignedMode}
                        assignedContext={assignedContext} setAssignedContext={setAssignedContext}
                    />
                    {error && <p className='text-[12.5px] text-red-500'>{error}</p>}
                    <div className='flex gap-2'>
                        <Button onClick={handleClear} disabled={saving} variant="secondary" className='flex-1 !py-2.5'>Clear</Button>
                        <Button onClick={handleSave} disabled={saving} className='flex-1 !py-2.5'>{saving ? "Saving..." : "Save"}</Button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

function BulkUploadModal({ organizationId, onClose, onDone }) {
    const [fileName, setFileName] = useState("")
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState("")
    const [results, setResults] = useState(null)

    const handleFile = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setFileName(file.name)
        setError("")
        setResults(null)
        setUploading(true)
        try {
            const text = await file.text()
            const rows = parseEmployeeCsv(text)
            if (rows.length === 0) {
                setError("No valid rows found. Make sure the first row has a 'name' and 'email' column.")
                return
            }
            const data = await bulkAddEmployees(rows, organizationId)
            setResults(data)
            onDone()
        } catch (err) {
            setError(err.response?.data?.message || "Failed to upload CSV.")
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4' onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                className='w-full max-w-md max-h-[85vh] overflow-y-auto bg-card border border-line rounded-2xl shadow-[var(--shadow-lift)] p-6'>
                <div className='flex items-center justify-between mb-5'>
                    <h3 className='text-[17px] font-semibold text-ink'>Bulk Upload Employees</h3>
                    <button onClick={onClose} className='text-text-secondary hover:text-ink'><X size={18} /></button>
                </div>

                <p className='text-[12.5px] text-text-secondary mb-4 leading-relaxed'>
                    CSV with a header row. Required columns: <span className='font-medium text-ink'>name, email</span>.
                    Optional: department, role, experience, mode, context.
                </p>

                <label className='border-2 border-dashed border-line rounded-2xl p-6 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/[0.03] transition-colors flex flex-col items-center gap-2 mb-4'>
                    <Upload size={22} className='text-accent' />
                    <span className='text-[13.5px] text-text-secondary font-medium'>
                        {uploading ? "Uploading..." : fileName || "Click to choose a .csv file"}
                    </span>
                    <input type="file" accept=".csv,text/csv" className='hidden' onChange={handleFile} disabled={uploading} />
                </label>

                {error && <p className='text-[12.5px] text-red-500 mb-3'>{error}</p>}

                {results && (
                    <div className='space-y-2'>
                        <p className='text-[13.5px] text-ink font-medium'>
                            {results.created} added, {results.failed} failed.
                        </p>
                        {results.failed > 0 && (
                            <div className='max-h-40 overflow-y-auto space-y-1.5'>
                                {results.results.filter((r) => r.status === "error").map((r, i) => (
                                    <p key={i} className='text-[12px] text-red-500'>{r.email}: {r.message}</p>
                                ))}
                            </div>
                        )}
                        <Button onClick={onClose} className='w-full !py-2.5 mt-2'>Done</Button>
                    </div>
                )}
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
                            <Link key={iv._id} to={`/report/${iv._id}`} target="_blank" rel="noopener noreferrer"
                                className='bg-bg border border-line rounded-xl p-4 flex items-center justify-between gap-4 hover:border-accent/40 transition-colors'>
                                <div>
                                    <p className='text-[14px] font-medium text-ink'>{iv.role}</p>
                                    <p className='text-[12.5px] text-text-secondary'>{iv.experience} &bull; {iv.mode} &bull; {new Date(iv.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className='text-right shrink-0 flex items-center gap-3'>
                                    <div>
                                        <p className='text-[16px] font-bold text-ink'>{iv.finalScore || 0}<span className='text-[12px] text-text-secondary'>/10</span></p>
                                        <p className='text-[11px] text-text-secondary'>{iv.status}</p>
                                    </div>
                                    <FileText size={15} className='text-text-secondary shrink-0' />
                                </div>
                            </Link>
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
    const [showAssign, setShowAssign] = useState(false)
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
                <td className='py-3 pr-4 text-[13px] text-text-secondary'>
                    {employee.department || <span className='text-text-secondary/50'>-</span>}
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
                    <div className='flex items-center gap-1'>
                        <button onClick={() => setShowAssign(true)}
                            title="Assign a specific interview"
                            className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-text-secondary hover:text-accent transition-colors'>
                            <Settings2 size={14} />
                        </button>
                        <button onClick={toggleActive} disabled={busy}
                            title={employee.active ? "Deactivate" : "Reactivate"}
                            className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-text-secondary hover:text-red-500 transition-colors'>
                            <Power size={14} />
                        </button>
                    </div>
                </td>
            </tr>
            {showDetail && (
                <EmployeeDetailModal employee={employee} organizationId={organizationId} onClose={() => setShowDetail(false)} />
            )}
            {showAssign && (
                <AssignInterviewModal employee={employee} organizationId={organizationId} onClose={() => setShowAssign(false)}
                    onSaved={() => { setShowAssign(false); onChanged() }} />
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
    const [showBulkUpload, setShowBulkUpload] = useState(false)

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

                        <div className='flex items-center gap-2'>
                            <Button variant="secondary" onClick={() => setShowBulkUpload(true)} className='!px-5'>
                                <Upload size={16} /> Bulk Upload (CSV)
                            </Button>
                            <Button onClick={() => setShowAddForm(true)} className='!px-5'>
                                <Plus size={16} /> Add Employee
                            </Button>
                        </div>
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

                            {trends.departmentBreakdown?.length > 0 && (
                                <div className='bg-card border border-line rounded-2xl p-6'>
                                    <h3 className='text-[15px] font-semibold text-ink mb-6 flex items-center gap-2'>
                                        <Building2 size={15} className='text-accent' /> Avg Score by Department
                                    </h3>
                                    <div className='h-56'>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={trends.departmentBreakdown}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                                                <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                                                <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }} />
                                                <Bar dataKey="avgScore" fill="#22C55E" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
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
                                            <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Department</th>
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

            {showBulkUpload && (
                <BulkUploadModal
                    organizationId={organizationId}
                    onClose={() => setShowBulkUpload(false)}
                    onDone={() => load()}
                />
            )}
        </div>
    )
}

export default AdminPanel
