import { OaAccount } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"
import {
    EMAIL_RE, OA_ROLES, clearRateLimit, hashPassword, normalizeEmail, passwordProblem, rateLimit, signOaToken, verifyPassword,
} from "../utils/oaSecurity.js"
import { decisionEmail, sendOaEmail } from "./oaMail.js"

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
    if (orgName.length < 2) fields.orgName = "Enter your organization, college or company name."
    if (contactName.length < 2) fields.contactName = "Enter the contact person's name."
    if (!EMAIL_RE.test(email)) fields.email = "Enter a valid email address."
    if (phone && !/^[0-9+()\-\s]{7,20}$/.test(phone)) fields.phone = "Enter a valid phone number."
    const problem = passwordProblem(input?.password)
    if (problem) fields.password = problem
    if (Object.keys(fields).length) throw new ApiError(400, "VALIDATION_ERROR", Object.values(fields)[0], fields)

    const emailNormalized = normalizeEmail(email)
    const existing = await OaAccount.findOne({ emailNormalized }).select("+passwordHash")
    const details = { orgName, contactName, email, phone: phone || null, purpose: String(input?.purpose || "").trim().slice(0, 500) }

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
    if (account.status === "CHANGES_REQUESTED") throw new ApiError(403, "ACCOUNT_CHANGES_REQUESTED", `Your registration needs a change before approval: ${account.review?.note || "see your email"}. Register again with the corrections.`)
    if (account.status === "REJECTED") throw new ApiError(403, "ACCOUNT_REJECTED", `Your registration was not approved${account.review?.note ? `: ${account.review.note}` : "."}`)
    if (account.status === "SUSPENDED") throw new ApiError(403, "ACCOUNT_SUSPENDED", "This account is suspended. Please contact support.")

    clearRateLimit(limiterKey)
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
