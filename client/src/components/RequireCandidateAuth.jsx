import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

// Gate for the candidate portal (self-service applicants) - same
// session/auth-service as the org/client side, just scoped to the
// CANDIDATE role and a different landing point when signed out.
function RequireCandidateAuth({ children }) {
    const { status, user } = useAuth()

    if (status === 'loading') {
        return <div className='min-h-screen flex items-center justify-center text-[13px] text-text-secondary'>Loading...</div>
    }
    if (status === 'anonymous' || !user?.roles?.includes('CANDIDATE')) {
        return <Navigate to='/candidate/login' replace />
    }
    if (user?.mustChangePassword) {
        return <Navigate to='/candidate/change-password' replace />
    }
    return children
}

export default RequireCandidateAuth
