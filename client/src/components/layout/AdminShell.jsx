import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardCheck, Building2, ChevronDown, LogOut, MessageCircleQuestion, FileText, Menu, Search, X, Settings, ClipboardList } from 'lucide-react'
import { useAuth, usePermission } from '../../hooks/useAuth.jsx'
import { featurePermissions } from '../../permissions/featurePermissions'
import logo from '../../assets/logo.png'

const NAV = [
    { to: '/platform/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: featurePermissions.dashboard },
    { to: '/platform/admin/forms', label: 'Forms', icon: FileText, permission: featurePermissions.formBuilder },
    { to: '/platform/admin/onboarding', label: 'Onboarding Review', icon: ClipboardCheck, permission: featurePermissions.onboarding },
    { to: '/platform/admin/clients', label: 'Clients', icon: Building2, permission: featurePermissions.clients },
    { to: '/platform/admin/oa-approvals', label: 'Online Assessment', icon: ClipboardList, permission: 'CLIENT_APPROVE' },
    { to: '/platform/admin/enquiries', label: 'Enquiries', icon: MessageCircleQuestion, permission: featurePermissions.enquiries },
    { to: '/platform/admin/settings', label: 'Settings', icon: Settings, permission: featurePermissions.settings },
]

function AdminShell({ children }) {
    const { user, logout } = useAuth()
    const hasPermission = usePermission()
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const profileRef = useRef(null)
    const avatarUrl = user?.photoUrl || user?.avatarUrl || user?.picture
    const userInitials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'

    // Below lg the sidebar is a drawer: closed by a link click, the backdrop, or Escape.
    useEffect(() => {
        if (!mobileOpen) return undefined
        const onKey = (event) => { if (event.key === 'Escape') setMobileOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [mobileOpen])

    useEffect(() => {
        if (!profileOpen) return undefined
        const onPointerDown = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false)
        }
        const onKeyDown = (event) => { if (event.key === 'Escape') setProfileOpen(false) }
        document.addEventListener('mousedown', onPointerDown)
        window.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [profileOpen])

    const handleLogout = async () => {
        setProfileOpen(false)
        await logout()
        navigate('/login')
    }

    return (
        <div className='min-h-screen bg-bg flex'>
            {mobileOpen && <div className='fixed inset-0 z-[var(--z-drawer)] bg-black/40 lg:hidden' onClick={() => setMobileOpen(false)} aria-hidden='true' />}
            <aside
                className={`fixed inset-y-0 left-0 z-[var(--z-drawer)] w-[240px] shrink-0 border-r border-line bg-card flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className='flex items-center gap-2.5 px-5 h-[64px] border-b border-line'>
                    <img src={logo} alt='' className='w-8 h-8 rounded-full' />
                    <span className='font-display text-[14.5px] font-bold text-ink flex-1'>WorkmateIQ</span>
                    <button onClick={() => setMobileOpen(false)} aria-label='Close menu' className='lg:hidden text-text-secondary hover:text-ink'>
                        <X size={18} />
                    </button>
                </div>
                <nav className='flex-1 p-3 space-y-1'>
                    {NAV.filter((item) => hasPermission(item.permission)).map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
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
            <div className='flex-1 min-w-0 flex flex-col'>
                <header className='sticky top-0 z-[var(--z-sticky-header)] flex items-center gap-3 h-14 lg:h-16 px-4 sm:px-6 border-b border-line bg-card/95 backdrop-blur-md'>
                    <button onClick={() => setMobileOpen(true)} aria-label='Open menu' className='-ml-1 p-1.5 text-text-secondary hover:text-ink lg:hidden'>
                        <Menu size={20} />
                    </button>
                    <img src={logo} alt='' className='w-7 h-7 rounded-full lg:hidden' />
                    <span className='font-display text-[14.5px] font-bold text-ink lg:hidden'>WorkmateIQ</span>
                    <label className='relative flex-1 max-w-[268px] lg:ml-0'>
                        <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none' />
                        <input
                            type='search'
                            placeholder='Search'
                            aria-label='Search'
                            className='w-full h-9 pl-9 pr-3 text-[12px] text-ink bg-card border border-line rounded-md outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors'
                        />
                    </label>
                    <div ref={profileRef} className='relative ml-auto'>
                        <button
                            type='button'
                            onClick={() => setProfileOpen((open) => !open)}
                            aria-label={`Account menu for ${user?.name || 'user'}`}
                            aria-expanded={profileOpen}
                            aria-controls='account-menu'
                            className='flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-black/[0.04] transition-colors'
                        >
                            <span className='relative flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-[11px] font-semibold overflow-hidden' aria-hidden='true'>
                                {userInitials}
                                {avatarUrl && <img src={avatarUrl} alt='' className='absolute inset-0 w-full h-full object-cover' onError={(event) => { event.currentTarget.style.display = 'none' }} />}
                            </span>
                            <span className='hidden sm:block max-w-[140px] text-[13px] font-medium text-ink truncate'>{user?.name}</span>
                            <ChevronDown size={14} className={`hidden sm:block text-text-secondary transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {profileOpen && (
                            <div id='account-menu' className='absolute right-0 top-full mt-2 w-56 p-1.5 bg-card border border-line rounded-xl shadow-[var(--shadow-lift)]'>
                                <div className='px-3 py-2'>
                                    <p className='text-[13px] font-medium text-ink truncate'>{user?.name}</p>
                                    <p className='text-[11.5px] text-text-secondary truncate'>{user?.email}</p>
                                </div>
                                <div className='my-1 border-t border-line' />
                                <button
                                    type='button'
                                    onClick={handleLogout}
                                    className='w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:bg-black/[0.04] hover:text-ink transition-colors'
                                >
                                    <LogOut size={15} /> Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </header>
                <main className='flex-1 min-w-0 overflow-x-hidden'>
                    <div className='p-4 sm:p-6 lg:p-8'>{children}</div>
                </main>
            </div>
        </div>
    )
}

export default AdminShell
