import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

// Gate for the new microservices-backed admin area - distinct from the
// existing Firebase-based RequireAuth used by the interview product.
function RequirePlatformAuth({ children }) {
    const { status } = useAuth()

    if (status === 'loading') {
        return <div className='min-h-screen flex items-center justify-center text-[13px] text-text-secondary'>Loading...</div>
    }
    if (status === 'anonymous') {
        return <Navigate to='/platform/login' replace />
    }
    return children
}

export default RequirePlatformAuth
