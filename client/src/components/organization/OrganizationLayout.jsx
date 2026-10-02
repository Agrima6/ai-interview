import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OrganizationSidebar from './OrganizationSidebar'
import OrganizationTopbar from './OrganizationTopbar'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useOrganizationProfile } from '../../hooks/organization/useOrganizationProfile'
import { useOrganizationThemeStyle } from '../../hooks/organization/useOrganizationTheme'

/**
 * The Organization application shell - sidebar + topbar + page content,
 * responsive (drawer on <lg), dynamically branded from the signed-in
 * organization's profile. Used the same way AdminShell is used on the
 * platform-admin side: wrap each page's content in it.
 *
 * <OrganizationLayout title="Dashboard" description="..." action={<Button>Create interview drive</Button>}>
 *   ...page content...
 * </OrganizationLayout>
 */
function OrganizationLayout({ title, description, action, onSearch, children }) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const { user } = useAuth()
    const navigate = useNavigate()
    const { data: profile, isLoading: profileLoading } = useOrganizationProfile()
    const themeStyle = useOrganizationThemeStyle(profile)

    // Carried over from the old placeholder ClientDashboard.jsx - a client
    // user who hasn't changed their temporary password yet must not reach
    // any Organization page until they do.
    useEffect(() => {
        if (user?.mustChangePassword) navigate('/platform/client/change-password', { replace: true })
    }, [user, navigate])

    return (
        <div className='min-h-screen bg-bg flex' style={themeStyle}>
            <OrganizationSidebar profile={profile} profileLoading={profileLoading} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <main className='flex-1 min-w-0 p-5 sm:p-8 overflow-x-hidden'>
                <OrganizationTopbar title={title} description={description} action={action} onSearch={onSearch} onMenuClick={() => setMobileOpen(true)} />
                {children}
            </main>
        </div>
    )
}

export default OrganizationLayout
