import React from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../hooks/useAuth.jsx'
import { getNavigationForPath } from '../../config/organizationNavigation'
import OrganizationBrand from './OrganizationBrand'

/**
 * `mobileOpen`/`onClose` drive the drawer presentation on small screens;
 * on desktop the sidebar renders in-flow and those props are unused.
 */
function OrganizationSidebar({ profile, profileLoading, mobileOpen, onClose }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const navItems = getNavigationForPath(location.pathname, profile?.type)

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <>
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                        className='fixed inset-0 z-[var(--z-drawer)] bg-black/40 backdrop-blur-[2px] lg:hidden' onClick={onClose} aria-hidden='true'
                    />
                )}
            </AnimatePresence>
            <aside
                className={`
                    fixed inset-y-0 left-0 z-[var(--z-drawer)] w-[240px] shrink-0 border-r border-line bg-card flex flex-col
                    transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
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
                    {navItems.map((item) => (
                        <NavLink
                            key={item.key}
                            to={item.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-text-secondary hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-ink'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <motion.span
                                            layoutId='org-nav-active'
                                            className='absolute inset-0 rounded-xl bg-accent/10 ring-1 ring-accent/15'
                                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                        />
                                    )}
                                    {isActive && <span className='absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent' />}
                                    <item.icon size={16} className='relative transition-transform duration-200 group-hover:scale-110' />
                                    <span className='relative'>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
                <div className='p-3 border-t border-line'>
                    <div className='px-3 py-2 mb-1 flex items-center gap-2.5'>
                        <Avatar name={user?.name || user?.email || '?'} size='sm' />
                        <div className='min-w-0'>
                            <p className='text-[13px] font-medium text-ink truncate'>{user?.name}</p>
                            <p className='text-[11.5px] text-text-secondary truncate'>{user?.email}</p>
                        </div>
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
