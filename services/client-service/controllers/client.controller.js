import * as clientService from "../services/client.service.js"
import { ok, okList, ApiError } from "../utils/response.js"

// Number(limit) || 25 alone lets a negative limit (still truthy) through
// unchanged, and has no upper bound - clamp into a sane range instead.
const clampLimit = (raw) => {
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 25
    return Math.min(Math.trunc(n), 100)
}

const parseDate = (raw) => {
    if (!raw) return undefined
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? undefined : d
}

const SORT_BY = new Set(["createdAt", "updatedAt", "name", "status"])

export const list = async (req, res, next) => {
    try {
        const { search, type, registrationStatus, approvalStatus, communicationStatus, onboardingStatus, cursor, limit, dateFrom, dateTo, sortBy, sortOrder, page } = req.query
        // onboardingStatus/communicationStatus aren't fields on the Client
        // model (they belong to OnboardingSession/Communication) - accepted
        // here only so an unknown filter fails loudly instead of silently,
        // rather than being wired to a column that doesn't exist.
        if (onboardingStatus || communicationStatus) {
            return next(new ApiError(400, "UNSUPPORTED_FILTER", "onboardingStatus/communicationStatus are not attributes of a client record."))
        }
        const result = await clientService.list({
            search, type, status: approvalStatus || registrationStatus,
            dateFrom: parseDate(dateFrom), dateTo: parseDate(dateTo),
            cursor, limit: clampLimit(limit),
            sortBy: SORT_BY.has(sortBy) ? sortBy : undefined,
            sortOrder: sortOrder === "asc" ? "asc" : "desc",
            page: page ? Math.max(Number(page) || 1, 1) : undefined,
        })
        okList(res, result.items, {
            cursor: result.nextCursor ?? null,
            hasNext: result.hasNext ?? false,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
        })
    } catch (error) { next(error) }
}

export const getById = async (req, res, next) => {
    try { ok(res, await clientService.getById(req.params.id)) } catch (error) { next(error) }
}

export const update = async (req, res, next) => {
    try {
        const { expectedUpdatedAt, ...body } = req.body || {}
        const updated = await clientService.updateClient(req.params.id, body, {
            expectedUpdatedAt: parseDate(expectedUpdatedAt),
            actor: { id: req.user?.sub, email: null },
        })
        ok(res, updated)
    } catch (error) { next(error) }
}

export const getAuditHistory = async (req, res, next) => {
    try { ok(res, await clientService.getAuditHistory(req.params.id)) } catch (error) { next(error) }
}

// "My organization" self-service - tenantId always comes from the caller's
// own JWT (req.user.tenantId), never from a param/body, so a client-portal
// user can only ever read/update their own organization.
export const getMyOrganization = async (req, res, next) => {
    try { ok(res, await clientService.getMyOrganization(req.user?.tenantId)) } catch (error) { next(error) }
}

export const updateMyOrganizationBranding = async (req, res, next) => {
    try { ok(res, await clientService.updateMyOrganizationBranding(req.user?.tenantId, req.body || {})) } catch (error) { next(error) }
}

export const approve = async (req, res, next) => {
    try { ok(res, await clientService.setStatus(req.params.id, "ACTIVE")) } catch (error) { next(error) }
}

export const reject = async (req, res, next) => {
    try { ok(res, await clientService.setStatus(req.params.id, "REJECTED")) } catch (error) { next(error) }
}

export const suspend = async (req, res, next) => {
    try { ok(res, await clientService.setStatus(req.params.id, "SUSPENDED")) } catch (error) { next(error) }
}

export const reactivate = async (req, res, next) => {
    try { ok(res, await clientService.setStatus(req.params.id, "ACTIVE")) } catch (error) { next(error) }
}

export const upsertInternal = async (req, res, next) => {
    try { ok(res, await clientService.upsertFromOnboarding(req.body)) } catch (error) { next(error) }
}

const CLIENT_TYPES = new Set(["ORGANIZATION", "COLLEGE"])

export const statisticsInternal = async (req, res, next) => {
    try {
        // Client.type only has ORGANIZATION/COLLEGE - candidates never
        // become Client records - so a CANDIDATE filter has a real, exact
        // answer (zero) rather than "ignore the filter and return all".
        if (req.query.type === "CANDIDATE") return ok(res, {})

        const filters = {}
        if (CLIENT_TYPES.has(req.query.type)) filters.type = req.query.type
        if (req.query.from) {
            const from = new Date(req.query.from)
            if (!Number.isNaN(from.getTime())) filters.from = from
        }
        if (req.query.to) {
            const to = new Date(req.query.to)
            if (!Number.isNaN(to.getTime())) filters.to = to
        }
        ok(res, await clientService.statistics(filters))
    } catch (error) { next(error) }
}
