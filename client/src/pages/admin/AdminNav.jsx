import React from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { LayoutDashboard, Library, ListChecks, Send, Users } from 'lucide-react'

const NAV_ITEMS = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/employees", label: "Employees", icon: Users },
    { to: "/admin/question-banks", label: "Question Banks", icon: Library },
    { to: "/admin/templates", label: "Templates", icon: ListChecks },
    { to: "/admin/invites", label: "Invites", icon: Send },
]

// Shared tab navigation across the admin "Conduct Interview" area - keeps the
// Dashboard, Employees, Question Banks, Templates and Invites pages linked
// together, preserving the ?organizationId= param superadmins rely on.
function AdminNav() {
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const qs = searchParams.toString()

    return (
        <div className='flex items-center gap-1 mb-8 bg-black/[0.03] dark:bg-white/[0.05] p-1 rounded-full w-fit flex-wrap'>
            {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to)
                const Icon = item.icon
                return (
                    <Link
                        key={item.to}
                        to={qs ? `${item.to}?${qs}` : item.to}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13.5px] font-medium transition-colors ${
                            isActive ? "bg-accent text-white" : "text-text-secondary hover:text-ink"
                        }`}>
                        <Icon size={14} /> {item.label}
                    </Link>
                )
            })}
        </div>
    )
}

export default AdminNav
