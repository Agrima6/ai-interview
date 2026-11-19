import crypto from "node:crypto"
import mongoose from "mongoose"
import { OaAccount } from "../models/oa.model.js"
import Client from "../models/client.model.js"
import { ApiError } from "../utils/response.js"
import {
    EMAIL_RE, OA_ROLES, clearRateLimit, hashPassword, normalizeEmail, passwordProblem, rateLimit, signOaToken, verifyPassword,
} from "../utils/oaSecurity.js"
import { decisionEmail, sendOaEmail } from "./oaMail.js"
import { LIMITS, nameProblem, normalizePhone, phoneProblem } from "../utils/oaValidate.js"

const ADMIN_TOKEN_SECONDS = 12 * 60 * 60

export const accountView = (a) => ({
    id: String(a._id), orgName: a.orgName, contactName: a.contactName, email: a.email, phone: a.phone, purpose: a.purpose,
    status: a.status, review: a.review ? { reviewedAt: a.review.reviewedAt, note: a.review.note } : undefined,
    createdAt: a.createdAt, updatedAt: a.updatedAt, lastLoginAt: a.lastLoginAt,
})

// ---------- maker: the applicant ----------

export const register = async (input) => {
    // The gateway does not forward client IPs, so limits are keyed on what the request names, plus a global ceiling.
    rateLimit({ key: "oa-register:all", max: 200, windowMs: 60 * 60 * 1000 })
    rateLimit({ key: `oa-register:${normalizeEmail(input?.email)}`, max: 5, windowMs: 60 * 60 * 1000 })
    const fields = {}
    const orgName = String(input?.orgName || "").trim()
    const contactName = String(input?.contactName || "").trim()
    const email = String(input?.email || "").trim()
    const phone = String(input?.phone || "").trim()
    if (orgName.length < LIMITS.orgName.min || orgName.length > LIMITS.orgName.max) fields.orgName = `Organization name must be ${LIMITS.orgName.min} to ${LIMITS.orgName.max} characters.`
    const contactProblem = nameProblem(contactName, { ...LIMITS.personName, label: "Your name" })
    if (contactProblem) fields.contactName = contactProblem
    if (email.length > 200 || !EMAIL_RE.test(email)) fields.email = "Enter a valid email address."
    const phoneIssue = phoneProblem(phone)
    if (phoneIssue) fields.phone = phoneIssue
    if (String(input?.purpose || "").length > 500) fields.purpose = "Keep this to 500 characters or fewer."
    const problem = passwordProblem(input?.password)
    if (problem) fields.password = problem
    if (Object.keys(fields).length) throw new ApiError(400, "VALIDATION_ERROR", Object.values(fields)[0], fields)

    const emailNormalized = normalizeEmail(email)
    const existing = await OaAccount.findOne({ emailNormalized }).select("+passwordHash")
    const details = { orgName, contactName, email, phone: normalizePhone(phone) || null, purpose: String(input?.purpose || "").trim().slice(0, 500) }

    // A rejected or "changes requested" application can be corrected and resubmitted by the same applicant.
    if (existing && ["REJECTED", "CHANGES_REQUESTED"].includes(existing.status)) {
        Object.assign(existing, details, { passwordHash: hashPassword(input.password), status: "PENDING", review: { reviewedBy: null, reviewedAt: null, note: "" } })
        await existing.save()
        return { id: String(existing._id), status: existing.status }
    }
    if (existing) throw new ApiError(409, "ALREADY_REGISTERED", "An Online Assessment account already exists for this email. Try signing in.", { email: "Already registered." })

    const account = await OaAccount.create({ ...details, emailNormalized, passwordHash: hashPassword(input.password) })
    return { id: String(account._id), status: account.status }
}

export const login = async ({ email, password }) => {
    const emailNormalized = normalizeEmail(email)
    const limiterKey = `oa-login:${emailNormalized}`
    rateLimit({ key: limiterKey, max: 10, windowMs: 15 * 60 * 1000 })

    const account = await OaAccount.findOne({ emailNormalized }).select("+passwordHash")
    // The same message for "no such account" and "wrong password": the form must not reveal which emails are registered.
    if (!account || !verifyPassword(password, account.passwordHash)) throw new ApiError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.")

    if (account.status === "PENDING") throw new ApiError(403, "ACCOUNT_PENDING", "Your registration is waiting for approval. We will email you as soon as it is reviewed.")
    if (account.status === "CHANGES_REQUESTED") throw new ApiError(403, "ACCOUNT_CHANGES_REQUESTED", `Your registration needs a change before approval: ${(account.review?.note || "see your email").replace(/[.\s]+$/, "")}. Register again with the corrections.`)
    if (account.status === "REJECTED") throw new ApiError(403, "ACCOUNT_REJECTED", `Your registration was not approved${account.review?.note ? `: ${account.review.note}` : "."}`)
    if (account.status === "SUSPENDED") throw new ApiError(403, "ACCOUNT_SUSPENDED", "This account is suspended. Please contact support.")

    clearRateLimit(limiterKey)
    account.lastLoginAt = new Date()
    await account.save()
    const token = signOaToken({ sub: String(account._id), role: OA_ROLES.ADMIN, accountId: String(account._id) }, ADMIN_TOKEN_SECONDS)
    return { token, expiresIn: ADMIN_TOKEN_SECONDS, account: accountView(account) }
}

/**
 * An organization admin who is already signed in to the platform gets an Online Assessment session without a second
 * password. The whole organization shares one OA account, found by its tenant (or, the first time, by the same email).
 */
export const orgSession = async (user) => {
    const tenantId = String(user?.tenantId || "")
    const email = String(user?.email || "").trim()
    if (!tenantId || !EMAIL_RE.test(email)) throw new ApiError(403, "NOT_AN_ORGANIZATION", "Online Assessment is available to organization accounts.")
    const emailNormalized = normalizeEmail(email)

    let account = await OaAccount.findOne({ tenantId }).sort({ createdAt: 1, _id: 1 })
    if (!account) {
        // The same person may have registered for Online Assessment on its own before: adopt that account.
        const sameEmail = await OaAccount.findOne({ emailNormalized, tenantId: null })
        if (sameEmail) { sameEmail.tenantId = tenantId; account = await sameEmail.save() }
    }
    if (!account) {
        const client = mongoose.isValidObjectId(tenantId) ? await Client.findOne({ tenantId }).select("name").lean() : null
        const taken = await OaAccount.exists({ emailNormalized })
        try {
            account = await OaAccount.create({
                orgName: String(client?.name || "My organization").slice(0, 120), contactName: email.split("@")[0].slice(0, 80) || "Admin", email,
                // The email is the unique key; if another organization already holds it, key this one by its tenant.
                emailNormalized: taken ? `tenant:${tenantId}` : emailNormalized,
                // Never used to sign in: this account is only reached through the platform session.
                passwordHash: hashPassword(crypto.randomBytes(32).toString("hex")),
                status: "ACTIVE", tenantId, purpose: "Created from the organization's platform account",
            })
        } catch (error) {
            if (error.code !== 11000) throw error
            account = await OaAccount.findOne({ tenantId }).sort({ createdAt: 1, _id: 1 })
            if (!account) throw error
        }
        // Two requests can arrive together the first time an organization opens Online Assessment (the dashboard and the
        // drives page both ask). Each would create an account, splitting the organization's tests across two. The oldest
        // account is the organization's; a newer one made in the same moment is empty, so it is dropped.
        const oldest = await OaAccount.findOne({ tenantId }).sort({ createdAt: 1, _id: 1 })
        if (oldest && String(oldest._id) !== String(account._id)) {
            await OaAccount.deleteOne({ _id: account._id })
            account = oldest
        }
    }
    // A platform organization is already verified, so a pending self-registration needs no second review.
    if (["PENDING", "CHANGES_REQUESTED"].includes(account.status)) account.status = "ACTIVE"
    if (account.status !== "ACTIVE") throw new ApiError(403, "ACCOUNT_INACTIVE", "Online Assessment is switched off for this organization. Please contact support.")
    account.lastLoginAt = new Date()
    await account.save()
    const token = signOaToken({ sub: String(account._id), role: OA_ROLES.ADMIN, accountId: String(account._id) }, ADMIN_TOKEN_SECONDS)
    return { token, expiresIn: ADMIN_TOKEN_SECONDS, account: accountView(account) }
}

export const getMine = async (accountId) => {
    const account = await OaAccount.findById(accountId)
    if (!account || account.status !== "ACTIVE") throw new ApiError(403, "ACCOUNT_INACTIVE", "This account is not active.")
    return accountView(account)
}

// ---------- checker: a platform super admin ----------

const ACTIONS = {
    approve: { to: "ACTIVE", from: ["PENDING"] },
    reject: { to: "REJECTED", from: ["PENDING", "CHANGES_REQUESTED"] },
    request_changes: { to: "CHANGES_REQUESTED", from: ["PENDING"] },
    suspend: { to: "SUSPENDED", from: ["ACTIVE"] },
    reactivate: { to: "ACTIVE", from: ["SUSPENDED"] },
}

export const listAccounts = async ({ status, search, page = 1, pageSize = 25 } = {}) => {
    const filter = {}
    if (status && ["PENDING", "CHANGES_REQUESTED", "ACTIVE", "REJECTED", "SUSPENDED"].includes(status)) filter.status = status
    const term = String(search || "").trim().slice(0, 80)
    if (term) {
        const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        filter.$or = [{ orgName: rx }, { contactName: rx }, { email: rx }]
    }
    const size = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 100)
    const current = Math.max(parseInt(page, 10) || 1, 1)
    const [items, total, pendingCount] = await Promise.all([
        OaAccount.find(filter).sort({ createdAt: -1 }).skip((current - 1) * size).limit(size),
        OaAccount.countDocuments(filter),
        OaAccount.countDocuments({ status: "PENDING" }),
    ])
    return { items: items.map(accountView), total, page: current, pageSize: size, pendingCount }
}

export const review = async (id, { action, note }, reviewerId) => {
    const rule = ACTIONS[action]
    if (!rule) throw new ApiError(400, "VALIDATION_ERROR", "Unknown review action.")
    const reviewNote = String(note || "").trim().slice(0, 500)
    if ((action === "reject" || action === "request_changes") && !reviewNote) {
        throw new ApiError(400, "VALIDATION_ERROR", "Say why, so the applicant knows what to do next.", { note: "A reason is required." })
    }
    // One atomic transition: two reviewers clicking at once can never both succeed.
    const account = await OaAccount.findOneAndUpdate(
        { _id: id, status: { $in: rule.from } },
        { $set: { status: rule.to, review: { reviewedBy: String(reviewerId), reviewedAt: new Date(), note: reviewNote } } },
        { new: true },
    )
    if (!account) {
        const current = await OaAccount.findById(id)
        if (!current) throw new ApiError(404, "NOT_FOUND", "Account not found.")
        throw new ApiError(409, "INVALID_STATE", `This account is ${current.status.toLowerCase().replace("_", " ")} and cannot be changed that way.`)
    }
    if (["approve", "reject", "request_changes"].includes(action)) {
        await sendOaEmail({
            accountId: account._id, to: account.email, eventType: "OA_ACCOUNT_DECISION",
            ...decisionEmail({ orgName: account.orgName, contactName: account.contactName, decision: rule.to, note: reviewNote }),
        })
    }
    return accountView(account)
}
