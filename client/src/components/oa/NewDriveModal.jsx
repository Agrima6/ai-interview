import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ensureOaSession, oaApi } from '../../api/oaApi'
import Button from '../Button'
import Modal from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { TextField } from './oaFields'
import { FILTERS, LIMITS, lengthError } from './oaRules'
import RoundKindChoice from './RoundKindChoice'
import { serverKind } from './oaFormat'
import DriveDetailsFields from './DriveDetailsFields'

function NewDriveForm({ onClose, onCreated }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [title, setTitle] = useState('')
    const [kind, setKind] = useState('TEST')
    const [details, setDetails] = useState({ department: '', roleCategory: '', experienceLevel: '' })
    const [titleError, setTitleError] = useState('')
    const problem = lengthError(title, { ...LIMITS.title, label: 'The name' })
    const create = useMutation({
        mutationFn: async () => { await ensureOaSession(); return oaApi.createDrive({ title: title.trim(), kind: serverKind(kind), ...details }) },
        onSuccess: (drive) => {
            queryClient.invalidateQueries({ queryKey: ['oa'] }); queryClient.invalidateQueries({ queryKey: ['unified-drives'] })
            toast.success(kind !== 'AI_INTERVIEW' ? 'Drive created. Start with step 1: add questions.' : 'Drive created. Start with step 1: add candidates.')
            onCreated(drive, { withAi: kind === 'TEST_AI' })
        },
        onError: (err) => { setTitleError(err.fields?.title || err.message); toast.error(err.message) },
    })
    const submit = (e) => { e?.preventDefault(); if (!problem && !create.isPending) create.mutate() }
    return (
        <Modal open onClose={onClose} title='New drive' size='lg'
            footer={<><Button variant='secondary' size='sm' onClick={onClose}>Cancel</Button><Button size='sm' disabled={create.isPending || Boolean(problem)} onClick={submit}>{create.isPending ? 'Creating…' : 'Create drive'}</Button></>}>
            <form onSubmit={submit}>
                <TextField autoFocus label='Name of the drive' filter={FILTERS.title} value={title} onChange={(v) => { setTitle(v); setTitleError('') }} max={LIMITS.title.max} error={titleError || (title ? problem : '')} placeholder='e.g. Campus Hiring 2026' />
                <fieldset className='mt-5'>
                    <legend className='text-[13px] font-bold text-ink mb-0.5'>About the job <span className='font-normal text-text-secondary'>(optional, filled once)</span></legend>
                    <p className='text-[12.5px] text-text-secondary mb-2'>Used again for every AI interview in this drive, so you never type it twice.</p>
                    <DriveDetailsFields value={details} onChange={setDetails} />
                </fieldset>
                <fieldset className='mt-5'>
                    <legend className='text-[13px] font-bold text-ink mb-2'>What is Round 1?</legend>
                    <RoundKindChoice value={kind} onChange={setKind} name='new-drive-kind' />
                </fieldset>
                <p className='text-[12.5px] text-text-secondary mt-3'>A drive can have up to 10 rounds, each an online test or an AI interview, in any order. For example two online tests, then an AI interview.</p>
            </form>
        </Modal>
    )
}

/** "New drive": a name and what Round 1 is. Mounted only while open, so each opening starts clean. */
export default function NewDriveModal({ open, onClose, onCreated }) {
    return open ? <NewDriveForm onClose={onClose} onCreated={onCreated} /> : null
}
