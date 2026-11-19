import React, { Suspense, lazy, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, CheckCircle2, Plus } from 'lucide-react'
import useAiInterviews from '../../hooks/useAiInterviews'
import useOaBase from '../../hooks/useOaBase'
import Button from '../Button'
import Skeleton from '../ui/Skeleton'
import { ErrorState } from './oaUi'
import { inputClass } from './oaFormat'

// The existing Create Interview form, used exactly as it is: it is loaded only when someone asks to create an AI interview.
const CreateInterviewForm = lazy(() => import('../organization/CreateDriveModal'))

/**
 * Choose the AI interview for a round. The main path is to set one up right here with the usual Create Interview form
 * (it is selected for you when you finish); an interview you made earlier can be reused from the list instead.
 */
export default function AiInterviewPicker({ value, onChange, disabled = false, pending = false, getPrefill = null }) {
    const base = useOaBase()
    const { signedIn, query, options } = useAiInterviews()
    const [creating, setCreating] = useState(false)
    const [prefill, setPrefill] = useState(null)
    const [preparing, setPreparing] = useState(false)
    const openForm = async () => {
        setPreparing(true)
        try { setPrefill(getPrefill ? await getPrefill() : null) } catch { setPrefill(null) } finally { setPreparing(false) }
        setCreating(true)
    }
    const chosen = options.find((o) => o.id === value)
    const openRounds = (chosen?.rounds || []).filter((r) => r.status === 'ACTIVE')

    if (!signedIn) return <p className='text-[13.5px] text-text-secondary'>AI interviews belong to your organization account. Sign in through the main WorkmateIQ sign-in to choose one here.</p>
    if (query.isError) return <ErrorState title='Could not load your AI interviews' message={query.error.message} onRetry={query.refetch} />
    if (query.isLoading) return <div className='space-y-3'><Skeleton className='h-4 w-1/3' /><Skeleton className='h-11 w-full' /></div>

    return (
        <div>
            {chosen ? (
                <p className='oa-rise flex items-start gap-2 text-[13.5px] text-ink'>
                    <CheckCircle2 size={17} className='text-[var(--color-success)] mt-0.5 shrink-0' aria-hidden='true' />
                    <span className='min-w-0'>AI interview: <strong className='break-words'>{chosen.title}</strong>.{' '}
                        {!openRounds.length && <span className='text-[var(--color-warning)]'>It has no active round yet, so activate one in AI Interview first. </span>}
                        {base.aiDrive && <Link to={base.aiDrive(chosen.id)} className='font-semibold text-accent hover:underline'>View its questions and settings</Link>}</span>
                </p>
            ) : (
                <>
                    <p className='text-[13.5px] text-text-secondary mb-3'>Set up the interview the AI will conduct: its questions, scoring and time limit. It uses the same Create Interview form as everywhere else, and is attached to this round when you finish. Details you already gave for this drive are filled in for you.</p>
                    <Button size='sm' disabled={disabled || pending || preparing} onClick={openForm}><Plus size={15} /> {preparing ? 'Opening…' : 'Set up the AI interview'}</Button>
                </>
            )}
            {value && !chosen && <p className='text-[12.5px] text-[var(--color-warning)] mt-2'>The AI interview chosen earlier is no longer active. Set up or choose another one.</p>}
            {options.length > 0 && (
                <div className='mt-4 max-w-lg'>
                    <label htmlFor='ai-drive' className='block text-[12.5px] font-semibold text-text-secondary mb-1.5'>{chosen ? 'Use a different AI interview' : 'Or reuse one you already created'}</label>
                    <select id='ai-drive' className={inputClass} disabled={disabled || pending} value={chosen?.id || ''} onChange={(e) => onChange(e.target.value)}>
                        <option value=''>{chosen ? 'Choose another…' : 'Choose an AI interview…'}</option>
                        {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                    </select>
                    <p className='text-[12px] text-text-secondary mt-1.5'><Bot size={12} className='inline -mt-0.5 mr-1' aria-hidden='true' />These are the AI interviews already in your organization, not rounds of this drive.</p>
                </div>
            )}
            {creating && (
                <Suspense fallback={null}>
                    <CreateInterviewForm open prefill={prefill} onClose={() => setCreating(false)} onCreateDrive={(drive) => { const id = String(drive?._id || drive?.id || ''); if (id) onChange(id) }} />
                </Suspense>
            )}
        </div>
    )
}
