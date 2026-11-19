import { useQuery } from '@tanstack/react-query'
import { listInterviewDrives } from '../api/organization/organizationApi'
import { useAuth } from './useAuth.jsx'

/** Your active AI interviews, with their rounds. Shared by every place that needs to pick one. */
export default function useAiInterviews() {
    const auth = useAuth()
    const signedIn = auth.status === 'authenticated'
    const query = useQuery({ queryKey: ['oa', 'ai-interviews'], queryFn: () => listInterviewDrives({ status: 'ACTIVE', page: 1, pageSize: 100 }), enabled: signedIn, staleTime: 60 * 1000 })
    const options = (query.data?.items || []).map((d) => ({ id: String(d._id || d.id), title: d.title, rounds: (d.rounds || []).map((r) => ({ roundNumber: r.roundNumber, title: r.title, status: r.status })) }))
    return { signedIn, query, options }
}

