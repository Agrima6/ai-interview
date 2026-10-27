import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { resolvePostLoginPath } from '../utils/postLoginPath'

// Wraps public entry pages (/, /login). A visitor who already has a valid server-verified session is sent to their
// own dashboard instead of being shown a login form that would let them silently mix accounts in one browser.
// Waits for the session check, so a signed-in user never sees a flash of the public page.
function RedirectIfAuthenticated({ children }) {
    const { status, user } = useAuth()
    const [target, setTarget] = useState(null)

    useEffect(() => {
        if (status !== 'authenticated') { setTarget(null); return undefined }
        let cancelled = false
        resolvePostLoginPath(user).then((path) => { if (!cancelled) setTarget(path) })
        return () => { cancelled = true }
    }, [status, user])

    if (status === 'loading' || (status === 'authenticated' && !target)) {
        return <div className='min-h-screen flex items-center justify-center text-[13px] text-text-secondary'>Loading...</div>
    }
    if (status === 'authenticated' && target) return <Navigate to={target} replace />
    return children
}

export default RedirectIfAuthenticated
