import * as driveService from "../services/interviewDrive.service.js"
import { ok, ApiError } from "../utils/response.js"

export const createDrive = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const drive = await driveService.createDrive(tenantId, req.body, { requestId: req.requestId, correlationId: req.correlationId })
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const getPublicDriveBySlug = async (req, res, next) => {
    try { ok(res, await driveService.getPublicDriveBySlug(req.params.link)) } catch (error) { next(error) }
}

export const getPublicApplicationPrefill = async (req, res, next) => {
    try {
        const token = req.query.token || req.query.prefillToken
        ok(res, await driveService.getPublicApplicationPrefill(req.params.link, req.query.email, token))
    } catch (error) {
        next(error)
    }
}

export const applyToPublicDrive = async (req, res, next) => {
    try {
        const ctx = { requestId: req.requestId, correlationId: req.correlationId }
        const result = await driveService.applyToPublicDrive(req.params.link, req.body, req.file, ctx)
        ok(res, result)
    } catch (error) {
        next(error)
    }
}

export const getMyInterviews = async (req, res, next) => {
    try {
        if (!req.user?.roles?.includes("CANDIDATE")) throw new ApiError(403, "FORBIDDEN", "This endpoint is only for candidate accounts.")
        const interviews = await driveService.getMyInterviews(req.user.tenantId, req.user.email)
        ok(res, interviews)
    } catch (error) {
        next(error)
    }
}

const requireCandidate = (req) => {
    if (!req.user?.roles?.includes("CANDIDATE")) throw new ApiError(403, "FORBIDDEN", "This endpoint is only for candidate accounts.")
}

export const recordCandidateViolation = async (req, res, next) => {
    try {
        requireCandidate(req)
        const { id, roundNumber } = req.params
        const { reason, snapshot, screenSnapshot } = req.body
        if (!reason) throw new ApiError(400, "REASON_REQUIRED", "A violation reason is required.")
        const result = await driveService.recordCandidateViolation(req.user.tenantId, req.user.email, id, roundNumber, reason, snapshot, screenSnapshot)
        ok(res, result)
    } catch (error) {
        next(error)
    }
}

export const completeCandidateApplication = async (req, res, next) => {
    try {
        requireCandidate(req)
        const { id, roundNumber } = req.params
        const result = await driveService.completeCandidateApplication(
            req.user.tenantId,
            req.user.email,
            id,
            roundNumber,
            req.body,
            req.file,
            req.context
        )
        ok(res, result)
    } catch (error) {
        next(error)
    }
}

export const completeCandidateInterview = async (req, res, next) => {
    try {
        requireCandidate(req)
        const { id, roundNumber } = req.params
        const result = await driveService.completeCandidateInterview(req.user.tenantId, req.user.email, id, roundNumber)
        ok(res, result)
    } catch (error) {
        next(error)
    }
}

export const rescheduleCandidateSlot = async (req, res, next) => {
    try {
        requireCandidate(req)
        const { id, roundNumber } = req.params
        const result = await driveService.rescheduleCandidateSlot(req.user.tenantId, req.user.email, id, roundNumber, req.body?.newSlot)
        ok(res, result)
    } catch (error) {
        next(error)
    }
}

export const startAgentInterview = async (req, res, next) => {
    try {
        requireCandidate(req)
        const { id, roundNumber } = req.params
        const session = await driveService.startAgentInterview(req.user.tenantId, req.user.email, id, roundNumber)
        ok(res, session)
    } catch (error) {
        next(error)
    }
}

export const completeAgentInterview = async (req, res, next) => {
    try {
        requireCandidate(req)
        const { id, roundNumber } = req.params
        const report = await driveService.completeAgentInterview(req.user.tenantId, req.user.email, id, roundNumber)
        ok(res, report)
    } catch (error) {
        next(error)
    }
}

export const saveCandidateRecording = async (req, res, next) => {
    try {
        requireCandidate(req)
        const { id, roundNumber } = req.params
        const result = await driveService.saveCandidateRecording(req.user.tenantId, req.user.email, id, roundNumber, req.file)
        ok(res, result)
    } catch (error) {
        next(error)
    }
}

export const streamCandidateRecording = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const { id, roundNumber, candidateId } = req.params
        await driveService.streamCandidateRecording(tenantId, id, roundNumber, candidateId, res, req)
    } catch (error) {
        next(error)
    }
}

export const downloadCandidateResume = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const { id, roundNumber, candidateId } = req.params
        await driveService.streamCandidateResume(tenantId, id, roundNumber, candidateId, res)
    } catch (error) {
        next(error)
    }
}

export const listDrives = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const { items, total, page, pageSize } = await driveService.listDrives(tenantId, req.query)
        ok(res, items, { total, page, pageSize })
    } catch (error) {
        next(error)
    }
}

export const exportDrivesCsv = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const csv = await driveService.exportDrivesCsv(tenantId, req.query)
        res.setHeader("Content-Type", "text/csv; charset=utf-8")
        res.setHeader("Content-Disposition", `attachment; filename="drives-export-${new Date().toISOString().slice(0, 10)}.csv"`)
        res.send(csv)
    } catch (error) {
        next(error)
    }
}

export const getDriveById = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const drive = await driveService.getDriveById(tenantId, req.params.id)
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const addCandidatesToDrive = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const drive = await driveService.addCandidatesToDrive(tenantId, req.params.id, req.body.candidates, { requestId: req.requestId, correlationId: req.correlationId }, req.body.roundNumber || 1)
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const addRoundToDrive = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const drive = await driveService.addRoundToDrive(tenantId, req.params.id, req.body, { requestId: req.requestId, correlationId: req.correlationId })
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const updateDriveStatus = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const drive = await driveService.updateDriveStatus(tenantId, req.params.id, req.body.status)
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const updateRoundStatus = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const drive = await driveService.updateRoundStatus(tenantId, req.params.id, req.params.roundNumber, req.body.status, { requestId: req.requestId, correlationId: req.correlationId })
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const updateRound = async (req, res, next) => {
    try {
        const drive = await driveService.updateRound(req.user?.tenantId, req.params.id, req.params.roundNumber, req.body)
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const updateCandidateStatus = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const { id: driveId, roundNumber, candidateId } = req.params
        const drive = await driveService.updateCandidateStatus(tenantId, driveId, roundNumber, candidateId, req.body.status)
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const updateCandidate = async (req, res, next) => {
    try {
        const drive = await driveService.updateCandidate(req.user?.tenantId, req.params.id, req.params.roundNumber, req.params.candidateId, req.body)
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const removeCandidate = async (req, res, next) => {
    try {
        const drive = await driveService.removeCandidate(req.user?.tenantId, req.params.id, req.params.roundNumber, req.params.candidateId)
        ok(res, drive)
    } catch (error) {
        next(error)
    }
}

export const communicateWithCandidates = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const { id: driveId, roundNumber } = req.params
        const result = await driveService.communicateWithCandidates(
            tenantId, driveId, roundNumber, req.body,
            { requestId: req.requestId, correlationId: req.correlationId }
        )
        ok(res, result)
    } catch (error) {
        next(error)
    }
}

// Internal (service-to-service) - dashboard-service's per-organization
// dashboard and Reports page both need this same aggregate; tenantId comes
// from the query string here since there's no end-user JWT on this call.
export const getTenantReportInternal = async (req, res, next) => {
    try {
        const report = await driveService.getTenantReport(req.query.tenantId, { days: req.query.days })
        ok(res, report)
    } catch (error) {
        next(error)
    }
}

export const exportCandidatesCsv = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const csv = await driveService.exportCandidatesCsv(tenantId, req.query)
        res.setHeader("Content-Type", "text/csv; charset=utf-8")
        res.setHeader("Content-Disposition", `attachment; filename="candidates-export-${new Date().toISOString().slice(0, 10)}.csv"`)
        res.send(csv)
    } catch (error) {
        next(error)
    }
}

export const listAllCandidates = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const result = await driveService.listAllCandidates(tenantId, req.query)
        ok(res, result.items, { total: result.total, page: result.page, pageSize: result.pageSize })
    } catch (error) {
        next(error)
    }
}

export const streamCandidateViolationSnapshot = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const { id, roundNumber, candidateId, violationIndex, type } = req.params
        await driveService.streamCandidateViolationSnapshot(tenantId, id, roundNumber, candidateId, violationIndex, type, res)
    } catch (error) {
        next(error)
    }
}
