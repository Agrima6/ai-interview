import React from 'react'
import { Menu, Search, Bell } from 'lucide-react'
import { Avatar } from '../ui'
import { useAuth } from '../../hooks/useAuth.jsx'

/**
 * `title`/`description` are the page header (section 7) - each page passes
 * its own, so this stays generic instead of hardcoding "Dashboard" copy.
 * `onMenuClick` opens the mobile sidebar drawer; hidden entirely on
 * desktop where the sidebar is always visible.
 */
function OrganizationTopbar({ title, description, action, onMenuClick, onSearch }) {
    const { user } = useAuth()

    return (
        <div className='mb-8'>
            <div className='flex items-center gap-3 mb-1'>
                <button onClick={onMenuClick} aria-label='Open menu' className='lg:hidden -ml-1 p-1.5 text-text-secondary hover:text-ink shrink-0'>
                    <Menu size={20} />
                </button>
                <h1 className='font-display text-[22px] font-bold text-ink flex-1 min-w-0 truncate'>{title}</h1>
                <div className='hidden md:flex items-center gap-3 shrink-0'>
                    {onSearch && (
                        <div className='relative'>
                            <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none' />
                            <input
                                onChange={(e) => onSearch(e.target.value)}
                                placeholder='Search candidates, drives...'
                                aria-label='Search'
                                className='w-[220px] pl-9 pr-3.5 py-2 text-[13px] text-ink bg-card border border-line rounded-xl outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 transition-colors'
                            />
                        </div>
                    )}
                    <button aria-label='Notifications' className='relative w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-ink transition-colors'>
                        <Bell size={17} />
                    </button>
                    <Avatar name={user?.name} size='sm' />
                </div>
            </div>
            {description && <p className='text-text-secondary text-[14px] mb-4'>{description}</p>}
            {action && <div>{action}</div>}
        </div>
    )
}

export default OrganizationTopbar
