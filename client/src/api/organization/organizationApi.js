import { apiGet, apiPatch } from "../client"

export const getOrganizationProfile = () => apiGet("/api/v1/organizations/me")

// Only branding is self-editable today (see client-service/services/
// client.service.js#updateMyOrganizationBranding) - name/status changes go
// through the staff-facing client-management flow, not this endpoint.
export const updateOrganizationBranding = (payload) => apiPatch("/api/v1/organizations/me/branding", payload)
