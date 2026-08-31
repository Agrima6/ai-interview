// One small mapper per dashboard section - kept separate (not one combined
// mapper) so each independent query in useOrganizationDashboard.js can map
// its own response without knowing about the others' shapes.
export const toMetricsViewModel = (raw) => raw || null
export const toTrendsViewModel = (raw) => raw ? { pipeline: raw.pipeline || [], interviewTrend: raw.interviewTrend || [], scoreDistribution: raw.scoreDistribution || [] } : null
export const toAttentionViewModel = (raw) => raw || []
export const toActivityViewModel = (raw) => raw?.items || []
