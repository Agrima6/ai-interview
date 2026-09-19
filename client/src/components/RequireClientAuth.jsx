import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

// Gate for the client portal (organizations/colleges approved via
// onboarding) - same session/auth-service as the admin side, just a
// different landing point when signed out.
function RequireClientAuth({ children }) {
    const { status, user } = useAuth()

    if (status === 'loading') {
        return <div className='min-h-screen flex items-center justify-center text-[13px] text-text-secondary'>Loading...</div>
    }
    if (status === 'anonymous') {
        return <Navigate to='/platform/client/login' replace />
    }

    // A user with only CANDIDATE role must never access organization routes
    const isClientAdmin = user?.roles?.includes('CLIENT_ADMIN') || user?.roles?.includes('SUPER_ADMIN')
    const hasClientPermission = user?.permissions?.includes('CLIENT_SELF_READ') || user?.permissions?.includes('CLIENT_READ')

    if (!isClientAdmin && !hasClientPermission) {
        if (user?.roles?.includes('CANDIDATE')) {
            return <Navigate to='/candidate/room' replace />
        }
        return <Navigate to='/platform/client/login' replace />
    }

    if (user?.mustChangePassword) {
        return <Navigate to='/platform/client/change-password' replace />
    }

    return children
}

export default RequireClientAuth
