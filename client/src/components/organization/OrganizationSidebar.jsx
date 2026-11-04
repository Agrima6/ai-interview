import React from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
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
    const teamPath = navItems.find((item) => item.key === 'team')?.path

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
                        className='fixed inset-0 z-[var(--z-drawer)] bg-[#0d1233]/45 backdrop-blur-[2px] lg:hidden' onClick={onClose} aria-hidden='true'
                    />
                )}
            </AnimatePresence>
            <aside
                className={`
                    fixed inset-y-0 left-0 z-[var(--z-drawer)] w-[264px] shrink-0 border-r border-line bg-card flex flex-col
                    transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                    lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className='flex items-center justify-between gap-2.5 px-6 pt-6 pb-5'>
                    <OrganizationBrand profile={profile} loading={profileLoading} />
                    <button onClick={onClose} aria-label='Close menu' className='lg:hidden text-text-secondary hover:text-ink'>
                        <X size={18} />
                    </button>
                </div>
                <nav aria-label='Main' className='flex-1 px-4 overflow-y-auto'>
                    <span className='block text-[11px] font-bold tracking-[0.08em] text-text-secondary px-3 pb-2'>WORKSPACE</span>
                    <div className='space-y-1'>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.key}
                                to={item.path}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `group relative flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 ${isActive ? 'text-white' : 'text-[#3a4262] hover:bg-accent/[0.06] hover:text-accent hover:translate-x-[3px]'}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.span
                                                layoutId='org-nav-active'
                                                className='absolute inset-0 rounded-xl bg-accent shadow-[0_10px_22px_-12px_var(--color-accent)]'
                                                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                            />
                                        )}
                                        <item.icon size={20} strokeWidth={1.8} className='relative' />
                                        <span className='relative'>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>
                {teamPath && (
                    <div className='mx-4 mt-4 relative overflow-hidden rounded-[18px] [@media(max-height:760px)]:hidden bg-[var(--color-navy)] text-white p-5'>
                        <div aria-hidden='true' className='absolute -right-10 -top-10 w-[130px] h-[130px] rounded-full border border-dashed border-white/25' />
                        <p className='font-bold text-[15px] mb-1.5'>Hire together</p>
                        <p className='text-[13px] leading-relaxed text-[#c3c9ee] mb-4'>Invite teammates to review AI interviews and score candidates.</p>
                        <Link to={teamPath} onClick={onClose} className='inline-flex items-center min-h-[40px] px-3.5 rounded-xl bg-white/10 border border-white/20 text-[13px] font-semibold hover:bg-white/20 transition-colors'>
                            Invite team
                        </Link>
                    </div>
                )}
                <div className='p-4 mt-2 border-t border-line flex items-center gap-2.5'>
                    <Avatar name={user?.name || user?.email || '?'} size='sm' />
                    <div className='min-w-0 flex-1'>
                        <p className='text-[13px] font-semibold text-ink truncate'>{user?.name}</p>
                        <p className='text-[11.5px] text-text-secondary truncate'>{user?.email}</p>
                    </div>
                    <button onClick={handleLogout} aria-label='Sign out' title='Sign out' className='w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:bg-accent/[0.06] hover:text-accent transition-colors'>
                        <LogOut size={17} />
                    </button>
                </div>
            </aside>
        </>
    )
}

export default OrganizationSidebar
