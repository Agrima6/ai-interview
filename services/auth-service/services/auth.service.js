import bcrypt from "bcryptjs"
import crypto from "crypto"
import * as userRepo from "../repositories/user.repository.js"
import * as roleRepo from "../repositories/role.repository.js"
import * as refreshTokenRepo from "../repositories/refreshToken.repository.js"
import { signAccessToken, generateRefreshToken, hashToken, refreshTokenExpiry } from "../utils/tokens.js"
import { ApiError } from "../utils/response.js"

const buildUserView = async (user) => {
    const roles = await roleRepo.findByNames(user.roles)
    const permissions = [...new Set(roles.flatMap((r) => r.permissions))]
    return {
        id: String(user._id),
        name: user.displayName,
        email: user.email,
        roles: user.roles,
        permissions,
    }
}

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
