import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getDashboardSummary, getDashboardTrends, getDashboardAttention, getDashboardActivity } from '../../api/organization/dashboardApi'
import { toMetricsViewModel, toTrendsViewModel, toAttentionViewModel, toActivityViewModel } from '../../api/organization/dashboardViewModel'

/**
 * Four independent queries, not one combined fetch - integration.md
 * section 53/54 (partial dashboard failure): if attention or activity
 * fails, KPI cards and the pipeline chart must keep rendering, each
 * showing its own retry rather than the page as a whole.
 *
 * Query keys match integration.md section 10:
 *   ["organization","dashboard","summary"]
 *   ["organization","dashboard","trends",{range}]
 *   ["organization","dashboard","attention"]
 *   ["organization","dashboard","activity"]
 */
export function useOrganizationDashboard(range = '30d') {
    const summary = useQuery({
        queryKey: ['organization', 'dashboard', 'summary'],
        queryFn: getDashboardSummary,
    })

    const trends = useQuery({
        queryKey: ['organization', 'dashboard', 'trends', { range }],
        queryFn: () => getDashboardTrends(range),
        placeholderData: keepPreviousData,
    })

    const attention = useQuery({
        queryKey: ['organization', 'dashboard', 'attention'],
        queryFn: getDashboardAttention,
    })

    const activity = useQuery({
        queryKey: ['organization', 'dashboard', 'activity'],
        queryFn: getDashboardActivity,
    })

    return {
        metrics: { data: toMetricsViewModel(summary.data), isLoading: summary.isLoading, isError: summary.isError, error: summary.error, refetch: summary.refetch },
        trends: { data: toTrendsViewModel(trends.data), isLoading: trends.isLoading, isError: trends.isError, error: trends.error, refetch: trends.refetch },
        attention: { data: toAttentionViewModel(attention.data), isLoading: attention.isLoading, isError: attention.isError, error: attention.error, refetch: attention.refetch },
        activity: { data: toActivityViewModel(activity.data), isLoading: activity.isLoading, isError: activity.isError, error: activity.error, refetch: activity.refetch },
    }
}
