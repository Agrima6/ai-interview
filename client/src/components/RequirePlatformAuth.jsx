import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, usePermission } from '../hooks/useAuth.jsx'
import AdminShell from './layout/AdminShell'

// Gate for the new microservices-backed admin area - distinct from the
// existing Firebase-based RequireAuth used by the interview product.
//
// `permission` is optional so this can still gate pages that only need
// "is logged in" (none currently do, but keeps the component general).
// When given, an unauthorized user never mounts `children` at all - the
// page's own API calls and data fetching never fire, matching "hide nav
// item, don't call API, don't render page" rather than relying on each
// page to individually no-op on missing permission (which most already do,
// but this closes the gap for any route that doesn't).
function RequirePlatformAuth({ children, permission }) {
    const { status } = useAuth()
    const hasPermission = usePermission()

    if (status === 'loading') {
        return <div className='min-h-screen flex items-center justify-center text-[13px] text-text-secondary'>Loading...</div>
    }
    if (status === 'anonymous') {
        return <Navigate to='/platform/login' replace />
    }
    if (permission && !hasPermission(permission)) {
        return <AdminShell><p className='text-text-secondary text-[14px]'>You don't have permission to access this section.</p></AdminShell>
    }
    return children
}

export default RequirePlatformAuth
