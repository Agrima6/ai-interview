import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import * as authApi from '../api/authApi'
import * as meApi from '../api/meApi'
import { setAccessToken } from '../api/client'

const AuthContext = createContext(null)

// App start -> POST /auth/refresh (the browser already carries the HttpOnly
// refresh cookie, if any) -> on success, GET /me for the current
// roles/permissions. A clean 401 just means "not logged in", not an error.
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [status, setStatus] = useState('loading') // loading | authenticated | anonymous
    const queryClient = useQueryClient()
    const dispatch = useDispatch()
    const channelRef = useRef(null)

    // Nothing fetched for one account may ever be shown to the next one: every identity change (login, logout,
    // expired session) drops the whole query cache and the legacy practice-app user.
    const resetAccountState = useCallback(() => {
        queryClient.clear()
        dispatch(setUserData(null))
    }, [queryClient, dispatch])

    // Tell the other tabs of this browser that the identity changed, so a tab left on account A cannot keep acting
    // as A after this tab signed out or switched to B.
    const announce = useCallback((type) => {
        try { channelRef.current?.postMessage({ type }) } catch { /* channel closed */ }
    }, [])

    const loadSession = useCallback(async () => {
        try {
            const { accessToken } = await authApi.refresh()
            setAccessToken(accessToken)
            const me = await meApi.getMe()
            setUser(me)
            setStatus('authenticated')
            return me
        } catch {
            setAccessToken(null)
            setUser(null)
            setStatus('anonymous')
            return null
        }
    }, [])

    useEffect(() => { loadSession() }, [loadSession])

    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return undefined
        const channel = new BroadcastChannel('workmateiq-auth')
        channelRef.current = channel
        channel.onmessage = () => { resetAccountState(); loadSession() }     // re-ask the server who this browser is now
        return () => { channel.close(); channelRef.current = null }
    }, [loadSession, resetAccountState])

    const login = useCallback(async (email, password) => {
        // Drop the previous identity first so a failed attempt can never leave the old account active
        // under a new login screen, and a successful one starts from a clean slate.
        setAccessToken(null)
        resetAccountState()
        setUser(null)
        setStatus('anonymous')
        const { user: loggedInUser, accessToken } = await authApi.login(email, password)
        setAccessToken(accessToken)
        setUser(loggedInUser)
        setStatus('authenticated')
        announce('login')
        return loggedInUser
    }, [resetAccountState, announce])

    const loginWithGoogle = useCallback(async (idToken) => {
        setAccessToken(null)
        resetAccountState()
        setUser(null)
        setStatus('anonymous')
        const { user: loggedInUser, accessToken } = await authApi.googleLogin(idToken)
        setAccessToken(accessToken)
        setUser(loggedInUser)
        setStatus('authenticated')
        announce('login')
        return loggedInUser
    }, [resetAccountState, announce])

    const logout = useCallback(async () => {
        await authApi.logout().catch(() => {})
        setAccessToken(null)
        resetAccountState()
        setUser(null)
        setStatus('anonymous')
        announce('logout')
    }, [resetAccountState, announce])

    return (
        <AuthContext.Provider value={{ user, status, login, loginWithGoogle, logout, refresh: loadSession }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

// Never `user.role === "ADMIN"` - always check the permission the backend
// actually granted, since the backend remains authoritative regardless of
// what this returns.
export const usePermission = () => {
    const { user } = useAuth()
    return useCallback((permission) => Boolean(user?.permissions?.includes(permission)), [user])
}
