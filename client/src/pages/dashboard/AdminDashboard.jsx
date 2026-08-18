import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Loader2, CheckCircle2, Building2, TrendingUp, MessageCircleQuestion } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import { StatCard } from '../../components/ui'
import { usePermission } from '../../hooks/useAuth.jsx'
import { featurePermissions } from '../../permissions/featurePermissions'
import { getDashboardSummary } from '../../api/dashboardApi'

function AdminDashboard() {
    const hasPermission = usePermission()
    const [summary, setSummary] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!hasPermission(featurePermissions.dashboard)) return
        getDashboardSummary().then(setSummary).catch((err) => setError(err.message))
    }, [])

    if (!hasPermission(featurePermissions.dashboard)) {
        return <AdminShell><p className='text-text-secondary text-[14px]'>You don't have access to the dashboard.</p></AdminShell>
    }

    const cards = [
        [FileText, 'Total registrations', summary?.totalRegistrations, '/platform/admin/onboarding'],
        [Loader2, 'Active onboarding', summary?.activeOnboarding, '/platform/admin/onboarding'],
        [TrendingUp, 'Pending review', summary?.pendingReview, '/platform/admin/onboarding'],
        [CheckCircle2, 'Completion rate', summary ? `${summary.completionRate}%` : undefined, '/platform/admin/onboarding'],
        [Building2, 'Active clients', summary?.activeClients, '/platform/admin/clients'],
        [MessageCircleQuestion, 'New enquiries', summary?.newEnquiries, '/platform/admin/enquiries'],
    ]

    return (
        <AdminShell>
            <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Dashboard</h1>
            <p className='text-text-secondary text-[14px] mb-8'>An overview of registrations moving through WorkmateIQ.</p>

            {error && <p className='text-[13.5px] text-red-500 mb-4'>{error}</p>}

            <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                {cards.map(([Icon, label, value, to]) => (
                    <Link key={label} to={to}>
                        <StatCard icon={Icon} label={label} value={value === undefined || value === null ? '—' : value} className='cursor-pointer' />
                    </Link>
                ))}
            </div>
        </AdminShell>
    )
}

export default AdminDashboard
