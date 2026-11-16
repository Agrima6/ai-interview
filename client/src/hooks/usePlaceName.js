import { useQuery } from '@tanstack/react-query'
import { examApi } from '../api/oaApi'

/** A place name ("Gurugram, Haryana, India") for coordinates; `undefined` while loading or when none is known. */
export default function usePlaceName(latitude, longitude) {
    const valid = typeof latitude === 'number' && typeof longitude === 'number'
    const place = useQuery({
        queryKey: ['oa-exam', 'place', valid ? latitude.toFixed(3) : null, valid ? longitude.toFixed(3) : null],
        queryFn: () => examApi.place(latitude, longitude),
        enabled: valid,
        staleTime: 24 * 3600 * 1000,
        retry: false,
    })
    return { place: place.data?.place || '', loading: valid && place.isLoading }
}
