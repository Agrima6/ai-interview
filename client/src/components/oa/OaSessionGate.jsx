import React, { useEffect, useState } from 'react'
import { oaApi, oaTokens } from '../../api/oaApi'
import { useAuth } from '../../hooks/useAuth.jsx'
import Skeleton from '../ui/Skeleton'
import { ErrorState } from './oaUi'

/**
 * Renders its children once the organization has an Online Assessment session. A signed-in organization needs no second
 * sign-in: the first visit trades the platform session for one, in the background.
 */
export default function OaSessionGate({ children }) {
    const auth = useAuth()
    const [ready, setReady] = useState(() => Boolean(oaTokens.get('admin')))
    const [error, setError] = useState(null)

    useEffect(() => {
        if (ready || error || auth.status !== 'authenticated') return undefined
        let cancelled = false
        oaApi.orgSession().then(() => { if (!cancelled) setReady(true) }).catch((e) => { if (!cancelled) setError(e) })
        return () => { cancelled = true }
    }, [ready, error, auth.status])

    if (ready) return children
    if (error) return <ErrorState title='Could not open this drive' message={error.message} onRetry={() => setError(null)} />
    return <div className='space-y-4' aria-busy='true' aria-label='Opening'><Skeleton className='h-8 w-1/2' /><Skeleton className='h-24 w-full rounded-2xl' /><Skeleton className='h-64 w-full rounded-2xl' /></div>
}
