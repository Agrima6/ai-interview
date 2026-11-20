import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mic } from 'lucide-react'
import { getInterviewDriveById } from '../../api/organization/organizationApi'
import Badge from '../ui/Badge'
import Button from '../Button'
import CandidateDetailModal from '../organization/CandidateDetailModal'

const STATUS = { COMPLETED: ['Completed', 'success'], SHORTLISTED: ['Shortlisted', 'success'], REJECTED: ['Not selected', 'danger'], SCHEDULED: ['Scheduled', 'neutral'], INVITED: ['Invited, not taken yet', 'neutral'], CLOSED: ['Missed', 'danger'] }

/**
 * The candidate's AI interview result, shown beside their test result. The AI interview lives in its own drive (linked to
 * this test), so the person is found there by email and the same full report opens as in the AI interview area.
 */
export default function AiInterviewReportCard({ assessment, email }) {
    const part = assessment?.aiPart?.enabled ? assessment.aiPart : assessment?.kind === 'AI_INTERVIEW' ? { aiInterviewDriveId: assessment.aiInterviewDriveId, roundNumber: 1 } : null
    const driveId = part?.aiInterviewDriveId || null
    const [open, setOpen] = useState(false)
    const drive = useQuery({ queryKey: ['ai-drive', driveId], queryFn: () => getInterviewDriveById(driveId), enabled: Boolean(driveId), staleTime: 30000, retry: false })
    if (!driveId) return null

    const wanted = String(email || '').trim().toLowerCase()
    const rounds = drive.data?.rounds || []
    const round = rounds.find((r) => r.roundNumber === (part.roundNumber || 1)) || rounds[0]
    const cand = (round?.candidates || []).find((c) => String(c.email || '').trim().toLowerCase() === wanted)
    const [label, tone] = STATUS[cand?.status] || ['In progress', 'neutral']
    const hasReport = Boolean(cand && (cand.agentReport || cand.status === 'COMPLETED' || cand.aiScore > 0))

    return (
        <section aria-label='AI interview report' className='border border-line rounded-xl p-4'>
            <div className='flex items-center gap-2 mb-2'><Mic size={15} className='text-accent' aria-hidden='true' /><h3 className='text-[13.5px] font-bold text-ink'>AI interview</h3>{cand && <Badge variant={tone}>{label}</Badge>}</div>
            {drive.isLoading && <p className='text-[13px] text-text-secondary'>Loading the AI interview result…</p>}
            {drive.isError && <p className='text-[13px] text-text-secondary'>The AI interview result could not be loaded. {drive.error?.message}</p>}
            {drive.data && !cand && <p className='text-[13px] text-text-secondary'>This candidate has not been added to the AI interview yet.</p>}
            {cand && (
                <div className='flex flex-wrap items-center justify-between gap-3'>
                    <p className='text-[13px] text-text-secondary'>
                        {cand.aiScore > 0 ? <>Score <strong className='text-ink tabular-nums'>{cand.aiScore}%</strong></> : hasReport ? 'The report is ready.' : 'The report appears here once the interview is finished.'}
                    </p>
                    <Button size='sm' variant='secondary' disabled={!hasReport} onClick={() => setOpen(true)}>View AI interview report</Button>
                </div>
            )}
            {cand && <CandidateDetailModal open={open} onClose={() => setOpen(false)} candidate={{ ...cand, driveTitle: drive.data.title, driveId, roundNumber: round.roundNumber }} onStatusChange={() => {}} />}
        </section>
    )
}
