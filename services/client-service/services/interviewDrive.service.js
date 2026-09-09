import crypto from "crypto"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { ApiError } from "../utils/response.js"
import { requireValidObjectId } from "../utils/validateId.js"
import { communicationServiceClient } from "../config/internalClients.js"
import * as clientRepo from "../repositories/client.repository.js"

// The backend owns this, never the frontend - a client-generated
// Math.random() slug could collide, isn't guaranteed unique, and gives a
// candidate-facing URL no server-side record ever agreed to.
const generatePublicLink = () => crypto.randomBytes(6).toString("hex")

const normalizeRoundType = (value) => {
    const normalized = String(value || "Technical").trim().toLowerCase()
    if (normalized === "hr" || normalized === "hr round") return "HR"
    if (normalized === "technical" || normalized === "technical round") return "Technical"
    if (normalized === "managerial" || normalized === "managerial round") return "Managerial Round"
    return String(value || "Technical").trim()
}

const normalizeCandidate = (candidate, index = 0) => {
    const name = String(candidate?.name || "").trim()
    const email = String(candidate?.email || "").trim().toLowerCase()
    const phone = String(candidate?.phone || "").trim()
    const exp = String(candidate?.exp || "").trim()
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ApiError(400, "INVALID_CANDIDATE", `Candidate ${index + 1} needs a valid name and email.`)
    }
    if (phone && !/^\d{10}$/.test(phone)) {
        throw new ApiError(400, "INVALID_PHONE", `Candidate ${index + 1} phone must contain exactly 10 digits.`)
    }
    const experienceNumber = exp.match(/^\d+(?:\.\d+)?/)?.[0]
    if (exp && (!/^\d+(?:\.\d+)?(?:\s*(?:years?|yrs?))?$/.test(exp) || !experienceNumber || Number(experienceNumber) <= 0 || Number(experienceNumber) > 70)) {
        throw new ApiError(400, "INVALID_EXPERIENCE", `Candidate ${index + 1} experience must be greater than 0 and no more than 70 years.`)
    }
    return { id: candidate.id || `candidate-${crypto.randomBytes(8).toString("hex")}`, name, email, phone, exp, status: candidate.status || "INVITED", aiScore: Number(candidate.aiScore) || 0, malpracticeFlags: Number(candidate.malpracticeFlags) || 0 }
}

const normalizeCandidates = (candidates = []) => candidates.map((candidate, index) => normalizeCandidate(candidate, index))

const repairRoundStatuses = async (drive) => {
    if (!Array.isArray(drive.rounds) || drive.rounds.length === 0) return drive
    let changed = false

    if (drive.status === "DRAFT") {
        drive.rounds.forEach((round) => {
            if (round.status !== "DRAFT") {
                round.status = "DRAFT"
                changed = true
            }
        })
        if (drive.currentRound !== 1) {
            drive.currentRound = 1
            changed = true
        }
    } else {
        const activeRounds = drive.rounds.filter((round) => round.status === "ACTIVE")
        if (activeRounds.length > 1) {
            const currentRound = drive.rounds.find((round) => round.roundNumber === drive.currentRound) || activeRounds[activeRounds.length - 1]
            drive.rounds.forEach((round) => {
                const expectedStatus = round.roundNumber === currentRound.roundNumber
                    ? "ACTIVE"
                    : round.roundNumber < currentRound.roundNumber && round.status === "ACTIVE"
                    ? "COMPLETED"
                    : round.status
                if (round.status !== expectedStatus) {
                    round.status = expectedStatus
                    changed = true
                }
            })
        }
    }

    if (changed) await drive.save()
    return drive
}

// Fires one CANDIDATE_INVITE email per candidate - best-effort (a slow/
// unavailable communication-service must never fail drive/round creation,
// the roster is already persisted regardless of whether the email goes
// out). Every candidate gets the same public apply link since the
// interview isn't tied to one candidate's identity yet (no auth/session
// exists per-candidate - see backend.md's not-yet-built Interview Service).
const inviteCandidates = async (tenantId, drive, candidates, ctx) => {
    if (!candidates?.length || !drive.publicLink) return
    const org = await clientRepo.findById(tenantId).catch(() => null)
    const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "")
    const interviewLink = `${frontendBaseUrl}/apply/${drive.publicLink}`
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
    const isDraft = driveData.status === "DRAFT"
    if (!isDraft && (!driveData.title || !driveData.roleCategory || !driveData.department || !driveData.roundType || !driveData.startDate || !driveData.expiryDate)) {
        throw new ApiError(400, "MISSING_FIELDS", "Title, role, department, interview type, start date, and expiry date are mandatory.")
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = driveData.startDate ? new Date(`${driveData.startDate}T00:00:00`) : today
    const expiryDate = driveData.expiryDate ? new Date(`${driveData.expiryDate}T00:00:00`) : new Date(today.getTime() + 14 * 86400000)
    const windowDays = (expiryDate - startDate) / 86400000
    if (!isDraft && (Number.isNaN(startDate.getTime()) || startDate < today)) throw new ApiError(400, "INVALID_START_DATE", "Start date cannot be earlier than today.")
    if (!isDraft && (Number.isNaN(expiryDate.getTime()) || expiryDate < startDate || windowDays > 50)) throw new ApiError(400, "INVALID_EXPIRY_DATE", "Expiry date must be within 50 days of the start date.")

    const initialCandidates = normalizeCandidates(driveData.importedCandidateList || [])
    const totalRounds = Math.min(Math.max(Number(driveData.totalRounds) || 1, 1), 4)
    const status = isDraft ? "DRAFT" : "ACTIVE"
    const rounds = Array.from({ length: isDraft ? 1 : totalRounds }, (_, index) => ({
        roundNumber: index + 1,
        title: `Round ${index + 1}: ${driveData.roundType || "Technical Assessment"}`,
        type: normalizeRoundType(driveData.roundType),
        status: isDraft ? "DRAFT" : index === 0 ? "ACTIVE" : "PENDING",
        startDate,
        expiryDate,
        passingThreshold: driveData.passingThreshold || 70,
        skillRubrics: driveData.skillRubrics || [],
        questionMode: driveData.questionMode || "PREBUILT",
        questionBankTitle: driveData.questionBankTitle,
        customQuestions: driveData.customQuestionsList || [],
        candidates: index === 0 ? initialCandidates : [],
    }))
    const newDrive = new InterviewDrive({
        ...driveData,
        tenantId,
        title: driveData.title || "Untitled Interview Drive",
        roleCategory: driveData.roleCategory || "UNSPECIFIED",
        department: driveData.department || "UNSPECIFIED",
        experienceLevel: driveData.experienceLevel || "Not specified",
        roundType: driveData.roundType || "Technical Round",
        totalRounds,
        startDate,
        expiryDate,
        status,
        currentRound: 1,
        rounds,
        publicLink: status === "ACTIVE" && driveData.enablePublicLink !== false ? generatePublicLink() : null,
    })

    const saved = await newDrive.save()
    if (status === "ACTIVE") await inviteCandidates(tenantId, saved, initialCandidates, ctx)
    return saved
}

export const addCandidatesToDrive = async (tenantId, driveId, candidates, ctx, roundNumber = 1) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")
    if (!Array.isArray(candidates) || candidates.length === 0) throw new ApiError(400, "CANDIDATES_REQUIRED", "At least one candidate is required.")
    if (candidates.length > 500) throw new ApiError(400, "CANDIDATE_LIMIT", "Maximum 500 candidates can be imported at once.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    if (drive.status === "ARCHIVED") throw new ApiError(409, "ARCHIVED_DRIVE", "Archived drives cannot accept candidate uploads.")
    const round = drive.rounds?.find((item) => item.roundNumber === Number(roundNumber))
    if (!round) throw new ApiError(409, "ROUND_NOT_FOUND", "This drive has no active round.")
    if (round.status !== "ACTIVE") throw new ApiError(409, "ROUND_NOT_ACTIVE", "Activate this round before adding candidates.")

    const existingDriveCandidates = drive.rounds.flatMap((item) => item.candidates || [])
    const existingEmails = new Set(existingDriveCandidates.map((candidate) => candidate.email.toLowerCase()))
    const existingPhones = new Set(existingDriveCandidates.map((candidate) => candidate.phone).filter(Boolean))
    const additions = []
    for (const candidate of candidates) {
        const normalized = normalizeCandidate(candidate, additions.length)
        const { email } = normalized
        if (existingEmails.has(email) || (normalized.phone && existingPhones.has(normalized.phone))) continue
        existingEmails.add(email)
        if (normalized.phone) existingPhones.add(normalized.phone)
        additions.push(normalized)
    }
    if (additions.length === 0) throw new ApiError(400, "NO_NEW_CANDIDATES", "No unique new candidates were found. Existing email or phone records were skipped.")

    round.candidates.push(...additions)
    drive.candidatesCount = drive.rounds.reduce((total, item) => total + item.candidates.length, 0)
    await drive.save()
    await inviteCandidates(tenantId, drive, additions, ctx)
    return drive
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

export const listDrives = async (tenantId, filters = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const query = { tenantId }
    if (filters.status && filters.status !== "ALL") query.status = filters.status
    if (filters.search) {
        query.title = { $regex: filters.search, $options: "i" }
    }

    const drives = await InterviewDrive.find(query).sort({ createdAt: -1 })
    return drives
}

export const getDriveById = async (tenantId, driveId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    return repairRoundStatuses(drive)
}

export const addRoundToDrive = async (tenantId, driveId, roundData, ctx) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    if (drive.status === "ARCHIVED") throw new ApiError(409, "ARCHIVED_DRIVE", "Archived drives cannot have new rounds.")

    const nextRoundNum = (drive.rounds?.length || 0) + 1
    if (nextRoundNum > 4) throw new ApiError(400, "ROUND_LIMIT", "An interview drive can have a maximum of 4 rounds.")
    if (nextRoundNum > drive.totalRounds) throw new ApiError(400, "ROUND_LIMIT", `This drive is configured for ${drive.totalRounds} rounds.`)

    const existingEmails = new Set(drive.rounds.flatMap((round) => round.candidates || []).map((candidate) => candidate.email.toLowerCase()))
    const existingPhones = new Set(drive.rounds.flatMap((round) => round.candidates || []).map((candidate) => candidate.phone).filter(Boolean))
    const candidates = []
    for (const [index, candidate] of (roundData.candidates || []).entries()) {
        const normalized = normalizeCandidate(candidate, index)
        if (existingEmails.has(normalized.email) || (normalized.phone && existingPhones.has(normalized.phone))) continue
        existingEmails.add(normalized.email)
        if (normalized.phone) existingPhones.add(normalized.phone)
        candidates.push(normalized)
    }

    const newRound = {
        roundNumber: nextRoundNum,
        title: roundData.title || `Round ${nextRoundNum}: Managerial & System Design`,
        type: roundData.type || "Managerial Round",
        status: "DRAFT",
        startDate: roundData.startDate || drive.startDate,
        expiryDate: roundData.expiryDate || drive.expiryDate,
        passingThreshold: roundData.passingThreshold || 75,
        skillRubrics: roundData.skillRubrics || [],
        questionMode: roundData.questionMode || "PREBUILT",
        questionBankTitle: roundData.questionBankTitle,
        customQuestions: roundData.customQuestions || [],
        candidates,
    }

    drive.rounds.push(newRound)
    if (newRound.status === "ACTIVE") drive.currentRound = newRound.roundNumber
    drive.candidatesCount = drive.rounds.reduce((total, round) => total + round.candidates.length, 0)
    if (drive.totalRounds < newRound.roundNumber) {
        drive.totalRounds = newRound.roundNumber
    }

    await drive.save()
    if (newRound.status === "ACTIVE") await inviteCandidates(tenantId, drive, candidates, ctx)
    return drive
}

export const updateDriveStatus = async (tenantId, driveId, status, ctx = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")

    if (!["ACTIVE", "COMPLETED", "DRAFT", "ARCHIVED"].includes(status)) {
        throw new ApiError(400, "INVALID_STATUS", "Invalid drive status.")
    }
    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const activatingDraft = drive.status === "DRAFT" && status === "ACTIVE"
    drive.status = status
    if (activatingDraft && drive.enablePublicLink && !drive.publicLink) drive.publicLink = generatePublicLink()
    if (activatingDraft) {
        const firstRound = drive.rounds?.find((round) => round.roundNumber === 1)
        if (firstRound) firstRound.status = "ACTIVE"
    }
    await drive.save()
    if (activatingDraft) await inviteCandidates(tenantId, drive, drive.rounds?.[0]?.candidates || [], ctx)
    return drive
}

export const updateRoundStatus = async (tenantId, driveId, roundNumber, status, ctx = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")
    if (!['ACTIVE', 'COMPLETED', 'DRAFT', 'PENDING'].includes(status)) {
        throw new ApiError(400, "INVALID_STATUS", "Invalid round status.")
    }

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    if (drive.status === "ARCHIVED") throw new ApiError(409, "ARCHIVED_DRIVE", "Archived drives cannot be activated.")
    const round = drive.rounds?.find((item) => item.roundNumber === Number(roundNumber))
    if (!round) throw new ApiError(404, "ROUND_NOT_FOUND", "Interview round not found.")

    const activating = status === 'ACTIVE' && round.status !== 'ACTIVE'
    const previousRound = drive.rounds?.find((item) => item.roundNumber === Number(roundNumber) - 1)
    const previousRoundReady = drive.status !== 'DRAFT' && previousRound && previousRound.status === 'COMPLETED'
    if (activating && previousRound && !previousRoundReady) {
        throw new ApiError(409, "PREVIOUS_ROUND_REQUIRED", `Complete Round ${previousRound.roundNumber} before activating Round ${round.roundNumber}.`)
    }
    round.status = status
    if (activating) {
        drive.currentRound = round.roundNumber
        if (drive.status === 'DRAFT') {
            drive.status = 'ACTIVE'
            if (drive.enablePublicLink && !drive.publicLink) drive.publicLink = generatePublicLink()
        }
    }
    await drive.save()
    if (activating) await inviteCandidates(tenantId, drive, round.candidates || [], ctx)
    return drive
}

export const updateRound = async (tenantId, driveId, roundNumber, roundData) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    if (drive.status === "ARCHIVED") throw new ApiError(409, "ARCHIVED_DRIVE", "Archived drives cannot be edited.")
    const round = drive.rounds?.find((item) => item.roundNumber === Number(roundNumber))
    if (!round) throw new ApiError(404, "ROUND_NOT_FOUND", "Interview round not found.")

    if (Number(roundNumber) === 1 && roundData.driveDetails) {
        const details = roundData.driveDetails
        if (details.title) drive.title = String(details.title).trim()
        if (details.roleCategory) drive.roleCategory = String(details.roleCategory).trim()
        if (details.department) drive.department = String(details.department).trim()
        if (details.experienceLevel) drive.experienceLevel = String(details.experienceLevel).trim()
        if (details.roundType) drive.roundType = String(details.roundType).trim()
        if (details.totalRounds) drive.totalRounds = Math.min(Math.max(Number(details.totalRounds) || drive.totalRounds, drive.rounds.length), 4)
        if (details.startDate) drive.startDate = new Date(`${details.startDate}T00:00:00`)
        if (details.expiryDate) {
            drive.expiryDate = new Date(`${details.expiryDate}T00:00:00`)
            round.expiryDate = drive.expiryDate
        }
    }

    if (roundData.communicationSettings !== undefined) drive.communicationSettings = roundData.communicationSettings
    if (roundData.enablePublicLink !== undefined) drive.enablePublicLink = Boolean(roundData.enablePublicLink)

    const candidates = (roundData.candidates || round.candidates || []).map((candidate, index) => normalizeCandidate(candidate, index))
    round.title = String(roundData.title || round.title).trim()
    round.type = String(roundData.type || round.type).trim()
    round.startDate = roundData.startDate || round.startDate || drive.startDate
    round.expiryDate = roundData.expiryDate || round.expiryDate
    round.passingThreshold = Number(roundData.passingThreshold) || round.passingThreshold
    round.questionMode = roundData.questionMode || round.questionMode
    round.questionBankTitle = roundData.questionBankTitle || round.questionBankTitle
    round.skillRubrics = roundData.skillRubrics || round.skillRubrics
    round.customQuestions = roundData.customQuestions || roundData.customQuestionsList || round.customQuestions
    round.candidates = candidates
    if (drive.status === 'DRAFT' || round.status !== 'ACTIVE') round.status = 'DRAFT'
    drive.candidatesCount = drive.rounds.reduce((total, item) => total + item.candidates.length, 0)
    await drive.save()
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

export const updateCandidate = async (tenantId, driveId, roundNumber, candidateId, data) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const round = drive.rounds.find((item) => item.roundNumber === Number(roundNumber))
    const candidate = round?.candidates.find((item) => item.id === candidateId)
    if (!candidate) throw new ApiError(404, "CANDIDATE_NOT_FOUND", "Candidate not found in this round.")

    const normalized = normalizeCandidate({ ...data, id: candidateId }, 0)
    const { name, email } = normalized
    const duplicate = round.candidates.some((item) => item.id !== candidateId && item.email.toLowerCase() === email)
    if (duplicate) throw new ApiError(409, "DUPLICATE_CANDIDATE", "Another candidate in this round already uses that email.")

    candidate.name = name
    candidate.email = email
    candidate.phone = normalized.phone
    candidate.exp = normalized.exp
    await drive.save()
    return drive
}

export const removeCandidate = async (tenantId, driveId, roundNumber, candidateId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const round = drive.rounds.find((item) => item.roundNumber === Number(roundNumber))
    if (!round?.candidates.some((item) => item.id === candidateId)) {
        throw new ApiError(404, "CANDIDATE_NOT_FOUND", "Candidate not found in this round.")
    }
    round.candidates = round.candidates.filter((item) => item.id !== candidateId)
    drive.candidatesCount = drive.rounds.reduce((total, item) => total + item.candidates.length, 0)
    await drive.save()
    return drive
}

// Flattens every candidate across every round of every drive for this
// tenant into one searchable/filterable/paginated list - computed with a
// single aggregation pipeline rather than downloading every drive to the
// browser and flattening it there.
export const listAllCandidates = async (tenantId, { search, status, page = 1, limit = 25 } = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const pageNum = Math.max(Number(page) || 1, 1)
    const pageSize = Math.min(Math.max(Number(limit) || 25, 1), 100)

    const matchCandidate = {}
    if (status && status !== "ALL") matchCandidate["candidate.status"] = status
    if (search) matchCandidate["candidate.name"] = { $regex: search, $options: "i" }

    const basePipeline = [
        { $match: { tenantId } },
        { $unwind: "$rounds" },
        { $unwind: "$rounds.candidates" },
        {
            $project: {
                driveId: "$_id",
                driveTitle: "$title",
                roundNumber: "$rounds.roundNumber",
                roundTitle: "$rounds.title",
                candidate: "$rounds.candidates",
            },
        },
        ...(Object.keys(matchCandidate).length ? [{ $match: matchCandidate }] : []),
    ]

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
