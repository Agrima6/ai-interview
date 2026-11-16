import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bot, Check, ClipboardCheck } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import Button from '../Button'
import Modal from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { NumberField, TextField } from './oaFields'
import { FILTERS, LIMITS, rangeError } from './oaRules'

const KINDS = [
    { id: 'TEST', icon: ClipboardCheck, title: 'Online test', text: 'MCQ, written, coding and video questions in a proctored test room.' },
    { id: 'AI_INTERVIEW', icon: Bot, title: 'AI interview', text: 'The AI interviewer speaks to each candidate and scores the conversation.' },
]

// A big either/or choice that reads at a glance; the selected one carries a tick, not colour alone.
function Choice({ selected, onSelect, icon, title, text, disabled, name }) {
    const Icon = icon
    return (
        <label className={`relative flex gap-3 rounded-2xl border-2 p-3.5 transition-colors ${disabled ? 'opacity-55 cursor-not-allowed border-line' : selected ? 'border-accent bg-accent/[0.05] cursor-pointer' : 'border-line hover:border-accent/40 cursor-pointer'}`}>
            <input type='radio' name={name} className='sr-only' checked={selected} disabled={disabled} onChange={onSelect} />
            {Icon && <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${selected ? 'bg-accent text-white' : 'bg-surface-muted text-text-secondary'}`} aria-hidden='true'><Icon size={19} strokeWidth={1.8} /></span>}
            <span className='min-w-0 flex-1'>
                <span className='block text-[14px] font-bold text-ink'>{title}</span>
                <span className='block text-[12.5px] leading-snug text-text-secondary mt-0.5'>{text}</span>
            </span>
            {selected && <span className='absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center' aria-hidden='true'><Check size={12} strokeWidth={3} /></span>}
        </label>
    )
}

function AddRoundForm({ drive, preset, onClose, onAdded }) {
    const toast = useToast()
    const previous = drive.rounds[drive.rounds.length - 1]
    const number = (previous?.roundNumber || drive.rounds.length) + 1
    // Qualifiers can only be carried over from a test that someone has finished.
    const canCarry = previous?.kind !== 'AI_INTERVIEW' && (previous?.stats.finished || 0) > 0
    const [kind, setKind] = useState('TEST')
    const [name, setName] = useState('')
    const [who, setWho] = useState(canCarry && preset !== 'NONE' ? 'QUALIFIED' : 'NONE')
    const [cut, setCut] = useState('PERCENT')
    const [minPercent, setMinPercent] = useState('60')
    const [topN, setTopN] = useState('10')
    const [serverError, setServerError] = useState('')

    const cutError = who !== 'QUALIFIED' ? '' : cut === 'PERCENT' ? rangeError(minPercent, { ...LIMITS.passPercent, label: 'The minimum score' }) : rangeError(topN, { ...LIMITS.nextRoundTop, label: 'The number of ranks' })

    const add = useMutation({
        mutationFn: () => oaApi.addRound(drive.id, {
            kind, name: name.trim(), candidates: who,
            ...(who === 'QUALIFIED' ? (cut === 'PERCENT' ? { minPercent: Number(minPercent) } : { topN: Number(topN) }) : {}),
        }),
        onSuccess: (made) => {
            toast.success(who === 'QUALIFIED' ? `Round ${made.roundNumber} created with ${made.students} candidate${made.students === 1 ? '' : 's'}.` : `Round ${made.roundNumber} created.`)
            onAdded(made)
        },
        onError: (err) => setServerError(err.message),
    })
    const submit = (e) => { e?.preventDefault(); if (!cutError && !add.isPending) { setServerError(''); add.mutate() } }

    return (
        <Modal open onClose={onClose} title={`Add Round ${number}`} size='lg'
            footer={<><Button variant='secondary' size='sm' onClick={onClose}>Cancel</Button><Button size='sm' disabled={add.isPending || Boolean(cutError)} onClick={submit}>{add.isPending ? 'Creating…' : `Create Round ${number}`}</Button></>}>
            <form onSubmit={submit} className='space-y-6'>
                <fieldset>
                    <legend className='text-[13px] font-bold text-ink mb-2'>1. What kind of round is it?</legend>
                    <div className='grid sm:grid-cols-2 gap-3'>
                        {KINDS.map((k) => <Choice key={k.id} name='round-kind' selected={kind === k.id} onSelect={() => setKind(k.id)} icon={k.icon} title={k.title} text={k.text} />)}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className='text-[13px] font-bold text-ink mb-2'>2. Who takes this round?</legend>
                    <div className='grid sm:grid-cols-2 gap-3'>
                        <Choice name='round-who' selected={who === 'QUALIFIED'} disabled={!canCarry} onSelect={() => setWho('QUALIFIED')} title={`Qualifiers of Round ${previous?.roundNumber || number - 1}`}
                            text={canCarry ? 'Carry over the candidates who clear a cut-off. Each gets a fresh access code.' : previous?.kind === 'AI_INTERVIEW' ? 'Not available: the round before is an AI interview, scored in AI Interview.' : 'Available once at least one candidate has finished the round before.'} />
                        <Choice name='round-who' selected={who === 'NONE'} onSelect={() => setWho('NONE')} title='I will add them myself' text='Start with an empty list, then upload or type the candidates.' />
                    </div>
                    {who === 'QUALIFIED' && (
                        <div className='oa-rise mt-3 rounded-2xl border border-line bg-surface-muted/60 p-4'>
                            <div role='radiogroup' aria-label='Cut-off' className='inline-flex rounded-xl border border-line bg-card p-1 mb-3'>
                                {[['PERCENT', 'Minimum score'], ['TOP', 'Top ranks']].map(([value, label]) => (
                                    <button key={value} type='button' role='radio' aria-checked={cut === value} onClick={() => setCut(value)}
                                        className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${cut === value ? 'bg-ink text-white' : 'text-text-secondary hover:text-ink'}`}>{label}</button>
                                ))}
                            </div>
                            {cut === 'PERCENT'
                                ? <NumberField label='Everyone who scored at least' value={minPercent} onChange={setMinPercent} max={LIMITS.passPercent.max} suffix='%' width='w-36' error={cutError} forceError hint='For example 60 means 60% and above move on.' />
                                : <NumberField label='The top' value={topN} onChange={setTopN} max={LIMITS.nextRoundTop.max} suffix='ranks' width='w-44' error={cutError} forceError hint='Candidates tied at the last rank all move on.' />}
                        </div>
                    )}
                </fieldset>

                <TextField label={<>3. Name of the round <span className='font-normal text-text-secondary'>(optional)</span></>} filter={(raw) => FILTERS.title(raw, LIMITS.roundLabel.max)} value={name} onChange={setName} max={LIMITS.roundLabel.max}
                    placeholder={kind === 'AI_INTERVIEW' ? 'e.g. Technical interview' : 'e.g. Coding test'} hint={`Shown as "Round ${number} · ${name.trim() || (kind === 'AI_INTERVIEW' ? 'AI interview' : 'Online test')}".`} />

                {serverError && <p role='alert' className='oa-error-in text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5'>{serverError}</p>}
            </form>
        </Modal>
    )
}

/** "Add a round" for a drive. `preset` = 'QUALIFIED' when opened from the results of the round before. */
export default function AddRoundModal({ open, ...rest }) {
    // Mounted only while open, so every opening starts from a clean form.
    return open ? <AddRoundForm {...rest} /> : null
}
