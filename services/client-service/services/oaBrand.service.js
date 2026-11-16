import mongoose from "mongoose"
import Client from "../models/client.model.js"
import { OaAccount, OaAssessment } from "../models/oa.model.js"
import { trySignedFilePath } from "../utils/signedFileUrl.js"
import { safeColor } from "../utils/oaEmailHtml.js"

// How an organization looks to its candidates: its name, logo and colour, from the organization's own branding.
// Candidates and mail apps cannot send a login, so the logo is served from one public, cacheable address per account.

export const logoPath = (accountId) => `/api/v1/oa/brand/${accountId}/logo`

// Where the public API lives, for links that leave the website (a logo inside an email). Set PUBLIC_API_URL in production.
export const publicApiUrl = () => (process.env.PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://api.workmateiq.com" : "http://localhost:4000")).replace(/\/$/, "")

const clientFor = async (account) => (account?.tenantId && mongoose.isValidObjectId(account.tenantId) ? Client.findOne({ tenantId: account.tenantId }).select("name branding onboardingId").lean() : null)
const hasLogo = (client) => Boolean(client?.branding?.logoFileId || client?.branding?.logoUrl)

/** { name, logoPath, color } for an account; `logoPath` is null when the organization has not uploaded a logo. */
export const brandForAccount = async (account) => {
    const client = await clientFor(account)
    return {
        name: String(client?.name || account?.orgName || "Your organizer"),
        logoPath: hasLogo(client) ? logoPath(account._id) : null,
        color: safeColor(client?.branding?.primaryColor),
    }
}

/** The same, with the logo as an absolute address, for use inside an email. */
export const emailBrand = async (account) => {
    const brand = await brandForAccount(account)
    return { name: brand.name, color: brand.color, logoUrl: brand.logoPath ? `${publicApiUrl()}${brand.logoPath}` : "" }
}

/** What a candidate may see before signing in: the organization behind a test. Nothing else about the test. */
// A candidate's lobby asks for this on every refresh: remember it briefly instead of three database reads each time.
const brandCache = new Map()
const BRAND_TTL_MS = 5 * 60 * 1000

export const brandForAssessmentId = async (assessmentId) => {
    const key = String(assessmentId)
    const hit = brandCache.get(key)
    if (hit && Date.now() - hit.at < BRAND_TTL_MS) return hit.value
    const value = await loadBrandForAssessment(assessmentId)
    if (brandCache.size >= 2000) brandCache.delete(brandCache.keys().next().value)
    brandCache.set(key, { value, at: Date.now() })
    return value
}

const loadBrandForAssessment = async (assessmentId) => {
    if (!mongoose.isValidObjectId(assessmentId)) return { name: null, logoPath: null, color: null }
    const assessment = await OaAssessment.findById(assessmentId).select("accountId").lean()
    const account = assessment ? await OaAccount.findById(assessment.accountId).select("orgName tenantId").lean() : null
    if (!account) return { name: null, logoPath: null, color: null }
    return brandForAccount(account)
}

const DATA_IMAGE = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/

/** Resolves an account's logo to a redirect or the image bytes; null when there is none. */
export const resolveLogo = async (accountId) => {
    if (!mongoose.isValidObjectId(accountId)) return null
    const account = await OaAccount.findById(accountId).select("tenantId").lean()
    const client = await clientFor(account)
    if (!client) return null
    const { logoFileId, logoUrl } = client.branding || {}
    if (logoFileId && client.onboardingId) {
        const signed = trySignedFilePath(client.onboardingId, logoFileId, 3600)
        if (signed) return { redirect: signed }
    }
    if (/^https:\/\//i.test(logoUrl || "")) return { redirect: logoUrl }
    const data = DATA_IMAGE.exec(logoUrl || "")
    if (data) {
        const buffer = Buffer.from(data[2], "base64")
        if (buffer.length && buffer.length <= 2 * 1024 * 1024) return { contentType: data[1], buffer }
    }
    return null
}
