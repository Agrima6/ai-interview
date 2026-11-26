import { apiGet, apiGetList } from './client'

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

// The platform owner reads any organization's online-test results (read-only: the server checks the permission).
export const adminResultsApi = {
    organizations: () => apiGet('/api/v1/admin/oa-results/organizations'),
    tests: (orgKey) => apiGet(`/api/v1/admin/oa-results/organizations/${orgKey}/tests`),
    results: (testId, params) => apiGetList(`/api/v1/admin/oa-results/tests/${testId}/results`, clean(params)),
    paper: (testId) => apiGet(`/api/v1/admin/oa-results/tests/${testId}/paper`),
    insights: (testId) => apiGet(`/api/v1/admin/oa-results/tests/${testId}/insights`),
    attempt: (testId, attemptId) => apiGet(`/api/v1/admin/oa-results/tests/${testId}/attempts/${attemptId}`),
}
