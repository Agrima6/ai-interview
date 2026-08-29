import * as authService from "../services/auth.service.js"
import { ok, ApiError } from "@workmateiq/common"

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

export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body
        const result = await authService.changePassword(req.user.sub, currentPassword, newPassword)
        ok(res, result)
    } catch (error) { next(error) }
}

export const forgotPassword = async (req, res, next) => {
    try {
        await authService.requestPasswordReset(req.body?.email, { requestId: req.requestId, correlationId: req.correlationId })
        // Same response whether or not the email matched an account.
        ok(res, { requested: true })
    } catch (error) { next(error) }
}

export const resetPassword = async (req, res, next) => {
    try {
        const result = await authService.resetPassword(req.body?.token, req.body?.newPassword)
        ok(res, result)
    } catch (error) { next(error) }
}

export const googleLogin = async (req, res, next) => {
    try {
        const { idToken } = req.body
        if (!idToken) return next(new ApiError(400, "MISSING_TOKEN", "idToken is required."))
        const { user, accessToken, expiresIn, rawRefreshToken } = await authService.googleLogin(idToken)
        setRefreshCookie(res, rawRefreshToken)
        ok(res, { user, accessToken, expiresIn })
    } catch (error) { next(error) }
}
