import { InterviewDrive } from "../models/interviewDrive.model.js"
import { ApiError } from "../utils/response.js"
import { requireValidObjectId } from "../utils/validateId.js"
import { findOwnRosterEntry, sanitizePathSegment } from "./interviewDrive.service.js"
import * as s3 from "../config/s3Client.js"
import { enqueueRecordingProcessing } from "../config/sqsClient.js"

// Chunked in-session interview recording.
//
// The browser cuts the recording into ~1 s MediaRecorder slices and uploads them in batches WHILE the interview
// runs, each tagged with a stable recordingId and a sequence number, so:
//   - a retry of the same chunk is harmless (idempotent by recordingId + index),
//   - a closed tab or lost connection loses the last few seconds, not the whole session,
//   - "finalize" assembles what is stored, then READS THE RESULT BACK and compares sizes before anything is
//     called COMPLETED. A recording is never reported complete on the strength of "the upload was accepted".

export const MAX_CHUNK_BYTES = 8 * 1024 * 1024
export const MAX_PARTS = 20000
export const MAX_TOTAL_BYTES = 600 * 1024 * 1024
export const MAX_SEGMENTS = 10
export const STALE_AFTER_MS = 3 * 60 * 1000          // no chunk for this long and no finalize => the capture was cut off

const ID_PATTERN = /^[\w-]{8,64}$/
const baseMime = (value) => String(value || "").split(";")[0].trim().toLowerCase()
const ALLOWED_MIME = new Set(["video/webm", "audio/webm", "video/mp4", "audio/mp4", "video/x-matroska"])
export const isAllowedMime = (value) => ALLOWED_MIME.has(baseMime(value))
export const extensionFor = (mime) => (baseMime(mime).endsWith("mp4") ? "mp4" : "webm")

const partKey = (base, recordingId, index) => `${base}/${recordingId}/part-${String(index).padStart(6, "0")}`

/**
 * Pure: given the stored parts (and, when known, how many the browser says it produced), which are missing and
 * can the result be played at all? Part 0 carries the container header; without it nothing is playable.
 */
export const planAssembly = (parts, expectedParts) => {
    const have = new Set(parts.map((p) => p.index))
    const highest = parts.length ? Math.max(...have) : -1
    const expected = Number.isInteger(expectedParts) && expectedParts >= 0 ? Math.max(expectedParts, highest + 1) : highest + 1
    const missing = []
    for (let i = 0; i < expected; i += 1) if (!have.has(i)) missing.push(i)
    return { ordered: [...parts].sort((a, b) => a.index - b.index), expected, missing, playable: have.has(0) }
}

/**
 * Pure-ish (storage injected): concatenate the parts in order, store the result and read it back.
 * Returns { status, key, bytes, missing, reason }. Never throws for a missing part - that is reported.
 */
export const assembleRecording = async ({ storage, bucket, baseKey, recordingId, parts, expectedParts, mimeType, endedCleanly }) => {
    const plan = planAssembly(parts, expectedParts)
    if (!plan.playable) {
        return { status: "FAILED", missing: plan.missing, bytes: 0, reason: parts.length ? "The first part of the recording never arrived, so it can't be played." : "No recording data was received." }
    }
    const buffers = []
    const lost = []
    for (const part of plan.ordered) {
        try {
            buffers.push(await storage.getObjectBuffer(bucket, part.key))
        } catch {
            lost.push(part.index)
        }
    }
    if (lost.includes(0)) return { status: "FAILED", missing: [...new Set([...plan.missing, ...lost])], bytes: 0, reason: "The first stored part could not be read back." }
    const joined = Buffer.concat(buffers)
    if (joined.length > MAX_TOTAL_BYTES) return { status: "FAILED", missing: plan.missing, bytes: 0, reason: "The recording is larger than the allowed size." }

    const key = `${baseKey}/${recordingId}.${extensionFor(mimeType)}`
    await storage.uploadBuffer(bucket, key, joined, baseMime(mimeType) || "video/webm")
    // Read it back: only a stored object of exactly the expected size counts.
    const stored = await storage.objectSize(bucket, key)
    if (stored !== joined.length) {
        return { status: "FAILED", missing: plan.missing, bytes: 0, reason: "The assembled recording could not be verified in storage." }
    }
    const missing = [...new Set([...plan.missing, ...lost])].sort((a, b) => a - b)
    const complete = missing.length === 0 && endedCleanly
    return {
        status: complete ? "COMPLETED" : "INCOMPLETE",
        key, bytes: joined.length, missing,
        reason: complete ? undefined : missing.length ? `${missing.length} part(s) never arrived.` : "The capture stopped before the interview ended.",
    }
}

const realStorage = { uploadBuffer: s3.uploadBuffer, getObjectBuffer: s3.getObjectBuffer, objectSize: s3.objectSize, deleteObject: s3.deleteObject }

const locate = async (tenantId, email, driveId, roundNumber) => {
    const { drive, candidate } = await findOwnRosterEntry(tenantId, email, driveId, roundNumber)
    const base = `${sanitizePathSegment(tenantId)}/${sanitizePathSegment(drive.title || drive.roleCategory || "role")}/${sanitizePathSegment(candidate.agentInterviewId || candidate.id)}/recording`
    return { drive, candidate, base }
}

const filters = (roundNumber, candidateId, recordingId) => [
    { "r.roundNumber": Number(roundNumber) },
    { "c.id": candidateId },
    ...(recordingId ? [{ "rec.recordingId": recordingId }] : []),
]
const REC = "rounds.$[r].candidates.$[c].recordings"

/** Candidate: store one chunk. Idempotent: the same (recordingId, index) twice is one stored part. */
export const saveRecordingChunk = async (tenantId, email, driveId, roundNumber, { recordingId, index, mimeType }, file, storage = realStorage) => {
    if (!ID_PATTERN.test(String(recordingId || ""))) throw new ApiError(400, "INVALID_RECORDING_ID", "A valid recording id is required.")
    const idx = Number(index)
    if (!Number.isInteger(idx) || idx < 0 || idx >= MAX_PARTS) throw new ApiError(400, "INVALID_CHUNK_INDEX", "Invalid chunk number.")
    if (!file?.buffer?.length) throw new ApiError(400, "EMPTY_CHUNK", "The chunk was empty.")
    if (file.buffer.length > MAX_CHUNK_BYTES) throw new ApiError(413, "CHUNK_TOO_LARGE", "The chunk is too large.")
    if (!isAllowedMime(mimeType || file.mimetype)) throw new ApiError(400, "UNSUPPORTED_MEDIA_TYPE", "Only WebM or MP4 recordings are accepted.")

    const { drive, candidate, base } = await locate(tenantId, email, driveId, roundNumber)
    const segments = candidate.recordings || []
    let segment = segments.find((s) => s.recordingId === recordingId)
    if (!segment) {
        if (segments.length >= MAX_SEGMENTS) throw new ApiError(409, "TOO_MANY_RECORDINGS", "Too many recording sessions for this interview.")
        // Guarded push: two first chunks racing cannot create the segment twice.
        await InterviewDrive.updateOne({ _id: drive._id, tenantId }, {
            $push: { [REC]: { recordingId, status: "RECORDING", mimeType: baseMime(mimeType || file.mimetype), startedAt: new Date(), lastChunkAt: new Date(), parts: [], partCount: 0, bytes: 0 } },
        }, { arrayFilters: [{ "r.roundNumber": Number(roundNumber) }, { "c.id": candidate.id, "c.recordings.recordingId": { $ne: recordingId } }], timestamps: false })
    } else if (segment.status !== "RECORDING") {
        throw new ApiError(409, "RECORDING_CLOSED", "This recording has already been finalized.")
    }

    const key = partKey(base, recordingId, idx)
    await storage.uploadBuffer(RECORDINGS_BUCKET(), key, file.buffer, baseMime(mimeType || file.mimetype))

    // Record the part exactly once; a repeat only refreshes the size.
    const added = await InterviewDrive.updateOne({ _id: drive._id, tenantId }, {
        $push: { [`${REC}.$[rec].parts`]: { index: idx, size: file.buffer.length, key } },
        $inc: { [`${REC}.$[rec].partCount`]: 1, [`${REC}.$[rec].bytes`]: file.buffer.length },
        $set: { [`${REC}.$[rec].lastChunkAt`]: new Date() },
    }, { arrayFilters: [{ "r.roundNumber": Number(roundNumber) }, { "c.id": candidate.id }, { "rec.recordingId": recordingId, "rec.status": "RECORDING", "rec.parts.index": { $ne: idx } }], timestamps: false })
    if (added.modifiedCount === 0) {
        await InterviewDrive.updateOne({ _id: drive._id, tenantId }, { $set: { [`${REC}.$[rec].lastChunkAt`]: new Date() } },
            { arrayFilters: [{ "r.roundNumber": Number(roundNumber) }, { "c.id": candidate.id }, { "rec.recordingId": recordingId, "rec.status": "RECORDING" }], timestamps: false })
        return { recordingId, index: idx, duplicate: true }
    }
    return { recordingId, index: idx, duplicate: false }
}

const RECORDINGS_BUCKET = () => s3.RECORDINGS_BUCKET

/** Assemble one segment (claimed atomically so two finalizers cannot both run) and record the verified outcome. */
const finalizeSegment = async ({ drive, tenantId, roundNumber, candidate, segment, base, expectedParts, endedCleanly, storage }) => {
    const claim = await InterviewDrive.updateOne({ _id: drive._id, tenantId }, { $set: { [`${REC}.$[rec].status`]: "FINALIZING" } },
        { arrayFilters: [{ "r.roundNumber": Number(roundNumber) }, { "c.id": candidate.id }, { "rec.recordingId": segment.recordingId, "rec.status": { $in: ["RECORDING", "FAILED"] } }], timestamps: false })
    if (claim.modifiedCount === 0) return null            // someone else is finalizing it, or it is already final

    let outcome
    try {
        outcome = await assembleRecording({
            storage, bucket: RECORDINGS_BUCKET(), baseKey: base, recordingId: segment.recordingId,
            parts: (segment.parts || []).map((p) => ({ index: p.index, size: p.size, key: p.key })),
            expectedParts: Number.isInteger(expectedParts) ? expectedParts : segment.expectedParts,
            mimeType: segment.mimeType, endedCleanly,
        })
    } catch (err) {
        console.error(`[client-service] recording assembly failed for ${segment.recordingId}:`, err.code || err.message)
        outcome = { status: "FAILED", missing: [], bytes: 0, reason: "Storage was unavailable while assembling the recording." }
    }

    const set = {
        [`${REC}.$[rec].status`]: outcome.status,
        [`${REC}.$[rec].finalizedAt`]: new Date(),
        [`${REC}.$[rec].missing`]: outcome.missing || [],
        [`${REC}.$[rec].bytes`]: outcome.bytes || 0,
        ...(Number.isInteger(expectedParts) ? { [`${REC}.$[rec].expectedParts`]: expectedParts } : {}),
        ...(outcome.reason ? { [`${REC}.$[rec].reason`]: outcome.reason } : {}),
        ...(outcome.key ? { [`${REC}.$[rec].key`]: outcome.key } : {}),
    }
    // The candidate's single "recording on file" pointer (what HR playback and listings use) is the first stored segment.
    const firstStored = !(candidate.recordings || []).some((s) => s.key && s.recordingId !== segment.recordingId) && !candidate.recordingFilename
    if (outcome.key && firstStored) set["rounds.$[r].candidates.$[c].recordingFilename"] = outcome.key
    await InterviewDrive.updateOne({ _id: drive._id, tenantId }, { $set: set },
        { arrayFilters: [{ "r.roundNumber": Number(roundNumber) }, { "c.id": candidate.id }, { "rec.recordingId": segment.recordingId }], timestamps: false })

    if (outcome.key) {
        // The assembled file is verified; the loose parts have done their job.
        for (const part of segment.parts || []) await storage.deleteObject(RECORDINGS_BUCKET(), part.key).catch(() => {})
        await enqueueRecordingProcessing({ driveId: String(drive._id), roundNumber, candidateId: candidate.id, bucket: RECORDINGS_BUCKET(), key: outcome.key })
    }
    return outcome
}

/** Candidate: the browser says the capture ended (cleanly or not). Safe to repeat. */
export const finalizeRecording = async (tenantId, email, driveId, roundNumber, { recordingId, totalParts, reason }, storage = realStorage) => {
    if (!ID_PATTERN.test(String(recordingId || ""))) throw new ApiError(400, "INVALID_RECORDING_ID", "A valid recording id is required.")
    const { drive, candidate, base } = await locate(tenantId, email, driveId, roundNumber)
    const segment = (candidate.recordings || []).find((s) => s.recordingId === recordingId)
    if (!segment) throw new ApiError(404, "RECORDING_NOT_FOUND", "No such recording for this interview.")
    const expected = Number.isInteger(Number(totalParts)) && totalParts !== null && totalParts !== "" ? Number(totalParts) : undefined
    await finalizeSegment({ drive, tenantId, roundNumber, candidate, segment, base, expectedParts: expected, endedCleanly: reason !== "INTERRUPTED", storage })
    const fresh = await locate(tenantId, email, driveId, roundNumber)
    return summarizeSegment((fresh.candidate.recordings || []).find((s) => s.recordingId === recordingId))
}

export const summarizeSegment = (s) => s && ({
    recordingId: s.recordingId, status: s.status, bytes: s.bytes || 0, startedAt: s.startedAt, lastChunkAt: s.lastChunkAt || null,
    finalizedAt: s.finalizedAt || null, partsReceived: s.partCount || (s.parts || []).length, expectedParts: s.expectedParts ?? null,
    missingParts: (s.missing || []).length, reason: s.reason || null, playable: Boolean(s.key),
})

/** What is stored for a candidate, as a manifest: overall state + each segment. Reconciles abandoned captures first. */
export const recordingManifest = async (tenantId, driveId, roundNumber, candidateId, storage = realStorage) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    requireValidObjectId(driveId, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    const round = drive.rounds?.find((r) => r.roundNumber === Number(roundNumber))
    const candidate = round?.candidates?.find((c) => c.id === candidateId)
    if (!candidate) throw new ApiError(404, "CANDIDATE_NOT_FOUND", "Candidate not found.")
    const base = `${sanitizePathSegment(tenantId)}/${sanitizePathSegment(drive.title || drive.roleCategory || "role")}/${sanitizePathSegment(candidate.agentInterviewId || candidate.id)}/recording`

    // A capture that stopped sending and never finalized (closed tab, dead battery, lost network) is closed out
    // here from whatever chunks arrived - as INCOMPLETE, never as complete.
    for (const segment of candidate.recordings || []) {
        const idleFor = Date.now() - new Date(segment.lastChunkAt || segment.startedAt).getTime()
        if (segment.status === "RECORDING" && idleFor > STALE_AFTER_MS) {
            await finalizeSegment({ drive, tenantId, roundNumber, candidate, segment, base, expectedParts: undefined, endedCleanly: false, storage })
        }
    }
    const fresh = await InterviewDrive.findOne({ _id: driveId, tenantId })
    const c = fresh.rounds.find((r) => r.roundNumber === Number(roundNumber)).candidates.find((x) => x.id === candidateId)
    const segments = (c.recordings || []).map(summarizeSegment)

    // A recording uploaded the old way (one file at the end) has no segments: confirm the file is really there.
    if (segments.length === 0 && c.recordingFilename) {
        const size = await storage.objectSize(RECORDINGS_BUCKET(), c.recordingFilename)
        if (size) segments.push({ recordingId: "legacy", status: "COMPLETED", bytes: size, startedAt: null, lastChunkAt: null, finalizedAt: null, partsReceived: 1, expectedParts: 1, missingParts: 0, reason: null, playable: true })
    }
    const order = ["RECORDING", "FINALIZING", "INCOMPLETE", "FAILED", "COMPLETED"]
    const overall = segments.length === 0 ? "NONE"
        : segments.every((s) => s.status === "COMPLETED") ? "COMPLETED"
            : order.find((state) => segments.some((s) => s.status === state)) || "NONE"
    return { status: overall, segments }
}

export const resolveSegmentKey = (candidate, segmentId) => {
    if (!segmentId || segmentId === "legacy") return candidate.recordingFilename || null
    const segment = (candidate.recordings || []).find((s) => s.recordingId === segmentId)
    return segment?.key || null
}

