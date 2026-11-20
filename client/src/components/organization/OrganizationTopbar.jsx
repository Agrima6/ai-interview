import React from 'react'
import { Menu, Search } from 'lucide-react'
import { NotificationsMenu, ProfileMenu } from './TopbarMenus'

/**
 * `title`/`description` are the page header - each page passes its own, so
 * this stays generic instead of hardcoding copy. `eyebrow` is the small line
 * above the title (e.g. a greeting). `action` sits on the right of the title
 * on wide screens and wraps underneath on narrow ones. Search shows when a page passes `onSearch` (called with the query on Enter); the notification bell and account menu are on every page.
 * `onMenuClick` opens the mobile sidebar drawer.
 */
function OrganizationTopbar({ title, description, eyebrow, action, onMenuClick, onSearch }) {
    return (
        <header className='ui-fade mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4'>
            <div className='min-w-0 flex-1 basis-[280px]'>
                <div className='flex items-start gap-3'>
                    <button onClick={onMenuClick} aria-label='Open menu' className='lg:hidden mt-1 -ml-1 p-1.5 text-text-secondary hover:text-ink shrink-0'>
                        <Menu size={22} />
                    </button>
                    <div className='min-w-0'>
                        {eyebrow && (
                            <p className='mb-1 flex items-center gap-2 text-[13px] font-semibold text-accent'>
                                <span className='w-2 h-2 rounded-full bg-[var(--color-success)]' />{eyebrow}
                            </p>
                        )}
                        <h1 className='text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] leading-tight text-ink [overflow-wrap:anywhere]'>{title}</h1>
                        {description && <p className='mt-1 text-text-secondary text-[14px] [overflow-wrap:anywhere]'>{description}</p>}
                    </div>
                </div>
            </div>
            <div className='flex min-w-0 max-w-full flex-wrap items-center gap-3'>
                {onSearch && (
                    <div className='ui-field hidden md:flex items-center gap-2.5 h-11 px-4 w-[260px] rounded-[14px] border-[1.5px] border-line bg-card text-text-secondary'>
                        <Search size={16} className='shrink-0' />
                        <input
                            onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) onSearch(e.currentTarget.value.trim()) }}
                            placeholder='Search drives, candidates…'
                            aria-label='Search'
                            className='flex-1 min-w-0 bg-transparent text-[14px] text-ink outline-none'
                        />
                        <kbd className='text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-surface-muted)] text-text-secondary'>⌘K</kbd>
                    </div>
                )}
                <NotificationsMenu />
                <ProfileMenu />
                {action}
            </div>
        </header>
    )
}

export default OrganizationTopbar
