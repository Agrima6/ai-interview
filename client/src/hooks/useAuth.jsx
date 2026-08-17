import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

    const loadSession = useCallback(async () => {
        try {
            const { accessToken } = await authApi.refresh()
            setAccessToken(accessToken)
            const me = await meApi.getMe()
            setUser(me)
            setStatus('authenticated')
        } catch {
            setAccessToken(null)
            setUser(null)
            setStatus('anonymous')
        }
    }, [])

    useEffect(() => { loadSession() }, [loadSession])

    const login = useCallback(async (email, password) => {
        const { user: loggedInUser, accessToken } = await authApi.login(email, password)
        setAccessToken(accessToken)
        setUser(loggedInUser)
        setStatus('authenticated')
        return loggedInUser
    }, [])

    const logout = useCallback(async () => {
        await authApi.logout().catch(() => {})
        setAccessToken(null)
        setUser(null)
        setStatus('anonymous')
    }, [])

    return (
        <AuthContext.Provider value={{ user, status, login, logout, refresh: loadSession }}>
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
    return (permission) => Boolean(user?.permissions?.includes(permission))
}
