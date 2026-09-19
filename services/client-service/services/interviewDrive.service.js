import crypto from "crypto"
import { InterviewDrive } from "../models/interviewDrive.model.js"
import { NotificationTemplate } from "../models/notificationTemplate.model.js"
import { ApiError } from "../utils/response.js"
import { requireValidObjectId } from "../utils/validateId.js"
import { communicationServiceClient, authServiceClient } from "../config/internalClients.js"
import * as clientRepo from "../repositories/client.repository.js"
import { agentServiceClient } from "../config/agentServiceClient.js"
import { uploadBuffer, getObjectBuffer, getObjectStream, RESUMES_BUCKET, RECORDINGS_BUCKET } from "../config/s3Client.js"
import { enqueueRecordingProcessing } from "../config/sqsClient.js"

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

// FRONTEND_BASE_URL going missing/mistyped shouldn't produce a broken
// "undefined/apply/..." link in a candidate invite email - fall back to
// localhost (matches local dev) and always strip any trailing slash so a
// value with or without one produces the same, correctly-formed URL.
const buildFrontendUrl = (path) => `${(process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "")}${path}`

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
    const expiryDate = new Date(drive.expiryDate).toLocaleDateString()

    for (const candidate of candidates) {
        if (!candidate.email) continue
        // Carries the candidate's email through to the apply page so it can
        // look up and lock the fields HR already filled in for them,
        // instead of asking them to retype (and possibly contradict) data
        // that's already on file.
        const interviewLink = buildFrontendUrl(`/apply/${drive.publicLink}?email=${encodeURIComponent(candidate.email)}`)
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
            metadata: { driveId: String(drive._id), candidateId: candidate.id },
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
    const round1 = drive.rounds?.find((r) => r.roundNumber === 1)
    return {
        title: drive.title,
        roleCategory: drive.roleCategory,
        department: drive.department,
        experienceLevel: drive.experienceLevel,
        startDate: drive.startDate || null,
        expiryDate: drive.expiryDate,
        companyName: org?.name || null,
        expired: new Date(drive.expiryDate) < new Date(),
        // A candidate who already applied (found by re-visiting the same
        // link, e.g. from the confirmation email) sees a "you're in" state
        // instead of the form again - matched by email would need the
        // candidate to identify themselves first, so this is intentionally
        // left to the frontend's own localStorage-based "already applied"
        // flag rather than a server-side lookup with no candidate identity yet.
        roundOpen: round1?.status === "ACTIVE",
        // Blue-collar candidates frequently don't have a resume at all -
        // the frontend uses this to stop requiring one.
        resumeOptional: drive.roleCategory === "BLUE_COLLAR",
    }
}

// Public (unauthenticated) - looks up whatever HR already entered for this
// candidate (bulk import, or added while creating the drive) so the apply
// form can pre-fill and lock those fields instead of asking the candidate
// to retype (and possibly contradict) data HR already has on file. Only
// ever matched by email, and only returns name/phone/exp - never anything
// else on the roster (score, status, other candidates).
export const getPublicApplicationPrefill = async (link, email) => {
    if (!email) return { prefilled: false }
    const drive = await InterviewDrive.findOne({ publicLink: link, status: "ACTIVE" })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "This interview link is invalid or no longer active.")
    const round = drive.rounds?.find((r) => r.roundNumber === 1)
    const candidate = round?.candidates.find((c) => c.email.toLowerCase() === email.toLowerCase())
    if (!candidate) return { prefilled: false }
    // Only lock fields for a bare invite - if they already fully applied,
    // there's nothing left to pre-fill (the form won't even be shown).
    if (candidate.resumeFilename || candidate.interviewSlot) return { prefilled: false }
    return { prefilled: true, name: candidate.name, phone: candidate.phone || "", exp: candidate.exp || "" }
}

// Public (unauthenticated) self-service application - a candidate filling
// out the apply page submits their own info/resume/slot directly, unlike
// addCandidatesToDrive (recruiter-driven CSV import). Reuses the same
// normalizeCandidate validation and duplicate-email guard so a candidate
// can't end up with two roster entries by re-submitting.
export const applyToPublicDrive = async (link, applicationData, resumeFile, ctx) => {
    const drive = await InterviewDrive.findOne({ publicLink: link, status: "ACTIVE" })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "This interview link is invalid or no longer active.")
    if (new Date(drive.expiryDate) < new Date()) throw new ApiError(410, "DRIVE_EXPIRED", "This interview invitation has expired.")

    const round = drive.rounds?.find((r) => r.roundNumber === 1)
    if (!round || round.status !== "ACTIVE") throw new ApiError(409, "ROUND_NOT_OPEN", "This drive isn't accepting applications right now.")

    if (!applicationData.interviewSlot) throw new ApiError(400, "SLOT_REQUIRED", "Please choose an interview slot.")
    const slot = new Date(applicationData.interviewSlot)
    if (Number.isNaN(slot.getTime()) || slot < new Date() || slot > new Date(drive.expiryDate)) {
        throw new ApiError(400, "INVALID_SLOT", "Please choose a valid upcoming slot before the application deadline.")
    }

    const normalized = normalizeCandidate(applicationData, 0)
    const existing = round.candidates.find((c) => c.email.toLowerCase() === normalized.email)
    // A recruiter-added roster entry (bulk import, or the invite step of
    // creating a drive) has no resume/slot yet - it's a placeholder waiting
    // for the candidate, not a completed application. Only a candidate who
    // has ALREADY filled this in for real should be blocked from doing it
    // again; a bare invite should be completed in place by their self-apply,
    // not treated as a conflict.
    if (existing && (existing.resumeFilename || existing.interviewSlot)) {
        throw new ApiError(409, "ALREADY_APPLIED", "An application with this email already exists for this drive.")
    }

    const preferredLanguage = ["en", "hi", "hinglish"].includes(applicationData.preferredLanguage) ? applicationData.preferredLanguage : "en"

    const candidate = existing || { id: `candidate-${crypto.randomBytes(8).toString("hex")}` }

    // Resume is buffered in memory by multer (middlewares/resumeUpload.js)
    // and goes straight to S3/MinIO - resumeFilename stores the S3 object
    // key, not a local path (plan.md #11: object storage, not local disk).
    let resumeKey = existing?.resumeFilename || null
    if (resumeFile) {
        resumeKey = `${drive.tenantId}/${candidate.id}/${Date.now()}-${resumeFile.originalname}`
        await uploadBuffer(RESUMES_BUCKET, resumeKey, resumeFile.buffer, resumeFile.mimetype)
    }

    Object.assign(candidate, normalized, {
        id: candidate.id, // preserve the roster entry's original id when completing an existing invite
        interviewSlot: slot,
        resumeFilename: resumeKey,
        resumeOriginalName: resumeFile?.originalname || existing?.resumeOriginalName || null,
        preferredLanguage,
    })
    if (!existing) round.candidates.push(candidate)
    drive.candidatesCount = drive.rounds.reduce((total, r) => total + r.candidates.length, 0)
    await drive.save()

    const org = await clientRepo.findById(drive.tenantId).catch(() => null)

    // Best-effort: issue the candidate a login so they can come back to
    // their "room" and take the interview later - failure here must never
    // block the application itself (the roster entry above already saved).
    let credentials = null
    try {
        credentials = await authServiceClient.createCandidateUser(
            { email: candidate.email, name: candidate.name, tenantId: drive.tenantId },
            ctx
        )
    } catch (err) {
        console.error(`[client-service] candidate account creation failed for ${candidate.email}:`, err.message)
    }

    communicationServiceClient.send({
        entityType: "CLIENT", entityId: drive.tenantId, channel: "EMAIL",
        eventType: "CANDIDATE_APPLICATION_CONFIRMED", recipient: candidate.email,
        variables: {
            candidate_name: candidate.name || "there",
            drive_title: drive.title,
            company_name: org?.name || "the hiring team",
            interview_slot: slot.toLocaleString(),
            login_email: credentials?.email || candidate.email,
            temp_password: credentials?.password || "(check your existing WorkmateIQ password)",
            login_url: buildFrontendUrl("/candidate/login"),
            supportEmail: process.env.SUPPORT_EMAIL || "support@workmateiq.com",
        },
    }, ctx).catch((err) => console.error(`[client-service] application-confirmation email failed for ${candidate.email}:`, err.message))

    return { title: drive.title, slot, candidateName: candidate.name }
}

// Candidate-scoped (authenticated CANDIDATE role) - "my interviews" for the
// candidate's own room. Scanning every drive in the tenant and filtering in
// JS (rather than a Mongo query into the nested rounds.candidates array) is
// fine at this data scale and keeps the shape simple; revisit with an
// aggregation if a tenant's drive count grows large.
export const getMyInterviews = async (tenantId, email) => {
    if (!tenantId || !email) return []
    const normalizedEmail = email.toLowerCase()
    const drives = await InterviewDrive.find({ tenantId, status: { $ne: "ARCHIVED" } })
    const results = []
    for (const drive of drives) {
        for (const round of drive.rounds || []) {
            const candidate = round.candidates?.find((c) => c.email?.toLowerCase() === normalizedEmail)
            if (!candidate) continue
            results.push({
                driveId: drive._id,
                driveTitle: drive.title,
                department: drive.department,
                roundNumber: round.roundNumber,
                roundTitle: round.title,
                roundStatus: round.status,
                interviewSlot: candidate.interviewSlot,
                candidateStatus: candidate.status,
                aiScore: candidate.aiScore,
            })
        }
    }
    return results.sort((a, b) => new Date(a.interviewSlot || 0) - new Date(b.interviewSlot || 0))
}

// Shared by the candidate-scoped violation/complete endpoints below - a
// candidate can only ever act on their OWN roster entry, matched by the
// email on their access token (never a client-supplied candidateId), on a
// drive that belongs to their own token's tenant.
const findOwnRosterEntry = async (tenantId, email, driveId, roundNumber) => {
    if (!tenantId || !email) throw new ApiError(403, "FORBIDDEN", "Candidate context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const round = drive.rounds?.find((r) => r.roundNumber === Number(roundNumber))
    if (!round) throw new ApiError(404, "ROUND_NOT_FOUND", "Round not found.")
    const candidate = round.candidates?.find((c) => c.email?.toLowerCase() === email.toLowerCase())
    if (!candidate) throw new ApiError(404, "NOT_APPLIED", "You have not applied to this interview.")
    return { drive, round, candidate }
}

// Candidate-scoped - called once per detected proctoring event (tab
// switch, fullscreen exit, etc) while the candidate is in the interview
// room. Best-effort snapshot proof is stored inline on the roster entry;
// `malpracticeFlags` stays as the quick count HR already reads elsewhere.
export const recordCandidateViolation = async (tenantId, email, driveId, roundNumber, reason, snapshot, screenSnapshot) => {
    const { drive, candidate } = await findOwnRosterEntry(tenantId, email, driveId, roundNumber)
    candidate.violations.push({ reason, snapshot: snapshot || null, screenSnapshot: screenSnapshot || null })
    candidate.malpracticeFlags = (candidate.malpracticeFlags || 0) + 1
    await drive.save()
    return { malpracticeFlags: candidate.malpracticeFlags, violationCount: candidate.violations.length }
}

// Candidate-scoped - marks the candidate's attempt on this round as done
// (whether they finished normally or were auto-terminated for too many
// proctoring violations), so it stops showing as startable in their room
// and HR sees it move out of "in progress".
export const completeCandidateInterview = async (tenantId, email, driveId, roundNumber) => {
    const { drive, candidate } = await findOwnRosterEntry(tenantId, email, driveId, roundNumber)
    if (candidate.status === "INVITED") candidate.status = "COMPLETED"
    candidate.attemptedDate = new Date()
    await drive.save()
    return { status: candidate.status }
}

// Candidate-scoped - bridges into the standalone AI-interview agent
// (workmate-iq-agent) right before the candidate joins the LiveKit room.
// Lazily creates (and caches) the agent-side role/candidate/interview so a
// candidate revisiting their room resumes the SAME interview instead of
// spawning a new one each time. Returns what the frontend needs to join
// the LiveKit room directly with the livekit-client SDK.
const agentRoleNameFor = (drive) => {
    // The agent detects role type (backend/frontend/blue_collar/...) by
    // keyword-matching free text (roles.py's ROLE_TYPE_KEYWORDS) - an
    // enum code like "BLUE_COLLAR" or "SOFTWARE_ENGINEERING" won't match
    // any of those phrases, so the drive's actual job title (e.g.
    // "Warehouse Loader", "Backend Engineer") has to go first, with the
    // category only as a fallback for a title that's just a company
    // codename or similarly unhelpful.
    // If HR explicitly picked "Blue Collar" as the category but the
    // free-text title itself doesn't happen to contain a matching
    // keyword (e.g. title is just "September Hiring Drive"), append a
    // guaranteed-matching phrase so the deliberate category choice
    // isn't silently lost to a "general" fallback.
    return drive.roleCategory === "BLUE_COLLAR" && !/field worker|warehouse|driver|electrician|plumber|welder|mechanic|labourer|laborer/i.test(drive.title || "")
        ? `${drive.title || "Field Worker"} (field worker)`
        : drive.title || drive.roleCategory
}

// True for the 404 workmate-iq-agent returns when a cached role/candidate/interview id
// references a row that no longer exists on its side (e.g. its database was reset or the
// candidate/drive was created against a different agent environment) - as opposed to a 404
// from some other cause, which should surface normally rather than trigger a silent recreate.
const isAgentIdNotFoundError = (err) => err?.status === 404

export const startAgentInterview = async (tenantId, email, driveId, roundNumber) => {
    const { drive, candidate } = await findOwnRosterEntry(tenantId, email, driveId, roundNumber)

    if (!drive.agentRoleId) {
        const role = await agentServiceClient.createRole(agentRoleNameFor(drive))
        drive.agentRoleId = role.id
        await drive.save()
    }

    if (!candidate.agentCandidateId) {
        const agentCandidate = await agentServiceClient.createCandidate(candidate.name, candidate.email)
        candidate.agentCandidateId = agentCandidate.id
        await drive.save()

        if (candidate.resumeFilename) {
            try {
                const buffer = await getObjectBuffer(RESUMES_BUCKET, candidate.resumeFilename)
                await agentServiceClient.uploadResume(candidate.agentCandidateId, buffer, candidate.resumeOriginalName).catch((err) =>
                    console.error(`[client-service] agent resume upload failed for ${candidate.email}:`, err.message)
                )
            } catch (err) {
                console.error(`[client-service] resume fetch from S3 failed for ${candidate.email}:`, err.message)
            }
        }
    }

    let plan = null
    if (candidate.agentInterviewId) {
        // Resuming a room the candidate already started (e.g. they reloaded the page) - the
        // interview already exists, so fetch its plan rather than trying to create a duplicate.
        // A 404 here means the cached interview id is stale (agent-side data was reset) -
        // fall through to the creation path below instead of silently sending a null plan.
        try {
            plan = await agentServiceClient.getInterview(candidate.agentInterviewId).then((i) => i.plan)
        } catch (err) {
            if (!isAgentIdNotFoundError(err)) throw err
            console.warn(`[client-service] cached agentInterviewId ${candidate.agentInterviewId} no longer exists on the agent - recreating for ${candidate.email}`)
            candidate.agentInterviewId = null
        }
    }

    if (!candidate.agentInterviewId) {
        let interview
        try {
            interview = await agentServiceClient.createInterview(candidate.agentCandidateId, drive.agentRoleId)
        } catch (err) {
            if (!isAgentIdNotFoundError(err)) throw err
            // The cached role and/or candidate id no longer exists on the agent side (its
            // database was reset independently of this one) - recreate both fresh rather than
            // leaving the candidate stuck on a permanently-broken cached reference, then retry
            // once. Not caching which of the two was actually missing since the agent's error
            // doesn't distinguish - recreating both is cheap and idempotent either way.
            console.warn(`[client-service] cached agentRoleId/agentCandidateId stale for drive ${drive._id} / ${candidate.email} - recreating`)
            const role = await agentServiceClient.createRole(agentRoleNameFor(drive))
            drive.agentRoleId = role.id
            const agentCandidate = await agentServiceClient.createCandidate(candidate.name, candidate.email)
            candidate.agentCandidateId = agentCandidate.id
            await drive.save()
            interview = await agentServiceClient.createInterview(candidate.agentCandidateId, drive.agentRoleId)
        }
        candidate.agentInterviewId = interview.id
        plan = interview.plan
        await drive.save()
        if (candidate.preferredLanguage && candidate.preferredLanguage !== "en") {
            await agentServiceClient.setLanguage(candidate.agentInterviewId, candidate.preferredLanguage).catch((err) =>
                console.error(`[client-service] agent language set failed for ${candidate.email}:`, err.message)
            )
        }
    }

    const session = await agentServiceClient.getCandidateToken(candidate.agentInterviewId)
    const questions = (plan?.questions || []).filter((q) => q.question_text)
    return { url: session.url, token: session.token, roomName: session.room_name, interviewId: candidate.agentInterviewId, questions }
}

// Candidate-scoped - called when the candidate ends their session (normal
// finish or proctoring auto-termination). Best-effort: if the agent
// service is unreachable, the interview still gets marked COMPLETED via
// completeCandidateInterview above, it just won't have an AI score/report.
export const completeAgentInterview = async (tenantId, email, driveId, roundNumber) => {
    const { drive, candidate } = await findOwnRosterEntry(tenantId, email, driveId, roundNumber)
    if (!candidate.agentInterviewId) return null

    await agentServiceClient.completeInterview(candidate.agentInterviewId)
    const report = await agentServiceClient.getReport(candidate.agentInterviewId)
    candidate.agentReport = report
    candidate.aiScore = Math.round(report.final_score || 0)
    await drive.save()
    return report
}

// Candidate-scoped - stores the candidate's own camera/mic recording of
// the session, captured client-side and uploaded once the interview ends.
// Best-effort by design (called from the same finish flow as
// completeCandidateInterview): a failed/skipped upload should never block
// the candidate from finishing their attempt.
export const saveCandidateRecording = async (tenantId, email, driveId, roundNumber, recordingFile) => {
    const { drive, candidate } = await findOwnRosterEntry(tenantId, email, driveId, roundNumber)
    if (!recordingFile) throw new ApiError(400, "RECORDING_REQUIRED", "A recording file is required.")

    // Recordings go straight to S3/MinIO (plan.md #11), not local disk -
    // recordingFilename stores the S3 object key.
    const ext = recordingFile.mimetype.includes("mp4") ? "mp4" : "webm"
    const recordingKey = `${tenantId}/${candidate.id}/${Date.now()}.${ext}`
    await uploadBuffer(RECORDINGS_BUCKET, recordingKey, recordingFile.buffer, recordingFile.mimetype)
    candidate.recordingFilename = recordingKey
    await drive.save()

    // Durable async job (plan.md #7) - the recording-processing worker picks
    // this up to transcode/derive metadata later; a failed enqueue must
    // never fail the candidate's upload, which already succeeded above.
    await enqueueRecordingProcessing({
        driveId: String(drive._id), roundNumber, candidateId: candidate.id,
        bucket: RECORDINGS_BUCKET, key: recordingKey,
    })

    return { recordingFilename: candidate.recordingFilename }
}

// Tenant-scoped (authenticated HR only) - a candidate's resume filename is
// looked up from the drive's own roster rather than trusted from the URL,
// so a recruiter can never fetch a resume that isn't part of their tenant's
// drive/round/candidate triple.
export const streamCandidateResume = async (tenantId, driveId, roundNumber, candidateId, res) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const round = drive.rounds?.find((r) => r.roundNumber === Number(roundNumber))
    if (!round) throw new ApiError(404, "ROUND_NOT_FOUND", "Round not found.")
    const candidate = round.candidates?.id(candidateId) || round.candidates?.find((c) => String(c._id) === candidateId || c.id === candidateId)
    if (!candidate || !candidate.resumeFilename) throw new ApiError(404, "RESUME_NOT_FOUND", "No resume on file for this candidate.")

    let buffer
    try {
        buffer = await getObjectBuffer(RESUMES_BUCKET, candidate.resumeFilename)
    } catch {
        throw new ApiError(404, "RESUME_NOT_FOUND", "This resume file is no longer available.")
    }
    res.setHeader("Content-Disposition", `attachment; filename="${candidate.resumeOriginalName || candidate.resumeFilename}"`)
    res.send(buffer)
}

// Tenant-scoped (authenticated HR only) - same ownership check as the
// resume download above. Uses res.sendFile (not res.download) so the
// browser's <video> element can play it inline with seek/scrub support
// rather than triggering a file download.
export const streamCandidateRecording = async (tenantId, driveId, roundNumber, candidateId, res) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const round = drive.rounds?.find((r) => r.roundNumber === Number(roundNumber))
    if (!round) throw new ApiError(404, "ROUND_NOT_FOUND", "Round not found.")
    const candidate = round.candidates?.id(candidateId) || round.candidates?.find((c) => String(c._id) === candidateId || c.id === candidateId)
    if (!candidate || !candidate.recordingFilename) throw new ApiError(404, "RECORDING_NOT_FOUND", "No recording on file for this candidate.")

    let object
    try {
        object = await getObjectStream(RECORDINGS_BUCKET, candidate.recordingFilename)
    } catch {
        throw new ApiError(404, "RECORDING_NOT_FOUND", "This recording file is no longer available.")
    }
    res.setHeader("Content-Type", object.contentType || "video/webm")
    if (object.contentLength) res.setHeader("Content-Length", object.contentLength)
    object.stream.pipe(res)
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
    const repaired = await repairRoundStatuses(drive)

    // Best-effort invite-status enrichment (invite sent/opened, per
    // candidate) - communication-service being unreachable should never
    // break the drive detail page, it just means that column stays blank.
    const plain = repaired.toObject ? repaired.toObject() : repaired
    try {
        const statuses = await communicationServiceClient.getInviteStatusForDrive(String(drive._id), "CANDIDATE_INVITE")
        const byCandidateId = new Map((statuses || []).map((s) => [s.candidateId, s]))
        for (const round of plain.rounds || []) {
            for (const candidate of round.candidates || []) {
                const inviteStatus = byCandidateId.get(candidate.id)
                if (inviteStatus) {
                    candidate.inviteStatus = inviteStatus.status
                    candidate.inviteSentAt = inviteStatus.sentAt
                    candidate.inviteOpenedAt = inviteStatus.openedAt
                }
            }
        }
    } catch (err) {
        console.error("[client-service] invite-status lookup failed:", err.message)
    }
    return plain
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

    const idClauses = [{ templateId }]
    if (/^[0-9a-fA-F]{24}$/.test(templateId)) idClauses.push({ _id: templateId })
    const template = await NotificationTemplate.findOne({ tenantId, $or: idClauses })
    if (!template) throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Communication template not found.")
    if (template.type !== "EMAIL" && template.type !== "WHATSAPP") {
        throw new ApiError(400, "TEMPLATE_NOT_SENDABLE", "Call templates are scripts for manual use and cannot be auto-sent.")
    }

    const org = await clientRepo.findById(tenantId).catch(() => null)
    const interviewLink = drive.publicLink ? buildFrontendUrl(`/apply/${drive.publicLink}`) : ""
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
