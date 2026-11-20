import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCircle2, LogOut, Mic, OctagonAlert, Settings } from 'lucide-react'
import { Avatar } from '../ui'
import { useAuth } from '../../hooks/useAuth.jsx'
import { listOrganizationNotifications } from '../../api/organization/organizationApi'
import { getNavigationForPath } from '../../config/organizationNavigation'

// A small dropdown that closes on an outside click or Escape. Content is rendered only while open.
function useDropdown() {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    useEffect(() => {
        if (!open) return undefined
        const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
    }, [open])
    return { open, setOpen, ref }
}

const ago = (iso) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.round(hours / 24)}d ago`
}
const SEEN_KEY = 'wiq.notifications.seen'
const readSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0 } catch { return 0 } }
const ICONS = { TEST_FINISHED: CheckCircle2, INTERVIEW_COMPLETED: Mic, TEST_ENDED: OctagonAlert }

/** Bell with the organization's recent activity: who finished a test or an AI interview. */
export function NotificationsMenu() {
    const { open, setOpen, ref } = useDropdown()
    const [seen, setSeen] = useState(readSeen)
    const query = useQuery({ queryKey: ['org', 'notifications'], queryFn: listOrganizationNotifications, refetchInterval: 60000, staleTime: 30000 })
    const items = query.data || []
    const unread = items.filter((n) => new Date(n.at).getTime() > seen).length
    const toggle = () => {
        if (!open) query.refetch()
        else { const now = Date.now(); setSeen(now); try { localStorage.setItem(SEEN_KEY, String(now)) } catch { /* private mode */ } }
        setOpen(!open)
    }

    return (
        <div ref={ref} className='relative'>
            <button onClick={toggle} aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'} aria-expanded={open} aria-haspopup='true'
                className='relative w-11 h-11 rounded-[14px] border-[1.5px] border-line bg-card flex items-center justify-center text-ink hover:border-accent/40 transition-colors'>
                <Bell size={18} />
                {unread > 0 && <span className='absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10.5px] font-bold flex items-center justify-center ring-2 ring-white'>{unread > 9 ? '9+' : unread}</span>}
            </button>
            {open && (
                <div role='dialog' aria-label='Notifications' className='absolute right-0 top-[calc(100%+8px)] z-[var(--z-popover)] w-[min(360px,calc(100vw-32px))] rounded-2xl border border-line bg-card shadow-[var(--shadow-lift)] overflow-hidden'>
                    <div className='px-4 py-3 border-b border-line text-[13.5px] font-bold text-ink'>Recent activity</div>
                    <div className='max-h-[380px] overflow-y-auto'>
                        {query.isLoading && <p className='px-4 py-6 text-[13px] text-text-secondary'>Loading…</p>}
                        {query.isError && <p className='px-4 py-6 text-[13px] text-text-secondary'>Could not load activity. <button className='text-accent font-semibold' onClick={() => query.refetch()}>Try again</button></p>}
                        {!query.isLoading && !query.isError && items.length === 0 && <p className='px-4 py-8 text-center text-[13px] text-text-secondary'>Nothing yet. When a candidate finishes a test or an AI interview, it shows up here.</p>}
                        {items.map((n) => {
                            const Icon = ICONS[n.type] || CheckCircle2
                            return (
                                <div key={n.id} className='flex items-start gap-3 px-4 py-3 border-b border-line/60 last:border-0'>
                                    <Icon size={16} className={`mt-0.5 shrink-0 ${n.type === 'TEST_ENDED' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`} aria-hidden='true' />
                                    <div className='min-w-0'>
                                        <p className='text-[13px] text-ink leading-snug [overflow-wrap:anywhere]'>{n.message}</p>
                                        <p className='text-[12px] text-text-secondary mt-0.5'>{n.detail ? `${n.detail} · ` : ''}{ago(n.at)}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

/** The avatar opens the account menu: who is signed in, Settings, Sign out. */
export function ProfileMenu() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const { open, setOpen, ref } = useDropdown()
    const [signingOut, setSigningOut] = useState(false)
    const settingsPath = getNavigationForPath(location.pathname).find((i) => i.key === 'settings')?.path

    const signOut = async () => {
        if (signingOut) return
        setSigningOut(true)
        try { await logout() } finally { navigate('/') }
    }

    return (
        <div ref={ref} className='relative'>
            <button onClick={() => setOpen(!open)} aria-label='Account menu' aria-expanded={open} aria-haspopup='true' className='rounded-full focus-visible:outline-2 focus-visible:outline-accent'>
                <Avatar name={user?.name || user?.email || '?'} size='sm' />
            </button>
            {open && (
                <div role='menu' className='absolute right-0 top-[calc(100%+8px)] z-[var(--z-popover)] w-[240px] rounded-2xl border border-line bg-card shadow-[var(--shadow-lift)] p-1.5'>
                    <div className='px-3 py-2.5 border-b border-line mb-1'>
                        <p className='text-[13.5px] font-semibold text-ink truncate'>{user?.name || 'Your account'}</p>
                        <p className='text-[12px] text-text-secondary truncate'>{user?.email}</p>
                    </div>
                    {settingsPath && (
                        <Link role='menuitem' to={settingsPath} onClick={() => setOpen(false)} className='flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] text-ink hover:bg-black/[0.04]'>
                            <Settings size={16} aria-hidden='true' /> Settings
                        </Link>
                    )}
                    <button role='menuitem' onClick={signOut} disabled={signingOut} className='w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] text-ink hover:bg-black/[0.04] disabled:opacity-60'>
                        <LogOut size={16} aria-hidden='true' /> {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </div>
            )}
        </div>
    )
}
