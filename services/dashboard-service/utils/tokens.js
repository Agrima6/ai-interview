import jwt from "jsonwebtoken"

// This service only ever verifies access tokens (never issues them) - it
// shares ACCESS_TOKEN_SECRET with auth-service for that purpose. A larger
// deployment would swap this for RS256 + auth-service's public key so the
// signing secret stays exclusive to auth-service.
export const verifyAccessToken = (token) => jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
