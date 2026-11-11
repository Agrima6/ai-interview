import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
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
function OrganizationLayout({ title, description, eyebrow, action, onSearch, children }) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const { user } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const reduceMotion = useReducedMotion()
    const { data: profile, isLoading: profileLoading } = useOrganizationProfile()
    const themeStyle = useOrganizationThemeStyle(profile)

    // Carried over from the old placeholder ClientDashboard.jsx - a client
    // user who hasn't changed their temporary password yet must not reach
    // any Organization page until they do.
    useEffect(() => {
        if (user?.mustChangePassword) navigate('/platform/client/change-password', { replace: true })
    }, [user, navigate])

    // Scope the workspace design tokens to <html> while an organization page
    // is on screen so portalled modals/drawers/toasts share them.
    useEffect(() => {
        document.documentElement.classList.add('org-theme')
        return () => document.documentElement.classList.remove('org-theme')
    }, [])

    // The org's own colours/font are mirrored onto <html> as well, because
    // portalled modals, drawers and toasts render outside this wrapper and
    // would otherwise show the default palette next to a branded page.
    const themeKey = themeStyle ? JSON.stringify(themeStyle) : ''
    useEffect(() => {
        if (!themeStyle) return undefined
        const root = document.documentElement
        const entries = Object.entries(themeStyle).filter(([key]) => key.startsWith('--'))
        entries.forEach(([key, value]) => root.style.setProperty(key, value))
        return () => entries.forEach(([key]) => root.style.removeProperty(key))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [themeKey])

    return (
        <div className='min-h-screen bg-bg flex relative isolate' style={themeStyle}>
            <OrganizationSidebar profile={profile} profileLoading={profileLoading} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <main className='flex-1 min-w-0 px-4 py-6 sm:px-[clamp(16px,3vw,44px)] sm:pt-7 pb-16 overflow-x-hidden'>
                <OrganizationTopbar title={title} description={description} eyebrow={eyebrow} action={action} onSearch={onSearch} onMenuClick={() => setMobileOpen(true)} />
                <motion.div
                    key={location.pathname}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                    {children}
                </motion.div>
            </main>
        </div>
    )
}

export default OrganizationLayout
