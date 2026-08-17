import jwt from "jsonwebtoken"
import crypto from "crypto"

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
const REFRESH_TOKEN_TTL_DAYS = 30

export const signAccessToken = (user) => {
    const token = jwt.sign(
        {
            sub: String(user._id),
            tenantId: user.tenantId ? String(user.tenantId) : null,
            roles: user.roles,
            permissions: user.permissions || [],
            tokenVersion: user.permissionVersion,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
    )
    return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS }
}

export const verifyAccessToken = (token) => jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

// Raw refresh token -> URL/cookie. SHA256(raw) -> database. Never store the
// raw value, mirroring how onboarding invitation tokens are handled.
export const generateRefreshToken = () => crypto.randomBytes(32).toString("base64url")
export const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex")

export const refreshTokenExpiry = () => new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
