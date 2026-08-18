import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardCheck, Building2, LogOut, MessageCircleQuestion, FileText } from 'lucide-react'
import { useAuth, usePermission } from '../../hooks/useAuth.jsx'
import { featurePermissions } from '../../permissions/featurePermissions'
import logo from '../../assets/logo.png'

const NAV = [
    { to: '/platform/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: featurePermissions.dashboard },
    { to: '/platform/admin/forms', label: 'Forms', icon: FileText, permission: featurePermissions.formBuilder },
    { to: '/platform/admin/onboarding', label: 'Onboarding Review', icon: ClipboardCheck, permission: featurePermissions.onboarding },
    { to: '/platform/admin/clients', label: 'Clients', icon: Building2, permission: featurePermissions.clients },
    { to: '/platform/admin/enquiries', label: 'Enquiries', icon: MessageCircleQuestion, permission: featurePermissions.enquiries },
]

function AdminShell({ children }) {
    const { user, logout } = useAuth()
    const hasPermission = usePermission()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/platform/login')
    }

    return (
        <div className='min-h-screen bg-bg flex'>
            <aside className='w-[240px] shrink-0 border-r border-line bg-card flex flex-col'>
                <div className='flex items-center gap-2.5 px-5 h-[64px] border-b border-line'>
                    <img src={logo} alt='' className='w-8 h-8 rounded-full' />
                    <span className='font-display text-[14.5px] font-bold text-ink'>WorkmateIQ</span>
                </div>
                <nav className='flex-1 p-3 space-y-1'>
                    {NAV.filter((item) => hasPermission(item.permission)).map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-black/[0.03] hover:text-ink'}`
                            }
                        >
                            <item.icon size={16} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className='p-3 border-t border-line'>
                    <div className='px-3 py-2 mb-1'>
                        <p className='text-[13px] font-medium text-ink truncate'>{user?.name}</p>
                        <p className='text-[11.5px] text-text-secondary truncate'>{user?.email}</p>
                    </div>
                    <button onClick={handleLogout} className='w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] text-text-secondary hover:bg-black/[0.03] hover:text-ink transition-colors'>
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </aside>
            <main className='flex-1 min-w-0 p-8'>{children}</main>
        </div>
    )
}

export default AdminShell
