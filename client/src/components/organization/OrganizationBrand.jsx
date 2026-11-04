import React from 'react'
import { resolveAssetUrl } from '../../api/client'

/**
 * Organization identity in the sidebar/topbar - fully data-driven, never
 * hardcoded. `profile` is the view model from useOrganizationProfile():
 * { name, logoUrl, primaryColor, secondaryColor }.
 *
 * The mark is a navy tile with the logo (or the organization's initial) and
 * an accent corner dot; `subtitle` is the small line under the name.
 */
function OrganizationBrand({ profile, loading, showName = true, subtitle = 'WorkmateIQ workspace', className = '' }) {
    if (loading) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <div className='w-11 h-11 rounded-[14px] bg-black/[0.06] animate-pulse' />
                {showName && <div className='space-y-1.5'><div className='h-3.5 w-24 rounded bg-black/[0.06] animate-pulse' /><div className='h-3 w-32 rounded bg-black/[0.05] animate-pulse' /></div>}
            </div>
        )
    }

    const name = profile?.name || 'Organization'
    const logo = resolveAssetUrl(profile?.logoUrl)

    return (
        <div className={`flex items-center gap-3 min-w-0 ${className}`}>
            <div className='relative w-11 h-11 shrink-0 rounded-[14px] bg-[var(--color-navy)] text-white flex items-center justify-center font-extrabold text-[18px] overflow-hidden'>
                {logo ? <img src={logo} alt='' className='w-full h-full object-cover' /> : name.charAt(0).toUpperCase()}
                <span aria-hidden='true' className='absolute -right-1.5 -bottom-1.5 w-5 h-5 rounded-full bg-[var(--color-accent-cyan)]' />
            </div>
            {showName && (
                <div className='min-w-0 flex flex-col leading-tight'>
                    <span className='text-[16px] font-bold text-ink truncate'>{name}</span>
                    {subtitle && <span className='text-[12px] text-text-secondary truncate'>{subtitle}</span>}
                </div>
            )}
        </div>
    )
}

export default OrganizationBrand
