import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { organizationNavigation } from '../../config/organizationNavigation'
import OrganizationBrand from './OrganizationBrand'

/**
 * `mobileOpen`/`onClose` drive the drawer presentation on small screens;
 * on desktop the sidebar renders in-flow and those props are unused.
 */
function OrganizationSidebar({ profile, profileLoading, mobileOpen, onClose }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/platform/login')
    }

    return (
        <>
            {mobileOpen && (
                <div className='fixed inset-0 z-40 bg-black/40 lg:hidden' onClick={onClose} aria-hidden='true' />
            )}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-[240px] shrink-0 border-r border-line bg-card flex flex-col
                    transition-transform duration-200
                    lg:static lg:translate-x-0
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className='flex items-center justify-between gap-2.5 px-5 h-[64px] border-b border-line'>
                    <OrganizationBrand profile={profile} loading={profileLoading} />
                    <button onClick={onClose} aria-label='Close menu' className='lg:hidden text-text-secondary hover:text-ink'>
                        <X size={18} />
                    </button>
                </div>
                <nav className='flex-1 p-3 space-y-1 overflow-y-auto'>
                    {/* TODO: once auth-service issues organization.* permissions to
                        the CLIENT_ADMIN role, filter this list with
                        `hasPermission(item.permission)` - today no such permissions
                        are ever granted, so requiring them would hide the entire nav. */}
                    {organizationNavigation.map((item) => (
                            <NavLink
                                key={item.key}
                                to={item.path}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-ink'}`
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
                    <button onClick={handleLogout} className='w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] text-text-secondary hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-ink transition-colors'>
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </aside>
        </>
    )
}

export default OrganizationSidebar
