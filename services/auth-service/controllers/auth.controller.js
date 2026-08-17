import * as authService from "../services/auth.service.js"
import { ok } from "../utils/response.js"

const REFRESH_COOKIE = "workmate_refresh"
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
}

const setRefreshCookie = (res, rawRefreshToken) => res.cookie(REFRESH_COOKIE, rawRefreshToken, cookieOptions)

export const login = async (req, res, next) => {
    try {
        const { email, password, deviceId } = req.body
        const { user, accessToken, expiresIn, rawRefreshToken } = await authService.login({ email, password, deviceId })
        setRefreshCookie(res, rawRefreshToken)
        ok(res, { user, accessToken, expiresIn })
    } catch (error) { next(error) }
}

export const refresh = async (req, res, next) => {
    try {
        const raw = req.cookies?.[REFRESH_COOKIE]
        const { user, accessToken, expiresIn, rawRefreshToken } = await authService.refresh(raw, req.body?.deviceId)
        setRefreshCookie(res, rawRefreshToken)
        ok(res, { user, accessToken, expiresIn })
    } catch (error) { next(error) }
}

export const logout = async (req, res, next) => {
    try {
        const raw = req.cookies?.[REFRESH_COOKIE]
        await authService.logout(raw)
        res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" })
        ok(res, { loggedOut: true })
    } catch (error) { next(error) }
}

export const me = async (req, res, next) => {
    try {
        const user = await authService.me(req.user.sub)
        ok(res, user)
    } catch (error) { next(error) }
}
