import { useQuery } from '@tanstack/react-query'
import { getOrganizationProfile } from '../../api/organization/organizationApi'

export function useOrganizationProfile() {
    return useQuery({
        queryKey: ['organization', 'profile'],
        queryFn: getOrganizationProfile,
        staleTime: 5 * 60 * 1000,
    })
}
