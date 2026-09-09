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
        const drives = await driveService.listDrives(tenantId, req.query)
        ok(res, drives)
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
        const drive = await driveService.updateDriveStatus(tenantId, req.params.id, req.body.status, { requestId: req.requestId, correlationId: req.correlationId })
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

export const listAllCandidates = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const result = await driveService.listAllCandidates(tenantId, req.query)
        ok(res, result.items, { total: result.total, page: result.page, pageSize: result.pageSize })
    } catch (error) {
        next(error)
    }
}
