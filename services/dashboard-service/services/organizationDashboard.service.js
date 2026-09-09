import { RANGE_TO_DAYS, fillDailySeries } from "../utils/dateSeries.js"
import { clientServiceClient } from "../config/internalClients.js"

// Per-organization dashboard (GET /organizations/me/dashboard/*), scoped by
// tenantId from the caller's own JWT - never a client-supplied id.
//
// This used to return hardcoded zeros because drive/candidate data didn't
// exist yet anywhere in the system (see the old "Organization + Dashboard
// services only" scoping note). client-service now owns that data
// (InterviewDrive/CandidateRoster), so both the summary cards and the
// trend charts are real, tenant-scoped numbers pulled from its internal
// /internal/v1/drives/tenant-report aggregate - no more fabricated zeros.

export const getSummary = async (tenantId, ctx) => {
    const report = await clientServiceClient.getTenantReport(tenantId, {}, ctx)
    const s = report.summary
    return {
        activeDrives: { value: s.activeDrives, trend: null },
        candidatesThisMonth: { value: s.candidatesThisMonth, trend: null },
        interviewsDone: { value: s.interviewsDone, trend: null },
        averageScore: { value: s.averageScore, trend: null },
        totalDrives: { value: s.totalDrives, trend: null },
        totalCandidates: { value: s.totalCandidates, trend: null },
    }
}

export const getTrends = async (tenantId, range, ctx) => {
    const days = RANGE_TO_DAYS[range] || 30
    const report = await clientServiceClient.getTenantReport(tenantId, { days }, ctx)
    return {
        pipeline: report.pipeline,
        interviewTrend: fillDailySeries(days, report.interviewTrend),
        scoreDistribution: report.scoreDistribution,
        departmentBreakdown: report.departmentBreakdown,
    }
}

// Attention/activity still have no backing source (no audit-log/task
// service exists yet) - kept as honest empty results rather than invented
// entries. AttentionPanel/ActivityFeed already render a clean empty state
// for this.
// eslint-disable-next-line no-unused-vars
export const getAttention = async (tenantId) => []

// eslint-disable-next-line no-unused-vars
export const getActivity = async (tenantId, { cursor, limit } = {}) => ({ items: [], hasNext: false, nextCursor: null })
