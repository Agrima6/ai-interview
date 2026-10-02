import React from 'react'
import { Avatar } from '../ui'

/**
 * Organization identity in the sidebar/topbar - fully data-driven, never
 * hardcoded. `profile` is the view model from useOrganizationProfile():
 * { name, logoUrl, primaryColor, secondaryColor }.
 */
function OrganizationBrand({ profile, loading, size = 'md', showName = true, className = '' }) {
    if (loading) {
        return (
            <div className={`flex items-center gap-2.5 ${className}`}>
                <div className='w-9 h-9 rounded-full bg-black/[0.06] dark:bg-white/[0.08] animate-pulse' />
                {showName && <div className='h-3.5 w-28 rounded bg-black/[0.06] dark:bg-white/[0.08] animate-pulse' />}
            </div>
        )
    }

    const name = profile?.name || 'Organization'

    return (
        <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
            <Avatar src={profile?.logoUrl} name={name} size={size} />
            {showName && <span className='font-display text-[14.5px] font-bold text-ink truncate'>{name}</span>}
        </div>
    )
}

export default OrganizationBrand
