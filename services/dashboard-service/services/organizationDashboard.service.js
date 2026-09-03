import { RANGE_TO_DAYS, fillDailySeries } from "../utils/dateSeries.js"

// Per-organization dashboard (GET /organizations/me/dashboard/*), scoped by
// tenantId from the caller's own JWT - never a client-supplied id.
//
// backend.md's Drive/Candidate/Interview services (the actual sources for
// activeDrives/candidatesThisMonth/interviewsDone/averageScore/pipeline/
// scoreDistribution) don't exist yet - see the "Organization + Dashboard
// services only" scoping decision. Rather than fabricate numbers or block
// this endpoint entirely, every metric below is a real, honestly-zero
// value: a brand-new organization genuinely has 0 drives and 0 candidates
// today. Once drive-service/candidate-service/interview-service exist,
// swap the hardcoded zeros/empties here for real aggregation calls to
// those services (same shape the frontend already expects - see
// client/src/api/organization/dashboardViewModel.js) - no frontend change
// required.

// eslint-disable-next-line no-unused-vars
export const getSummary = async (tenantId) => ({
    activeDrives: { value: 0, trend: null },
    candidatesThisMonth: { value: 0, trend: null },
    interviewsDone: { value: 0, trend: null },
    averageScore: { value: 0, trend: null },
})

// eslint-disable-next-line no-unused-vars
export const getTrends = async (tenantId, range) => {
    const days = RANGE_TO_DAYS[range] || 30
    return {
        pipeline: [],
        interviewTrend: fillDailySeries(days, []),
        scoreDistribution: [],
    }
}

// eslint-disable-next-line no-unused-vars
export const getAttention = async (tenantId) => []

// eslint-disable-next-line no-unused-vars
export const getActivity = async (tenantId, { cursor, limit } = {}) => ({ items: [], hasNext: false, nextCursor: null })
