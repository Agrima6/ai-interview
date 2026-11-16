import React from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { oaApi } from '../../api/oaApi'
import Skeleton from '../../components/ui/Skeleton'

/** Old "/oa/admin/assessments/:id" links: find the drive the round belongs to and open it there. */
export default function OaLegacyRoundRedirect() {
    const { id } = useParams()
    const { data: a, isLoading, isError } = useQuery({ queryKey: ['oa', 'assessment', id], queryFn: () => oaApi.getAssessment(id), retry: false })
    if (isLoading) return <div className='space-y-4' aria-busy='true' aria-label='Opening the round'><Skeleton className='h-8 w-1/2' /><Skeleton className='h-64 w-full rounded-2xl' /></div>
    if (isError || !a?.driveId) return <Navigate to='/oa/admin/drives' replace />
    return <Navigate to={`/oa/admin/drives/${a.driveId}?round=${id}`} replace />
}
