import mongoose from "mongoose"
import Announcement from "../models/announcement.model.js"
import Client from "../models/client.model.js"
import { OaAccount } from "../models/oa.model.js"
import { ApiError } from "../utils/response.js"

const TONES = ["INFO", "SUCCESS", "WARNING"]
const AUDIENCES = ["ALL", "ORGANIZATION", "COLLEGE"]
const MAX_DAYS = 365
const DAY = 86400000

const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
const fail = (field, message) => { throw new ApiError(400, "VALIDATION_ERROR", message, { [field]: message }) }
const asDate = (value, field, label) => {
    const d = new Date(value)
    if (value === undefined || value === null || value === "" || Number.isNaN(d.getTime())) fail(field, `${label} is not a valid date and time.`)
    return d
}

/** A link only ever opens a web page: no javascript:, data: or other schemes. */
const safeUrl = (value) => {
    const text = clean(value, 300)
    if (!text) return ""
    let url
    try { url = new URL(text) } catch { return fail("linkUrl", "Enter a full web address, starting with https://") }
    if (!["https:", "http:"].includes(url.protocol)) fail("linkUrl", "The link must start with https://")
    return url.toString()
}

const fields = (body, now) => {
    const message = clean(body.message, 400)
    if (message.length < 3) fail("message", "Write the announcement (at least 3 characters).")
    if (message.length > 280) fail("message", "Keep the announcement to 280 characters or fewer.")
    const linkUrl = safeUrl(body.linkUrl)
    const linkLabel = clean(body.linkLabel, 40)
    if (linkLabel && !linkUrl) fail("linkUrl", "Add the web address the link should open.")
    const tone = TONES.includes(body.tone) ? body.tone : "INFO"
    const audience = body.audience === undefined ? "ALL" : AUDIENCES.includes(body.audience) ? body.audience : fail("audience", "Choose who should see it.")
    const startsAt = body.startsAt ? asDate(body.startsAt, "startsAt", "The start") : now
    const endsAt = asDate(body.endsAt, "endsAt", "The end")
    if (endsAt <= startsAt) fail("endsAt", "It must end after it starts.")
    if (endsAt <= now) fail("endsAt", "The end must be in the future.")
    if (endsAt - startsAt > MAX_DAYS * DAY) fail("endsAt", `An announcement can run for at most ${MAX_DAYS} days.`)
    return { message, linkUrl, linkLabel: linkUrl ? linkLabel || "Learn more" : "", tone, audience, startsAt, endsAt }
}

const stateOf = (a, now) => (a.stoppedAt ? "STOPPED" : new Date(a.endsAt) <= now ? "ENDED" : new Date(a.startsAt) > now ? "SCHEDULED" : "LIVE")

const view = (a, now = new Date()) => ({
    id: String(a._id), message: a.message, linkUrl: a.linkUrl || "", linkLabel: a.linkLabel || "", tone: a.tone, audience: a.audience,
    startsAt: a.startsAt, endsAt: a.endsAt, stoppedAt: a.stoppedAt || null, createdBy: a.createdBy || null, createdAt: a.createdAt, state: stateOf(a, now),
})

const owned = async (id) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "NOT_FOUND", "Announcement not found.")
    const a = await Announcement.findById(id)
    if (!a) throw new ApiError(404, "NOT_FOUND", "Announcement not found.")
    return a
}

// ---------- the platform owner ----------

export const createAnnouncement = async (body = {}, actor = null) => {
    const now = new Date()
    const a = await Announcement.create({ ...fields(body, now), createdBy: actor ? String(actor).slice(0, 120) : null })
    return view(a, now)
}

export const updateAnnouncement = async (id, body = {}) => {
    const a = await owned(id)
    const now = new Date()
    Object.assign(a, fields({ message: a.message, linkUrl: a.linkUrl, linkLabel: a.linkLabel, tone: a.tone, audience: a.audience, startsAt: a.startsAt, endsAt: a.endsAt, ...body }, now))
    a.stoppedAt = null
    await a.save()
    return view(a, now)
}

export const stopAnnouncement = async (id) => {
    const a = await owned(id)
    if (!a.stoppedAt && new Date(a.endsAt) > new Date()) { a.stoppedAt = new Date(); await a.save() }
    return view(a)
}

export const deleteAnnouncement = async (id) => {
    const a = await owned(id)
    await a.deleteOne()
    return { deleted: true }
}

export const listAnnouncements = async (query = {}) => {
    const now = new Date()
    const filter = {}
    const state = String(query.state || "").toUpperCase()
    if (state === "LIVE") Object.assign(filter, { stoppedAt: null, startsAt: { $lte: now }, endsAt: { $gt: now } })
    else if (state === "SCHEDULED") Object.assign(filter, { stoppedAt: null, startsAt: { $gt: now } })
    else if (state === "PAST") Object.assign(filter, { $or: [{ stoppedAt: { $ne: null } }, { endsAt: { $lte: now } }] })
    const pageSize = [10, 25, 50].includes(Number(query.pageSize)) ? Number(query.pageSize) : 25
    const page = Math.max(1, Number(query.page) || 1)
    const [items, total] = await Promise.all([
        Announcement.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        Announcement.countDocuments(filter),
    ])
    return { items: items.map((a) => view(a, now)), total, page, pageSize }
}

// ---------- what an organization sees ----------

/**
 * The announcements live right now for one organization. `tenantId` is the signed-in organization (platform dashboard);
 * `accountId` is an online-assessment account. Only what is live and meant for its kind of organization is returned.
 */
export const liveFor = async ({ tenantId = null, accountId = null } = {}) => {
    let kind = null
    if (tenantId && mongoose.isValidObjectId(tenantId)) kind = (await Client.findOne({ $or: [{ tenantId }, { _id: tenantId }] }).select("type").lean())?.type || null
    else if (accountId && mongoose.isValidObjectId(accountId)) {
        const account = await OaAccount.findById(accountId).select("tenantId").lean()
        if (account?.tenantId) kind = (await Client.findOne({ $or: [{ tenantId: account.tenantId }, { _id: account.tenantId }] }).select("type").lean())?.type || null
        if (!kind) kind = "ORGANIZATION"
    }
    const now = new Date()
    const rows = await Announcement.find({ stoppedAt: null, startsAt: { $lte: now }, endsAt: { $gt: now }, audience: { $in: kind ? ["ALL", kind] : ["ALL"] } }).sort({ createdAt: -1 }).limit(5).lean()
    return rows.map((a) => ({ id: String(a._id), message: a.message, linkUrl: a.linkUrl || "", linkLabel: a.linkLabel || "", tone: a.tone, endsAt: a.endsAt }))
}
