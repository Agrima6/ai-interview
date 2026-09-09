import crypto from "crypto"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { NotificationTemplate } from "../models/notificationTemplate.model.js"
import { ApiError } from "../utils/response.js"
import { requireValidObjectId } from "../utils/validateId.js"
import { communicationServiceClient } from "../config/internalClients.js"
import * as clientRepo from "../repositories/client.repository.js"

// Same {var}/{{var}} interpolation the frontend's renderWithSamples()
// preview uses (client/src/constants/templateVariables.js) - kept in sync
// by hand since the two run in different services/languages, but the
// substitution rule itself (single or double braces, unknown keys left
// as-is) must match or a saved template would preview differently than it
// actually sends.
const renderTemplateText = (text, values) =>
    (text || "").replace(/\{\{?\s*(\w+)\s*\}?\}/g, (match, key) => (key in values ? values[key] : match))

// The backend owns this, never the frontend - a client-generated
// Math.random() slug could collide, isn't guaranteed unique, and gives a
// candidate-facing URL no server-side record ever agreed to.
const generatePublicLink = () => crypto.randomBytes(6).toString("hex")

// Fires one CANDIDATE_INVITE email per candidate - best-effort (a slow/
// unavailable communication-service must never fail drive/round creation,
// the roster is already persisted regardless of whether the email goes
// out). Every candidate gets the same public apply link since the
// interview isn't tied to one candidate's identity yet (no auth/session
// exists per-candidate - see backend.md's not-yet-built Interview Service).
const inviteCandidates = async (tenantId, drive, candidates, ctx) => {
    if (!candidates?.length || !drive.publicLink) return
    const org = await clientRepo.findById(tenantId).catch(() => null)
    const interviewLink = `${process.env.FRONTEND_BASE_URL}/apply/${drive.publicLink}`
    const expiryDate = new Date(drive.expiryDate).toLocaleDateString()

    for (const candidate of candidates) {
        if (!candidate.email) continue
        communicationServiceClient.send({
            entityType: "CLIENT", entityId: tenantId, channel: "EMAIL",
            eventType: "CANDIDATE_INVITE", recipient: candidate.email,
            variables: {
                candidate_name: candidate.name || "there",
                drive_title: drive.title,
                company_name: org?.name || "the hiring team",
                interview_link: interviewLink,
                expiry_date: expiryDate,
                supportEmail: process.env.SUPPORT_EMAIL || "support@workmateiq.com",
            },
        }, ctx).catch((err) => console.error(`[client-service] candidate-invite email failed for ${candidate.email}:`, err.message))
    }
}

export const createDrive = async (tenantId, driveData, ctx) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    if (!driveData.title || !driveData.expiryDate) {
        throw new ApiError(400, "MISSING_FIELDS", "Title and expiry date are mandatory.")
    }

    const firstRound = {
        roundNumber: 1,
        title: `Round 1: ${driveData.roundType || "Technical Assessment"}`,
        type: driveData.roundType || "Technical Round",
        status: "ACTIVE",
        expiryDate: driveData.expiryDate,
        passingThreshold: driveData.passingThreshold || 70,
        skillRubrics: driveData.skillRubrics || [],
        questionMode: driveData.questionMode || "PREBUILT",
        questionBankTitle: driveData.questionBankTitle,
        customQuestions: driveData.customQuestionsList || [],
        candidates: driveData.importedCandidateList || [],
    }

    const newDrive = new InterviewDrive({
        ...driveData,
        tenantId,
        currentRound: 1,
        rounds: [firstRound],
        publicLink: driveData.enablePublicLink === false ? null : generatePublicLink(),
    })

    const saved = await newDrive.save()
    await inviteCandidates(tenantId, saved, driveData.importedCandidateList, ctx)
    return saved
}

// Public (unauthenticated) - a candidate clicking their invite link isn't
// signed in, so this can never expose anything beyond what a candidate
// landing page needs: no candidate roster, no other rounds' data, no
// tenantId. Looked up by the random publicLink slug, never by _id.
export const getPublicDriveBySlug = async (link) => {
    const drive = await InterviewDrive.findOne({ publicLink: link, status: "ACTIVE" })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "This interview link is invalid or no longer active.")

    const org = await clientRepo.findById(drive.tenantId).catch(() => null)
    return {
        title: drive.title,
        roleCategory: drive.roleCategory,
        department: drive.department,
        experienceLevel: drive.experienceLevel,
        expiryDate: drive.expiryDate,
        companyName: org?.name || null,
        expired: new Date(drive.expiryDate) < new Date(),
    }
}

// Shared by listDrives (paginated table) and exportDrivesCsv (full
// filtered dataset) so the two can never disagree on what "matching the
// filters" means - integration.md section 16 requires an export to
// contain exactly the filtered rows, not a separately-computed set.
const buildDriveQuery = (tenantId, filters = {}) => {
    const query = { tenantId }
    if (filters.status && filters.status !== "ALL") query.status = filters.status
    if (filters.department) query.department = filters.department
    if (filters.roleCategory) query.roleCategory = filters.roleCategory
    if (filters.experienceLevel) query.experienceLevel = filters.experienceLevel
    if (filters.search) {
        query.title = { $regex: filters.search, $options: "i" }
    }
    if (filters.createdFrom || filters.createdTo) {
        query.createdAt = {}
        if (filters.createdFrom) query.createdAt.$gte = new Date(filters.createdFrom)
        if (filters.createdTo) query.createdAt.$lte = new Date(filters.createdTo)
    }
    return query
}

export const listDrives = async (tenantId, filters = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const query = buildDriveQuery(tenantId, filters)
    const page = Math.max(Number(filters.page) || 1, 1)
    const pageSize = Math.min(Math.max(Number(filters.pageSize) || 25, 1), 100)

    const [drives, total] = await Promise.all([
        InterviewDrive.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
        InterviewDrive.countDocuments(query),
    ])

    return { items: drives, total, page, pageSize }
}

const DRIVE_CSV_EXPORT_CAP = 5000

export const exportDrivesCsv = async (tenantId, filters = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const query = buildDriveQuery(tenantId, filters)
    const drives = await InterviewDrive.find(query).sort({ createdAt: -1 }).limit(DRIVE_CSV_EXPORT_CAP)

    const header = ["Title", "Status", "Department", "Role Category", "Experience Level", "Candidates", "Passing Threshold", "Public Link", "Created", "Updated"]
    const lines = drives.map((d) => [
        d.title, d.status, d.department, d.roleCategory, d.experienceLevel,
        d.candidatesCount || d.rounds?.[0]?.candidates?.length || 0, d.passingThreshold,
        d.publicLink ? "Enabled" : "Disabled",
        d.createdAt.toISOString().slice(0, 10), d.updatedAt.toISOString().slice(0, 10),
    ].map(csvEscape).join(","))

    return [header.join(","), ...lines].join("\n")
}

export const getDriveById = async (tenantId, driveId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    return drive
}

export const addRoundToDrive = async (tenantId, driveId, roundData, ctx) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const nextRoundNum = (drive.rounds?.length || 0) + 1

    const newRound = {
        roundNumber: roundData.roundNumber || nextRoundNum,
        title: roundData.title || `Round ${nextRoundNum}: Managerial & System Design`,
        type: roundData.type || "Managerial Round",
        status: "ACTIVE",
        expiryDate: roundData.expiryDate || drive.expiryDate,
        passingThreshold: roundData.passingThreshold || 75,
        skillRubrics: roundData.skillRubrics || [],
        questionMode: roundData.questionMode || "PREBUILT",
        questionBankTitle: roundData.questionBankTitle,
        customQuestions: roundData.customQuestions || [],
        candidates: roundData.candidates || [],
    }

    drive.rounds.push(newRound)
    drive.currentRound = newRound.roundNumber
    if (drive.totalRounds < newRound.roundNumber) {
        drive.totalRounds = newRound.roundNumber
    }

    await drive.save()
    await inviteCandidates(tenantId, drive, roundData.candidates, ctx)
    return drive
}

export const updateDriveStatus = async (tenantId, driveId, status) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const drive = await InterviewDrive.findOneAndUpdate(
        { _id: driveId, tenantId },
        { $set: { status } },
        { new: true }
    )
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    return drive
}

// Persists a shortlist/reject/etc. decision on one candidate inside one
// round - previously this only ever happened in frontend-only state
// (CandidateDetailModal's onStatusChange callback), so refreshing the page
// silently reverted the decision. Uses Mongo's positional operators to
// update the exact embedded candidate without touching sibling rounds.
export const updateCandidateStatus = async (tenantId, driveId, roundNumber, candidateId, status) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")
    if (!["INVITED", "SHORTLISTED", "COMPLETED", "REJECTED"].includes(status)) {
        throw new ApiError(400, "INVALID_STATUS", "Invalid candidate status.")
    }

    const drive = await InterviewDrive.findOneAndUpdate(
        { _id: driveId, tenantId, "rounds.roundNumber": Number(roundNumber), "rounds.candidates.id": candidateId },
        { $set: { "rounds.$[round].candidates.$[candidate].status": status } },
        {
            new: true,
            arrayFilters: [{ "round.roundNumber": Number(roundNumber) }, { "candidate.id": candidateId }],
        }
    )
    if (!drive) throw new ApiError(404, "CANDIDATE_NOT_FOUND", "Candidate not found in this round.")
    return drive
}

// Flattens every candidate across every round of every drive for this
// tenant into one searchable/filterable/paginated list - computed with a
// single aggregation pipeline rather than downloading every drive to the
// browser and flattening it there.
// Shared by listAllCandidates (paginated table) and exportCandidatesCsv
// (full filtered dataset) so the two can never drift on what "matching the
// filters" means - integration.md section 16 requires the export to
// contain exactly the filtered rows, not a separately-computed set.
const buildCandidatePipeline = (tenantId, { search, status, department } = {}) => {
    const matchCandidate = {}
    if (status && status !== "ALL") matchCandidate["candidate.status"] = status
    if (search) matchCandidate["candidate.name"] = { $regex: search, $options: "i" }
    if (department) matchCandidate["department"] = department

    return [
        { $match: { tenantId } },
        { $unwind: "$rounds" },
        { $unwind: "$rounds.candidates" },
        {
            $project: {
                driveId: "$_id",
                driveTitle: "$title",
                department: "$department",
                roundNumber: "$rounds.roundNumber",
                roundTitle: "$rounds.title",
                candidate: "$rounds.candidates",
            },
        },
        ...(Object.keys(matchCandidate).length ? [{ $match: matchCandidate }] : []),
    ]
}

export const listAllCandidates = async (tenantId, { search, status, department, page = 1, limit = 25 } = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const pageNum = Math.max(Number(page) || 1, 1)
    const pageSize = Math.min(Math.max(Number(limit) || 25, 1), 100)
    const basePipeline = buildCandidatePipeline(tenantId, { search, status, department })

    const [items, totalResult] = await Promise.all([
        InterviewDrive.aggregate([
            ...basePipeline,
            { $sort: { "candidate.attemptedDate": -1, _id: -1 } },
            { $skip: (pageNum - 1) * pageSize },
            { $limit: pageSize },
        ]),
        InterviewDrive.aggregate([...basePipeline, { $count: "total" }]),
    ])

    return { items, total: totalResult[0]?.total || 0, page: pageNum, pageSize }
}

const CSV_EXPORT_CAP = 5000

const csvEscape = (value) => {
    const str = String(value ?? "")
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

// Streams the SAME filtered dataset listAllCandidates would page through,
// as CSV - never "fetch everything, filter on the frontend" (section 16).
// Capped at CSV_EXPORT_CAP rows as a safety valve against an unbounded
// export request; large tenants should narrow filters rather than pull
// every candidate they've ever had in one file.
export const exportCandidatesCsv = async (tenantId, filters = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const basePipeline = buildCandidatePipeline(tenantId, filters)
    const rows = await InterviewDrive.aggregate([
        ...basePipeline,
        { $sort: { "candidate.attemptedDate": -1, _id: -1 } },
        { $limit: CSV_EXPORT_CAP },
    ])

    const header = ["Name", "Email", "Phone", "Experience", "Department", "Drive", "Round", "Status", "AI Score", "Attempted Date"]
    const lines = rows.map((r) => [
        r.candidate.name, r.candidate.email, r.candidate.phone || "", r.candidate.exp || "",
        r.department || "", r.driveTitle, r.roundTitle, r.candidate.status,
        r.candidate.aiScore ?? "", r.candidate.attemptedDate ? new Date(r.candidate.attemptedDate).toISOString().slice(0, 10) : "",
    ].map(csvEscape).join(","))

    return [header.join(","), ...lines].join("\n")
}

// Powers both dashboard-service's per-organization dashboard (which used to
// return hardcoded zeros - see backend.md's "Organization + Dashboard
// services only" scoping note, now that this drive/candidate data actually
// exists) and the Reports page's KPI/funnel/breakdown widgets. One
// aggregation pass over every candidate in every round of every drive for
// this tenant, rather than each caller re-deriving its own slice.
export const getTenantReport = async (tenantId, { days = 30 } = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const [drives, candidateRows] = await Promise.all([
        InterviewDrive.find({ tenantId }).select("status department createdAt").lean(),
        InterviewDrive.aggregate([
            { $match: { tenantId } },
            { $unwind: "$rounds" },
            { $unwind: "$rounds.candidates" },
            {
                $project: {
                    department: "$department",
                    status: "$rounds.candidates.status",
                    aiScore: "$rounds.candidates.aiScore",
                    attemptedDate: "$rounds.candidates.attemptedDate",
                },
            },
        ]),
    ])

    const totalDrives = drives.length
    const activeDrives = drives.filter((d) => d.status === "ACTIVE").length

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const candidatesThisMonth = candidateRows.filter((c) => c.attemptedDate && new Date(c.attemptedDate) >= startOfMonth).length
    const interviewsDone = candidateRows.filter((c) => c.status !== "INVITED").length
    const scored = candidateRows.filter((c) => c.aiScore > 0)
    const averageScore = scored.length ? Math.round(scored.reduce((acc, c) => acc + c.aiScore, 0) / scored.length) : 0

    const totalCandidates = candidateRows.length
    const stageCount = (predicate) => candidateRows.filter(predicate).length
    const pct = (n) => (totalCandidates ? Math.round((n / totalCandidates) * 100) : 0)
    const invited = totalCandidates
    const completedCount = stageCount((c) => c.status !== "INVITED")
    const shortlistedCount = stageCount((c) => c.status === "SHORTLISTED")
    const rejectedCount = stageCount((c) => c.status === "REJECTED")
    const pipeline = totalCandidates === 0 ? [] : [
        { key: "invited", label: "Invited", count: invited, percentage: 100, colorVariant: "neutral" },
        { key: "completed", label: "Completed Interview", count: completedCount, percentage: pct(completedCount), colorVariant: "cyan" },
        { key: "shortlisted", label: "Shortlisted", count: shortlistedCount, percentage: pct(shortlistedCount), colorVariant: "primary" },
        { key: "rejected", label: "Rejected", count: rejectedCount, percentage: pct(rejectedCount), colorVariant: "neutral" },
    ]

    const scoreBuckets = [
        { bucket: "0-40", min: 0, max: 40 },
        { bucket: "41-60", min: 41, max: 60 },
        { bucket: "61-75", min: 61, max: 75 },
        { bucket: "76-90", min: 76, max: 90 },
        { bucket: "91-100", min: 91, max: 100 },
    ]
    const scoreDistribution = scoreBuckets.map(({ bucket, min, max }) => ({
        bucket,
        count: scored.filter((c) => c.aiScore >= min && c.aiScore <= max).length,
    }))

    const departmentTotals = new Map()
    for (const row of candidateRows) {
        const dept = row.department || "Unspecified"
        departmentTotals.set(dept, (departmentTotals.get(dept) || 0) + 1)
    }
    const departmentBreakdown = [...departmentTotals.entries()]
        .map(([department, count]) => ({ department, count, percentage: pct(count) }))
        .sort((a, b) => b.count - a.count)

    const trendWindowStart = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)
    const dayBuckets = new Map()
    for (const row of candidateRows) {
        if (!row.attemptedDate || new Date(row.attemptedDate) < trendWindowStart) continue
        const day = new Date(row.attemptedDate).toISOString().slice(0, 10)
        dayBuckets.set(day, (dayBuckets.get(day) || 0) + 1)
    }
    const interviewTrend = [...dayBuckets.entries()].map(([date, count]) => ({ date, count }))

    return {
        summary: { totalDrives, activeDrives, candidatesThisMonth, interviewsDone, averageScore, totalCandidates },
        pipeline,
        scoreDistribution,
        departmentBreakdown,
        interviewTrend,
    }
}

// Sends a recruiter-triggered CONGRATULATIONS/REJECTION communication to a
// bulk selection of candidates using the organization's own edited
// NotificationTemplate (Templates page), and - for REJECTION only - moves
// each candidate to REJECTED once the decision is made. Communication
// delivery is best-effort per candidate (one slow/failed send must never
// stop the rest of the batch or the status update the recruiter asked
// for), but every attempt is recorded on the candidate for audit/duplicate
// visibility (integration.md section 32/52).
export const communicateWithCandidates = async (tenantId, driveId, roundNumber, { candidateIds, purpose, templateId }, ctx) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
        throw new ApiError(400, "MISSING_CANDIDATES", "At least one candidate must be selected.")
    }
    if (!["CONGRATULATIONS", "REJECTION"].includes(purpose)) {
        throw new ApiError(400, "INVALID_PURPOSE", "purpose must be CONGRATULATIONS or REJECTION.")
    }

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const round = drive.rounds.find((r) => r.roundNumber === Number(roundNumber))
    if (!round) throw new ApiError(404, "ROUND_NOT_FOUND", "Round not found on this drive.")

    const template = await NotificationTemplate.findOne({ tenantId, $or: [{ templateId }, { _id: templateId }] })
    if (!template) throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Communication template not found.")
    if (template.type !== "EMAIL" && template.type !== "WHATSAPP") {
        throw new ApiError(400, "TEMPLATE_NOT_SENDABLE", "Call templates are scripts for manual use and cannot be auto-sent.")
    }

    const org = await clientRepo.findById(tenantId).catch(() => null)
    const interviewLink = drive.publicLink ? `${process.env.FRONTEND_BASE_URL}/apply/${drive.publicLink}` : ""
    const expiryDate = round.expiryDate ? new Date(round.expiryDate).toLocaleDateString() : ""

    const candidates = round.candidates.filter((c) => candidateIds.includes(c.id))
    if (candidates.length === 0) throw new ApiError(404, "CANDIDATE_NOT_FOUND", "None of the selected candidates were found in this round.")

    const results = []
    for (const candidate of candidates) {
        const recipient = template.type === "EMAIL" ? candidate.email : candidate.phone
        const variables = {
            candidate_name: candidate.name || "there",
            drive_title: drive.title,
            company_name: org?.name || "the hiring team",
            interview_link: interviewLink,
            expiry_date: expiryDate,
        }

        let status = "FAILED"
        if (recipient) {
            try {
                await communicationServiceClient.send({
                    entityType: "CLIENT", entityId: tenantId, channel: template.type,
                    eventType: `ROUND_${purpose}`, recipient,
                    subject: template.type === "EMAIL" ? renderTemplateText(template.subject, variables) : undefined,
                    body: renderTemplateText(template.body, variables),
                }, ctx)
                status = "SENT"
            } catch (error) {
                console.error(`[client-service] round communication failed for candidate ${candidate.id}:`, error.message)
            }
        }

        candidate.communications.push({ purpose, channel: template.type, templateId: String(template._id), status })
        if (purpose === "REJECTION") candidate.status = "REJECTED"

        results.push({ candidateId: candidate.id, name: candidate.name, status })
    }

    await drive.save()
    return { results, sentCount: results.filter((r) => r.status === "SENT").length, failedCount: results.filter((r) => r.status === "FAILED").length }
}
