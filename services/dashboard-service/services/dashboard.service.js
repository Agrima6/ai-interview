import { onboardingServiceClient, clientServiceClient, enquiryServiceClient } from "../config/internalClients.js"

// Composes a summary from data owned by other services - dashboard-service
// owns no business data of its own, only the aggregation.
export const getSummary = async (ctx) => {
    const [onboardingStats, clientStats, enquiryStats] = await Promise.all([
        onboardingServiceClient.getStatistics(ctx),
        clientServiceClient.getStatistics(ctx).catch(() => ({})),
        enquiryServiceClient.getStatistics(ctx).catch(() => ({})),
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

const RANGE_TO_DAYS = { "7d": 7, "30d": 30, "90d": 90 }

// Fills in zero-count days so the line chart doesn't show gaps/warped
// spacing on days with no activity - both series get the exact same
// contiguous date axis regardless of what each source service returned.
const fillDailySeries = (days, sparse) => {
    const byDate = Object.fromEntries(sparse.map((r) => [r.date, r.count]))
    const series = []
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const date = d.toISOString().slice(0, 10)
        series.push({ date, count: byDate[date] || 0 })
    }
    return series
}

export const getTrends = async (range, ctx) => {
    const days = RANGE_TO_DAYS[range] || 30

    const [onboardingTrend, enquiryTrend, onboardingStats] = await Promise.all([
        onboardingServiceClient.getTrend(days, ctx),
        enquiryServiceClient.getTrend(days, ctx).catch(() => []),
        onboardingServiceClient.getStatistics(ctx),
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
