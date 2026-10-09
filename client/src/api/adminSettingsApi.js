import { apiGet, apiPut } from './client'

// Platform-wide voice provider. The backend validates, stores and audits it; the browser only displays and requests.
export const getVoiceProviderSetting = () => apiGet('/api/v1/admin/settings/voice-provider')
export const saveVoiceProviderSetting = (provider, expectedVersion) =>
    apiPut('/api/v1/admin/settings/voice-provider', { provider, ...(Number.isInteger(expectedVersion) ? { expectedVersion } : {}) })
