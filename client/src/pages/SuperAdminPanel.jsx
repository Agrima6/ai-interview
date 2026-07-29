import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Building2, Users, ClipboardList, TrendingUp, Plus, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Button from '../components/Button'
import { createOrganization, listOrganizations } from '../utils/adminApi'

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

function AddOrganizationModal({ onClose, onAdded }) {
    const [orgName, setOrgName] = useState("")
    const [adminName, setAdminName] = useState("")
    const [adminEmail, setAdminEmail] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!orgName.trim() || !adminName.trim() || !adminEmail.trim()) return
        setSaving(true)
        setError("")
        try {
            await createOrganization(orgName.trim(), adminName.trim(), adminEmail.trim())
            onAdded()
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create organization.")
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
                    <h3 className='text-[17px] font-semibold text-ink'>Add Organization</h3>
                    <button onClick={onClose} className='text-text-secondary hover:text-ink'><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className='space-y-3'>
                    <input type="text" placeholder="Organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                        className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />
                    <input type="text" placeholder="Admin's full name" value={adminName} onChange={(e) => setAdminName(e.target.value)}
                        className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />
                    <input type="email" placeholder="Admin's email address" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                        className='w-full px-4 py-2.5 text-[14px] text-ink bg-card border border-line rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors' />
                    {error && <p className='text-[12.5px] text-red-500'>{error}</p>}
                    <Button type="submit" disabled={saving} className='w-full !py-2.5'>
                        {saving ? "Creating..." : "Create Organization"}
                    </Button>
                </form>
            </motion.div>
        </div>
    )
}

function SuperAdminPanel() {
    const navigate = useNavigate()
    const [orgs, setOrgs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [showAddForm, setShowAddForm] = useState(false)

    const load = async () => {
        setLoading(true)
        setError("")
        try {
            const data = await listOrganizations()
            setOrgs(data)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load organizations.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const totals = orgs.reduce((acc, o) => ({
        employees: acc.employees + o.employeeCount,
        interviews: acc.interviews + o.interviewCount,
    }), { employees: 0, interviews: 0 })

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
                                <p className='text-[13px] font-semibold text-accent tracking-wide uppercase mb-2'>Super Admin</p>
                                <h1 className='text-[32px] font-semibold text-ink leading-tight'>Organizations</h1>
                                <p className='text-text-secondary mt-2 text-[15px]'>Manage every organization on the platform</p>
                            </div>
                        </div>

                        <Button onClick={() => setShowAddForm(true)} className='!px-5'>
                            <Plus size={16} /> Add Organization
                        </Button>
                    </div>

                    {loading ? (
                        <p className='text-text-secondary text-[14px]'>Loading...</p>
                    ) : error ? (
                        <p className='text-red-500 text-[14px]'>{error}</p>
                    ) : (
                        <>
                            <div className='grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8'>
                                <StatCard icon={Building2} label="Organizations" value={orgs.length} />
                                <StatCard icon={Users} label="Total Employees" value={totals.employees} />
                                <StatCard icon={ClipboardList} label="Total Interviews" value={totals.interviews} />
                            </div>

                            <div className='bg-card border border-line rounded-2xl p-6 overflow-x-auto'>
                                {orgs.length === 0 ? (
                                    <p className='text-text-secondary text-[14px]'>No organizations yet. Add your first one.</p>
                                ) : (
                                    <table className='w-full min-w-[720px]'>
                                        <thead>
                                            <tr className='border-b border-line text-left'>
                                                <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Organization</th>
                                                <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Admin</th>
                                                <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Employees</th>
                                                <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Interviews</th>
                                                <th className='pb-3 pr-4 text-[12px] font-medium text-text-secondary uppercase tracking-wide'>Avg Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orgs.map((org) => (
                                                <tr key={org._id} onClick={() => navigate(`/admin?organizationId=${org._id}`)}
                                                    className='border-b border-line last:border-0 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors'>
                                                    <td className='py-3 pr-4 text-[14px] font-medium text-ink'>{org.name}</td>
                                                    <td className='py-3 pr-4 text-[13px] text-text-secondary'>
                                                        {org.admin ? `${org.admin.name} (${org.admin.email})` : '-'}
                                                    </td>
                                                    <td className='py-3 pr-4 text-[13.5px] text-ink'>{org.employeeCount}</td>
                                                    <td className='py-3 pr-4 text-[13.5px] text-ink'>{org.interviewCount}</td>
                                                    <td className='py-3 pr-4 text-[13.5px] text-ink'>{org.avgScore || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <Footer />

            {showAddForm && (
                <AddOrganizationModal
                    onClose={() => setShowAddForm(false)}
                    onAdded={() => { setShowAddForm(false); load() }}
                />
            )}
        </div>
    )
}

export default SuperAdminPanel
