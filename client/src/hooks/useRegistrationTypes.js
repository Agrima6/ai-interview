import { useQuery } from '@tanstack/react-query'
import { getRegistrationTypes } from '../api/registrationsApi'

// The dynamic, backend-owned list of registration types (currently
// Organization/College/Candidate) - fetched once and cached, never
// hard-coded, so a future registration type shows up here automatically.
export function useRegistrationTypes() {
    const { data } = useQuery({
        queryKey: ['registration-types'],
        queryFn: getRegistrationTypes,
        staleTime: 10 * 60 * 1000,
    })
    return data?.types || []
}
