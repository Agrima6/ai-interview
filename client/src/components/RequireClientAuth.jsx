import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

// Gate for the client portal (organizations/colleges approved via
// onboarding) - same session/auth-service as the admin side, just a
// different landing point when signed out.
function RequireClientAuth({ children }) {
    const { status } = useAuth()

    if (status === 'loading') {
        return <div className='min-h-screen flex items-center justify-center text-[13px] text-text-secondary'>Loading...</div>
    }
    if (status === 'anonymous') {
        return <Navigate to='/platform/client/login' replace />
    }
    return children
}

export default RequireClientAuth
