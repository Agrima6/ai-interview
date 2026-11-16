import { useQuery } from '@tanstack/react-query'
import { examApi } from '../api/oaApi'

const TEST_ID = /^[0-9a-f]{24}$/i

/** The organization behind a test (name and logo), for the pages a candidate sees before they sign in. */
export default function useExamBrand(assessmentId) {
    return useQuery({
        queryKey: ['oa-exam', 'brand', assessmentId],
        queryFn: () => examApi.brand(assessmentId),
        enabled: TEST_ID.test(String(assessmentId || '')),
        staleTime: 10 * 60 * 1000,
        retry: false,
    })
}
