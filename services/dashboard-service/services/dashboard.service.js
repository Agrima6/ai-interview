import { onboardingServiceClient, clientServiceClient } from "../config/internalClients.js"

// Composes a summary from data owned by other services - dashboard-service
// owns no business data of its own, only the aggregation.
export const getSummary = async (ctx) => {
    const [onboardingStats, clientStats] = await Promise.all([
        onboardingServiceClient.getStatistics(ctx),
        clientServiceClient.getStatistics(ctx).catch(() => ({})),
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
        // Not implemented in this slice (no enquiry-service / real communication
        // failure tracking yet) - surfaced explicitly as null rather than a
        // fabricated number.
        newEnquiries: null,
        communicationFailures: null,
        overdueReviews: null,
    }
}

export const getActivity = async (ctx) => {
    const stats = await onboardingServiceClient.getStatistics(ctx)
    return stats.recent || []
}
