import { getOrganizationProfile } from '../api/organization/organizationApi'

// The one place that decides where a signed-in user belongs. Used right after login and when an already
// signed-in visitor lands on a public page (/ or /login), so the two can never disagree.
//
// An org admin who also holds a candidate application is still primarily an org admin: the org identity wins.
export async function resolvePostLoginPath(user) {
    if (!user) return '/login'
    const isOrgAdmin = Boolean(user.tenantId || user.roles?.includes('CLIENT_ADMIN'))
    if (!isOrgAdmin && user.roles?.includes('CANDIDATE')) {
        return user.mustChangePassword ? '/candidate/change-password' : '/candidate/room'
    }
    if (user.mustChangePassword) return '/platform/client/change-password'
    if (!isOrgAdmin) return '/platform/dashboard'
    try {
        const profile = await getOrganizationProfile()
        if (profile?.type === 'COLLEGE') return '/college/dashboard'
        if (profile?.type === 'CANDIDATE') return '/candidate/dashboard'
    } catch { /* fall through to the organization dashboard */ }
    return '/organization/dashboard'
}
