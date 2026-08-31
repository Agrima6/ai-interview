import { onboardingServiceClient, clientServiceClient, enquiryServiceClient } from "../config/internalClients.js"
import { RANGE_TO_DAYS, fillDailySeries } from "../utils/dateSeries.js"

// Composes a summary from data owned by other services - dashboard-service
// owns no business data of its own, only the aggregation. `filters`
// (registrationType/from/to) is the single filter context shared by every
// dashboard endpoint - summary, trends and the funnel all resolve it the
// same way so they can never disagree with each other.
export const getSummary = async (filters, ctx) => {
    const { registrationType: type, from, to } = filters || {}
    const [onboardingStats, clientStats, enquiryStats] = await Promise.all([
        onboardingServiceClient.getStatistics({ type, from, to }, ctx),
        clientServiceClient.getStatistics({ type, from, to }, ctx).catch(() => ({})),
        enquiryServiceClient.getStatistics({ type, from, to }, ctx).catch(() => ({})),
    ])

    const totalOnboarding = Object.values(onboardingStats.byStatus || {}).reduce((a, b) => a + b, 0)
    const approved = onboardingStats.byStatus?.APPROVED || 0
    const completionRate = totalOnboarding ? Math.round((approved / totalOnboarding) * 100) : 0

    return {
        totalRegistrations: totalOnboarding,
        activeOnboarding: onboardingStats.byStatus?.IN_PROGRESS || 0,
        pendingReview: onboardingStats.byStatus?.SUBMITTED || 0,
        completionRate,
        activeClients: clientStats.ACTIVE || 0,
        newEnquiries: enquiryStats.NEW || 0,
        // Not implemented in this slice (no real communication failure /
        // overdue-review tracking yet) - surfaced explicitly as null rather
        // than a fabricated number.
        communicationFailures: null,
        overdueReviews: null,
    }
}

export const getActivity = async ({ cursor, limit } = {}, ctx) =>
    onboardingServiceClient.getActivity({ cursor, limit }, ctx)


export const getTrends = async (range, filters, ctx) => {
    const days = RANGE_TO_DAYS[range] || 30
    const { registrationType: type, from, to } = filters || {}

    const [onboardingTrend, enquiryTrend, onboardingStats] = await Promise.all([
        onboardingServiceClient.getTrend(days, { type, from, to }, ctx),
        enquiryServiceClient.getTrend(days, { type, from, to }, ctx).catch(() => []),
        onboardingServiceClient.getStatistics({ type, from, to }, ctx),
    ])

    const byStatus = onboardingStats.byStatus || {}
    // A rough but real (not fabricated) funnel from the actual session
    // status distribution - every session has moved through at least
    // "registered", so total counts as that stage's value.
    const totalRegistered = Object.values(byStatus).reduce((a, b) => a + b, 0)

    return {
        registrations: fillDailySeries(days, onboardingTrend.byDay || []),
        enquiries: fillDailySeries(days, enquiryTrend || []),
        registrationsByType: onboardingTrend.byType || {},
        onboardingFunnel: {
            registered: totalRegistered,
            inProgress: (byStatus.IN_PROGRESS || 0) + (byStatus.NOT_STARTED || 0),
            submitted: (byStatus.SUBMITTED || 0) + (byStatus.UNDER_REVIEW || 0) + (byStatus.RESUBMITTED || 0) + (byStatus.CHANGES_REQUESTED || 0),
            approved: byStatus.APPROVED || 0,
        },
    }
}
