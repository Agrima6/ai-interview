import bcrypt from "bcryptjs"
import crypto from "crypto"
import * as userRepo from "../repositories/user.repository.js"
import * as roleRepo from "../repositories/role.repository.js"
import * as refreshTokenRepo from "../repositories/refreshToken.repository.js"
import * as resetTokenRepo from "../repositories/resetToken.repository.js"
import { signAccessToken, generateRefreshToken, hashToken, refreshTokenExpiry } from "../utils/tokens.js"
import { getFirebaseAuth } from "../config/firebaseAdmin.js"
import { communicationServiceClient } from "../config/internalClients.js"
import { ApiError } from "@workmateiq/common"

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

const buildUserView = async (user) => {
    const roles = await roleRepo.findByNames(user.roles)
    const permissions = [...new Set(roles.flatMap((r) => r.permissions))]
    return {
        id: String(user._id),
        name: user.displayName,
        email: user.email,
        roles: user.roles,
        permissions,
        tenantId: user.tenantId ? String(user.tenantId) : null,
        mustChangePassword: Boolean(user.mustChangePassword),
    }
}

// Human-friendly one-time password sent by email - not meant to be
// memorable long-term, just clearable at a glance when copy-pasting.
const generateTempPassword = () => crypto.randomBytes(9).toString("base64url")

const issueSession = async (user, deviceId) => {
    const view = await buildUserView(user)
    const { token: accessToken, expiresIn } = signAccessToken({ ...user.toObject(), permissions: view.permissions })
    const rawRefreshToken = generateRefreshToken()
    const familyId = crypto.randomUUID()
    await refreshTokenRepo.create({
        userId: user._id,
        tokenHash: hashToken(rawRefreshToken),
        familyId,
        deviceId: deviceId || null,
        expiresAt: refreshTokenExpiry(),
    })
    return { user: view, accessToken, expiresIn, rawRefreshToken }
}

export const login = async ({ email, password, deviceId }) => {
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
        throw new ApiError(400, "MISSING_CREDENTIALS", "Email and password are required.")
    }
    const user = await userRepo.findByEmail(email)
    if (!user || user.status !== "ACTIVE") throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
    await userRepo.touchLastLogin(user._id)
    return issueSession(user, deviceId)
}

// Rotates the refresh token on every use and detects reuse of an already-
// rotated (or revoked) token by revoking the whole token family.
export const refresh = async (rawRefreshToken, deviceId) => {
    if (!rawRefreshToken) throw new ApiError(401, "NO_REFRESH_TOKEN", "No refresh token provided.")
    const record = await refreshTokenRepo.findByHash(hashToken(rawRefreshToken))
    if (!record) throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token not recognized.")

    if (record.revokedAt || record.expiresAt < new Date()) {
        await refreshTokenRepo.revokeFamily(record.familyId)
        throw new ApiError(401, "REFRESH_TOKEN_REUSED", "Session invalid, please log in again.")
    }

    const user = await userRepo.findById(record.userId)
    if (!user || user.status !== "ACTIVE") throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Account unavailable.")

    const view = await buildUserView(user)
    const { token: accessToken, expiresIn } = signAccessToken({ ...user.toObject(), permissions: view.permissions })
    const rawNewRefreshToken = generateRefreshToken()
    const newRecord = await refreshTokenRepo.create({
        userId: user._id,
        tokenHash: hashToken(rawNewRefreshToken),
        familyId: record.familyId,
        deviceId: deviceId || record.deviceId,
        expiresAt: refreshTokenExpiry(),
    })
    await refreshTokenRepo.markUsed(record._id, newRecord._id)
    await refreshTokenRepo.revoke(record._id)

    return { user: view, accessToken, expiresIn, rawRefreshToken: rawNewRefreshToken }
}

export const logout = async (rawRefreshToken) => {
    if (!rawRefreshToken) return
    const record = await refreshTokenRepo.findByHash(hashToken(rawRefreshToken))
    if (record) await refreshTokenRepo.revokeFamily(record.familyId)
}

export const me = async (userId) => {
    const user = await userRepo.findById(userId)
    if (!user || user.status !== "ACTIVE") throw new ApiError(401, "UNAUTHENTICATED", "Session no longer valid.")
    return buildUserView(user)
}

export const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await userRepo.findById(userId)
    if (!user || user.status !== "ACTIVE") throw new ApiError(401, "UNAUTHENTICATED", "Session no longer valid.")
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new ApiError(401, "INVALID_CREDENTIALS", "Current password is incorrect.")
    if (!newPassword || newPassword.length < 8) throw new ApiError(400, "WEAK_PASSWORD", "New password must be at least 8 characters.")
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await userRepo.setPassword(user._id, passwordHash, false)
    return { changed: true }
}

// Always resolves successfully regardless of whether the email matches an
// account - the caller must never be able to tell known emails apart from
// unknown ones via this endpoint's response (user enumeration). The actual
// email only goes out when there's a real account to send it for.
export const requestPasswordReset = async (email, ctx) => {
    if (typeof email !== "string" || !email.trim()) return
    const user = await userRepo.findByEmail(email)
    if (!user || user.status !== "ACTIVE") return

    await resetTokenRepo.invalidateActiveForUser(user._id)
    const rawToken = crypto.randomBytes(32).toString("base64url")
    await resetTokenRepo.create({
        userId: user._id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    })

    const resetUrl = `${process.env.PASSWORD_RESET_URL}?token=${rawToken}`
    // Best-effort, matching the pattern elsewhere (onboarding/client-approval
    // emails) - a transient provider failure shouldn't turn into a 500 for
    // the user, and revealing delivery failure here would leak account
    // existence just as much as a differing response would.
    await communicationServiceClient
        .send({
            entityType: "USER", entityId: user._id, channel: "EMAIL",
            eventType: "PASSWORD_RESET", recipient: user.email,
            variables: { recipientName: user.displayName, resetUrl },
        }, ctx)
        .catch((err) => console.error("[auth-service] password reset email failed to send:", err.message))
}

export const resetPassword = async (rawToken, newPassword) => {
    if (!rawToken) throw new ApiError(400, "INVALID_RESET_TOKEN", "Reset link is invalid or has expired.")
    if (!newPassword || newPassword.length < 8) throw new ApiError(400, "WEAK_PASSWORD", "New password must be at least 8 characters.")

    const record = await resetTokenRepo.findByHash(hashToken(rawToken))
    if (!record || record.usedAt || record.expiresAt < new Date()) {
        throw new ApiError(400, "INVALID_RESET_TOKEN", "Reset link is invalid or has expired.")
    }

    const user = await userRepo.findById(record.userId)
    if (!user || user.status !== "ACTIVE") throw new ApiError(400, "INVALID_RESET_TOKEN", "Reset link is invalid or has expired.")

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await userRepo.setPassword(user._id, passwordHash, false)
    await resetTokenRepo.markUsed(record._id)
    // A password reset should end every existing session, including
    // whatever session an attacker who had the old password was using.
    await refreshTokenRepo.revokeAllForUser(user._id)

    return { reset: true }
}

// Called internally by onboarding-service when an ORGANIZATION/COLLEGE
// onboarding is approved - creates the client's first login with a
// generated password they're required to change on first sign-in.
export const createClientUser = async ({ email, name, clientId }) => {
    const existing = await userRepo.findByEmail(email)
    if (existing) {
        // Re-approval of an already-known contact - just re-link them to
        // this client rather than erroring, and issue a fresh password.
        const tempPassword = generateTempPassword()
        const passwordHash = await bcrypt.hash(tempPassword, 10)
        existing.tenantId = clientId
        existing.roles = [...new Set([...existing.roles, "CLIENT_ADMIN"])]
        existing.passwordHash = passwordHash
        existing.mustChangePassword = true
        await existing.save()
        return { email: existing.email, password: tempPassword }
    }
    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 10)
    const user = await userRepo.create({
        email,
        displayName: name,
        passwordHash,
        roles: ["CLIENT_ADMIN"],
        tenantId: clientId,
        mustChangePassword: true,
    })
    return { email: user.email, password: tempPassword }
}

// Firebase already verified the user owns this Google account - we just
// check whether that email has a WorkmateIQ account and, if so, log them
// in exactly as if they'd used a password.
export const googleLogin = async (idToken) => {
    let decoded
    try {
        decoded = await getFirebaseAuth().verifyIdToken(idToken)
    } catch {
        throw new ApiError(401, "INVALID_GOOGLE_TOKEN", "Invalid or expired Google sign-in token.")
    }
    const email = decoded.email?.trim().toLowerCase()
    if (!email) throw new ApiError(400, "NO_EMAIL", "Google account has no email.")
    const user = await userRepo.findByEmail(email)
    if (!user || user.status !== "ACTIVE") {
        throw new ApiError(404, "NO_ACCOUNT", "No WorkmateIQ account found for this email. Ask an admin to approve your organization first.")
    }
    await userRepo.touchLastLogin(user._id)
    return issueSession(user, null)
}
