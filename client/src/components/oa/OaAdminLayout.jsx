import React, { useEffect, useState } from 'react'
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion as M } from 'motion/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Layers, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { oaApi, oaTokens } from '../../api/oaApi'
import { useAuth } from '../../hooks/useAuth.jsx'
import { ErrorState } from './oaUi'
import Avatar from '../ui/Avatar'
import logo from '../../assets/logo.webp'

const NAV = [
    { to: '/oa/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/oa/admin/drives', label: 'Drives', icon: Layers },
]

// Gate + shell for the organizer side of Online Assessment. An organization admin walks in on their platform
// sign-in: the first visit trades it for an Online Assessment session, so nobody signs in twice.
export function RequireOaAdmin({ children }) {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const queryClient = useQueryClient()
    const auth = useAuth()
    const [hasToken, setHasToken] = useState(() => Boolean(oaTokens.get('admin')))
    const [bridgeError, setBridgeError] = useState(null)
    const [open, setOpen] = useState(false)

    const needsBridge = !hasToken && auth.status === 'authenticated' && !bridgeError
    useEffect(() => {
        if (!needsBridge) return undefined
        let cancelled = false
        oaApi.orgSession().then(() => { if (!cancelled) setHasToken(true) }).catch((error) => { if (!cancelled) setBridgeError(error) })
        return () => { cancelled = true }
    }, [needsBridge])
    const me = useQuery({ queryKey: ['oa', 'me'], queryFn: oaApi.me, enabled: hasToken, retry: false, staleTime: 5 * 60 * 1000 })

    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => e.key === 'Escape' && setOpen(false)
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    if (!hasToken) {
        if (bridgeError) return <div className='min-h-screen bg-bg flex items-center justify-center p-6'><ErrorState title='Online Assessment could not be opened' message={bridgeError.message} onRetry={() => setBridgeError(null)} /></div>
        if (auth.status === 'anonymous') return <Navigate to='/login' replace />
        return <div className='min-h-screen bg-bg flex items-center justify-center text-[13px] text-text-secondary' role='status'>Opening Online Assessment…</div>
    }
    if (me.isError && ['ACCOUNT_INACTIVE', 'FORBIDDEN'].includes(me.error?.code)) { oaTokens.clear('admin'); return <Navigate to='/oa/login?inactive=1' replace /> }

    // Signing out leaves both rooms and lands on the public site.
    const signOut = async () => {
        oaApi.logout(); queryClient.removeQueries({ queryKey: ['oa'] })
        if (auth.status === 'authenticated') await auth.logout()
        navigate('/')
    }

    return (
        <div className='min-h-screen bg-bg flex'>
            {open && <div className='fixed inset-0 z-[var(--z-drawer)] bg-[#1a1215]/45 lg:hidden' onClick={() => setOpen(false)} aria-hidden='true' />}
            <aside className={`fixed inset-y-0 left-0 z-[var(--z-drawer)] w-[248px] border-r border-line bg-card flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className='flex items-center gap-2.5 px-5 h-[64px] border-b border-line'>
                    <img src={logo} alt='' className='w-8 h-8 rounded-full' />
                    <div className='flex-1 leading-tight'>
                        <div className='font-display text-[14px] font-bold text-ink'>WorkmateIQ</div>
                        <div className='text-[11px] font-semibold text-accent tracking-wide'>Online Assessment</div>
                    </div>
                    <button onClick={() => setOpen(false)} aria-label='Close menu' className='lg:hidden text-text-secondary hover:text-ink'><X size={18} /></button>
                </div>
                <nav className='flex-1 p-3 space-y-1' aria-label='Online Assessment'>
                    {NAV.map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
                            className={({ isActive }) => `relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-text-secondary hover:bg-black/[0.03] hover:text-ink'}`}>
                            {({ isActive }) => (
                                <>
                                    {isActive && <M.span layoutId='oa-nav-pill' transition={{ type: 'spring', duration: 0.4, bounce: 0.18 }} className='absolute inset-0 rounded-xl bg-accent/10' aria-hidden='true' />}
                                    {isActive && <M.span layoutId='oa-nav-bar' transition={{ type: 'spring', duration: 0.4, bounce: 0.18 }} className='absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent' aria-hidden='true' />}
                                    <item.icon size={16} className='relative' /><span className='relative'>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
                <div className='p-3 border-t border-line'>
                    {auth.status === 'authenticated' && (
                        <NavLink to='/workspace' className='mb-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-line text-[13px] font-semibold text-ink hover:border-accent/40 hover:text-accent transition-colors'>
                            <ArrowLeftRight size={15} /> Switch to AI Interview
                        </NavLink>
                    )}
                    <div className='flex items-center gap-2.5 px-2 py-2'>
                        <Avatar name={me.data?.orgName || '?'} size='sm' />
                        <div className='min-w-0 flex-1'>
                            <div className='text-[13px] font-semibold text-ink truncate'>{me.data?.orgName || 'Loading…'}</div>
                            <div className='text-[11.5px] text-text-secondary truncate'>{me.data?.email}</div>
                        </div>
                    </div>
                    <button onClick={signOut} className='w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-text-secondary hover:bg-black/[0.03] hover:text-ink'>
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </aside>
            <div className='flex-1 min-w-0 flex flex-col'>
                <header className='lg:hidden sticky top-0 z-[var(--z-sticky-header)] h-14 bg-card border-b border-line flex items-center gap-3 px-4'>
                    <button onClick={() => setOpen(true)} aria-label='Open menu' className='text-ink'><Menu size={20} /></button>
                    <span className='font-display text-[14px] font-bold text-ink'>Online Assessment</span>
                </header>
                <main className='flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8'>
                    {me.isError ? <ErrorState message={me.error.message} onRetry={() => me.refetch()} /> : <div key={pathname} className='oa-page'>{children}</div>}
                </main>
            </div>
        </div>
    )
}
