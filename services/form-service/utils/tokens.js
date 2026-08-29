import jwt from "jsonwebtoken"

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
        { expiresIn: 15 * 60 }
    )
    return { token, expiresIn: 15 * 60 }
}

export const verifyAccessToken = (token) => jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
