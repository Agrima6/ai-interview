import React, { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Eye, Lock, MonitorUp, Shuffle } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import Button from '../Button'
import { useToast } from '../ui/Toast'
import { Panel } from './oaUi'
import { fromLocalInput, inputClass, toLocalInput } from './oaFormat'

const browserTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata' } catch { return 'Asia/Kolkata' } }

function Field({ label, hint, error, children, htmlFor }) {
    return (
        <div>
            <label htmlFor={htmlFor} className='block text-[13px] font-semibold text-ink mb-1.5'>{label}</label>
            {children}
            {error ? <p className='text-[12px] text-red-500 mt-1.5'>{error}</p> : hint ? <p className='text-[12px] text-text-secondary mt-1.5'>{hint}</p> : null}
        </div>
    )
}

function Toggle({ checked, onChange, label, hint, disabled }) {
    return (
        <label className={`flex items-start gap-3 py-2.5 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
            <input type='checkbox' className='mt-1 w-4 h-4 accent-[var(--color-accent)]' checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
            <span><span className='block text-[13.5px] font-medium text-ink'>{label}</span>{hint && <span className='block text-[12px] text-text-secondary'>{hint}</span>}</span>
        </label>
    )
}

export default function SetupTab({ assessment: a }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const locked = a.locked
    const initial = useMemo(() => ({
        title: a.title, roundLabel: a.roundLabel || '', description: a.description || '', instructions: a.instructions || '',
        startAt: toLocalInput(a.schedule?.startAt), endAt: toLocalInput(a.schedule?.endAt),
        durationMinutes: a.schedule?.durationMinutes ?? 60, lateEntryMinutes: a.schedule?.lateEntryMinutes ?? 10,
        settings: { ...a.settings }, proctoring: { ...a.proctoring },
    }), [a])
    const [f, setF] = useState(initial)
    const [errors, setErrors] = useState({})
    const dirty = JSON.stringify(f) !== JSON.stringify(initial)
    const set = (key) => (e) => { setF((s) => ({ ...s, [key]: e.target.value })); setErrors((x) => ({ ...x, [key]: undefined })) }
    const setSetting = (key, value) => setF((s) => ({ ...s, settings: { ...s.settings, [key]: value } }))
    const setProct = (key, value) => setF((s) => ({ ...s, proctoring: { ...s.proctoring, [key]: value } }))
    const hard = f.proctoring.level === 'HARD'

    const save = useMutation({
        mutationFn: () => {
            const body = { title: f.title, roundLabel: f.roundLabel, description: f.description, instructions: f.instructions }
            if (!locked) {
                body.settings = f.settings
                body.proctoring = f.proctoring
                if (f.startAt && f.endAt) body.schedule = { startAt: fromLocalInput(f.startAt), endAt: fromLocalInput(f.endAt), durationMinutes: Number(f.durationMinutes), lateEntryMinutes: Number(f.lateEntryMinutes), timezone: browserTz() }
            }
            return oaApi.updateAssessment(a.id, body)
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['oa'] }); toast.success('Saved.') },
        onError: (err) => { setErrors(err.fields || {}); toast.error(err.message) },
    })

    return (
        <form onSubmit={(e) => { e.preventDefault(); if (dirty && !save.isPending) save.mutate() }} className='grid xl:grid-cols-2 gap-6 items-start'>
            <div className='space-y-6'>
                <Panel title='Details'>
                    <div className='space-y-4'>
                        <Field label='Name' htmlFor='a-title' error={errors.title}><input id='a-title' className={inputClass} value={f.title} onChange={set('title')} maxLength={140} /></Field>
                        <Field label='Round label' htmlFor='a-round' hint='Optional, e.g. “Round 1 · Aptitude”.'><input id='a-round' className={inputClass} value={f.roundLabel} onChange={set('roundLabel')} maxLength={60} /></Field>
                        <Field label='Description' htmlFor='a-desc'><textarea id='a-desc' rows={2} className={inputClass} value={f.description} onChange={set('description')} maxLength={2000} /></Field>
                        <Field label='Instructions shown to students' htmlFor='a-ins' hint='Marking scheme, allowed materials, anything they must know. A proctoring summary is added automatically.'><textarea id='a-ins' rows={4} className={inputClass} value={f.instructions} onChange={set('instructions')} maxLength={4000} /></Field>
                    </div>
                </Panel>

                <Panel title='Schedule' description={locked ? 'Locked because students have started.' : `Everyone starts together. Times use your timezone (${browserTz()}).`}>
                    <fieldset disabled={locked} className='grid sm:grid-cols-2 gap-4'>
                        <Field label='Starts' htmlFor='a-start' error={errors.startAt}><input id='a-start' type='datetime-local' className={inputClass} value={f.startAt} onChange={set('startAt')} /></Field>
                        <Field label='Closes' htmlFor='a-end' error={errors.endAt} hint='The latest anyone can still be writing.'><input id='a-end' type='datetime-local' className={inputClass} value={f.endAt} onChange={set('endAt')} /></Field>
                        <Field label='Duration (minutes)' htmlFor='a-dur' error={errors.durationMinutes} hint='Each student gets this long from when they start.'><input id='a-dur' type='number' min={5} max={360} className={inputClass} value={f.durationMinutes} onChange={set('durationMinutes')} /></Field>
                        <Field label='Late entry (minutes)' htmlFor='a-late' error={errors.lateEntryMinutes} hint='How long after the start a student can still begin.'><input id='a-late' type='number' min={0} max={120} className={inputClass} value={f.lateEntryMinutes} onChange={set('lateEntryMinutes')} /></Field>
                    </fieldset>
                </Panel>
            </div>

            <div className='space-y-6'>
                <Panel title='Test rules' description={locked ? 'Locked because students have started.' : undefined}>
                    <fieldset disabled={locked} className='divide-y divide-line -my-2'>
                        <Toggle checked={f.settings.shuffleQuestions} onChange={(v) => setSetting('shuffleQuestions', v)} label='Different question order for every student' hint='Shuffled within each section, fixed for that student if they reload.' />
                        <Toggle checked={f.settings.shuffleOptions} onChange={(v) => setSetting('shuffleOptions', v)} label='Shuffle answer options' />
                        <Toggle checked={f.settings.shuffleSections} onChange={(v) => setSetting('shuffleSections', v)} label='Shuffle the order of sections' />
                        <Toggle checked={f.settings.allowBackNavigation} onChange={(v) => setSetting('allowBackNavigation', v)} label='Let students go back to earlier questions' />
                        <Toggle checked={f.settings.showResultToStudent} onChange={(v) => setSetting('showResultToStudent', v)} label='Show the score to students after they finish' hint='Only once every answer has been graded.' />
                        <div className='py-3'><Field label='Pass mark (%)' htmlFor='a-pass'><input id='a-pass' type='number' min={0} max={100} className={`${inputClass} !w-28`} value={f.settings.passPercent} onChange={(e) => setSetting('passPercent', e.target.value)} /></Field></div>
                    </fieldset>
                </Panel>

                <Panel title='Proctoring' description='Rules the student must accept before they can begin.'>
                    <fieldset disabled={locked}>
                        <div className='grid grid-cols-2 gap-3 mb-4' role='radiogroup' aria-label='Proctoring level'>
                            {[['HARD', 'Hard', 'Camera, screen share, full screen and face checks, all required.'], ['STANDARD', 'Standard', 'Choose which checks to require.']].map(([value, label, hint]) => (
                                <button type='button' key={value} role='radio' aria-checked={f.proctoring.level === value} onClick={() => setProct('level', value)}
                                    className={`text-left rounded-xl border-[1.5px] p-3.5 transition-colors ${f.proctoring.level === value ? 'border-accent bg-accent/5' : 'border-line hover:border-accent/40'}`}>
                                    <span className='flex items-center gap-1.5 text-[14px] font-bold text-ink'><Lock size={14} /> {label}</span>
                                    <span className='block text-[12px] text-text-secondary mt-1'>{hint}</span>
                                </button>
                            ))}
                        </div>
                        <div className='divide-y divide-line'>
                            <Toggle checked={hard || f.proctoring.requireCamera} disabled={hard} onChange={(v) => setProct('requireCamera', v)} label={<span className='inline-flex items-center gap-1.5'><Camera size={14} /> Webcam on, with the video shown to the student</span>} />
                            <Toggle checked={hard || f.proctoring.requireScreenShare} disabled={hard} onChange={(v) => setProct('requireScreenShare', v)} label={<span className='inline-flex items-center gap-1.5'><MonitorUp size={14} /> Entire screen shared</span>} />
                            <Toggle checked={hard || f.proctoring.requireFullscreen} disabled={hard} onChange={(v) => setProct('requireFullscreen', v)} label='Full screen enforced' hint='Leaving it, switching tabs or windows is recorded.' />
                            <Toggle checked={hard || f.proctoring.faceChecks} disabled={hard} onChange={(v) => setProct('faceChecks', v)} label={<span className='inline-flex items-center gap-1.5'><Eye size={14} /> Face checks</span>} hint='No face, more than one face, or looking away.' />
                            <Toggle checked={hard || f.proctoring.blockCopyPaste} disabled={hard} onChange={(v) => setProct('blockCopyPaste', v)} label={<span className='inline-flex items-center gap-1.5'><Shuffle size={14} /> Block copy, paste and right-click</span>} />
                        </div>
                        <div className='grid sm:grid-cols-2 gap-4 mt-4'>
                            <Field label='Violations before auto-submit' htmlFor='a-max' hint='The attempt ends and is flagged.'><input id='a-max' type='number' min={1} max={50} className={inputClass} value={f.proctoring.maxViolations} onChange={(e) => setProct('maxViolations', e.target.value)} /></Field>
                            <Field label='Webcam snapshot every (seconds)' htmlFor='a-snap' hint='Evidence you can review later.'><input id='a-snap' type='number' min={15} max={300} className={inputClass} value={f.proctoring.snapshotIntervalSec} onChange={(e) => setProct('snapshotIntervalSec', e.target.value)} /></Field>
                        </div>
                    </fieldset>
                </Panel>
            </div>

            <div className='xl:col-span-2 flex items-center justify-end gap-3 sticky bottom-0 bg-bg/90 backdrop-blur py-3 -mx-1 px-1 z-[var(--z-sticky-header)]'>
                {dirty && <span className='text-[12.5px] text-text-secondary'>You have unsaved changes</span>}
                <Button type='button' variant='secondary' size='sm' disabled={!dirty} onClick={() => { setF(initial); setErrors({}) }}>Discard</Button>
                <Button type='submit' size='sm' disabled={!dirty || save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
            </div>
        </form>
    )
}
