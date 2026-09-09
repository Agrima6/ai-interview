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
