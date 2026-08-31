import * as driveService from "../services/interviewDrive.service.js"
import { ok, ApiError } from "../utils/response.js"

export const createDrive = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const drive = await driveService.createDrive(tenantId, req.body)
        ok(res, drive)
    } catch (error) {
        next(error)
    }
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

export const addRoundToDrive = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const drive = await driveService.addRoundToDrive(tenantId, req.params.id, req.body)
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

export const listAllCandidates = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId
        const result = await driveService.listAllCandidates(tenantId, req.query)
        ok(res, result.items, { total: result.total, page: result.page, pageSize: result.pageSize })
    } catch (error) {
        next(error)
    }
}
