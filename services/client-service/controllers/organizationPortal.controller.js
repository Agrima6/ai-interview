import * as teamService from "../services/teamMember.service.js"
import * as bankService from "../services/questionBank.service.js"
import * as templateService from "../services/notificationTemplate.service.js"
import { ok } from "../utils/response.js"

// Team Members
export const listTeamMembers = async (req, res, next) => {
    try {
        const members = await teamService.listTeamMembers(req.user?.tenantId)
        ok(res, members)
    } catch (error) {
        next(error)
    }
}

export const inviteTeamMember = async (req, res, next) => {
    try {
        const member = await teamService.inviteTeamMember(req.user?.tenantId, req.body)
        ok(res, member)
    } catch (error) {
        next(error)
    }
}

export const removeTeamMember = async (req, res, next) => {
    try {
        const result = await teamService.removeTeamMember(req.user?.tenantId, req.params.id)
        ok(res, result)
    } catch (error) {
        next(error)
    }
}

// Question Banks
export const listQuestionBanks = async (req, res, next) => {
    try {
        const banks = await bankService.listQuestionBanks(req.user?.tenantId)
        ok(res, banks)
    } catch (error) {
        next(error)
    }
}

export const createQuestionBank = async (req, res, next) => {
    try {
        const bank = await bankService.createQuestionBank(req.user?.tenantId, req.body)
        ok(res, bank)
    } catch (error) {
        next(error)
    }
}

// Templates
export const listTemplates = async (req, res, next) => {
    try {
        const templates = await templateService.listTemplates(req.user?.tenantId)
        ok(res, templates)
    } catch (error) {
        next(error)
    }
}

export const updateTemplate = async (req, res, next) => {
    try {
        const updated = await templateService.updateTemplate(req.user?.tenantId, req.params.id, req.body)
        ok(res, updated)
    } catch (error) {
        next(error)
    }
}
