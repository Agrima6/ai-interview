import React, { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Camera, Eye, Lock, MonitorUp, Plus, Shuffle, Trash2, Users } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import useNow from '../../hooks/useNow'
import Button from '../Button'
import { useToast } from '../ui/Toast'
import { Field, NumberField, TextField } from './oaFields'
import { Panel } from './oaUi'
import { LIMITS, lengthError, rangeError } from './oaRules'
import { formatDateTime, fromLocalInput, inputClass, toLocalInput } from './oaFormat'

const browserTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata' } catch { return 'Asia/Kolkata' } }
const MIN = 60 * 1000
const newKey = () => `new-${Math.random().toString(36).slice(2, 9)}`

function Toggle({ checked, onChange, label, hint, disabled }) {
    return (
        <label className={`flex items-start gap-3 py-2.5 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
            <input type='checkbox' className='mt-1 w-4 h-4 accent-[var(--color-accent)]' checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
            <span><span className='block text-[13.5px] font-medium text-ink'>{label}</span>{hint && <span className='block text-[12px] text-text-secondary'>{hint}</span>}</span>
        </label>
    )
}

// Two ways to run a test: everyone starts together, or the organizer offers several start times and each student books one.
function ModeChoice({ value, onChange, disabled }) {
    const options = [
        { value: 'FIXED', icon: CalendarClock, title: 'Same time for everyone', hint: 'One start time. Everyone begins together.' },
        { value: 'SLOTS', icon: Users, title: 'Let students choose a slot', hint: 'Offer several start times. Each student books one.' },
    ]
    return (
        <div className='grid sm:grid-cols-2 gap-3 mb-5' role='radiogroup' aria-label='How students are scheduled'>
            {options.map((o) => (
                <button type='button' key={o.value} role='radio' aria-checked={value === o.value} disabled={disabled} onClick={() => onChange(o.value)}
                    className={`oa-press text-left rounded-xl border-[1.5px] p-3.5 transition-all disabled:opacity-60 ${value === o.value ? 'border-accent bg-accent/5 shadow-[0_6px_18px_-10px_var(--color-accent)]' : 'border-line hover:border-accent/40 hover:-translate-y-px'}`}>
                    <span className='flex items-center gap-2 text-[14px] font-bold text-ink'><o.icon size={15} className={value === o.value ? 'text-accent' : 'text-text-secondary'} /> {o.title}</span>
                    <span className='block text-[12px] text-text-secondary mt-1'>{o.hint}</span>
                </button>
            ))}
        </div>
    )
}

function SlotsEditor({ slots, onChange, usage, duration, late, disabled, error, forceError, now }) {
    const add = () => {
        const last = slots.filter((s) => s.startAt).map((s) => new Date(s.startAt).getTime()).filter(Number.isFinite).sort((a, b) => b - a)[0]
        const next = last ? new Date(last + ((Number(duration) || 60) + (Number(late) || 10) + 15) * MIN) : new Date(Date.now() + 24 * 60 * MIN)
        next.setSeconds(0, 0)
        onChange([...slots, { key: newKey(), startAt: toLocalInput(next), capacity: '' }])
    }
    const update = (key, patch) => onChange(slots.map((s) => (s.key === key ? { ...s, ...patch } : s)))
    const seen = new Map()
    slots.forEach((s) => { if (s.startAt) seen.set(s.startAt, (seen.get(s.startAt) || 0) + 1) })

    return (
        <div>
            <ul className='space-y-2.5'>
                {slots.map((s, i) => {
                    const booked = s.id ? usage?.[s.id] || 0 : 0
                    const when = s.startAt ? new Date(s.startAt).getTime() : NaN
                    const timeProblem = !s.startAt ? 'Choose a date and time.' : Number.isNaN(when) ? 'Choose a valid date and time.' : (!disabled && when <= now) ? 'This time is in the past.' : seen.get(s.startAt) > 1 ? 'Another slot starts at this exact time.' : ''
                    const seatProblem = rangeError(s.capacity, { ...LIMITS.slotCapacity, label: 'Seats', required: false })
                    return (
                        <li key={s.key} className='oa-rise rounded-xl border border-line p-3 bg-surface-muted/50'>
                            <div className='grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_150px_auto] gap-3 items-start'>
                                <Field className='order-1' label={`Slot ${i + 1} starts`} htmlFor={`slot-${s.key}`} error={forceError || s.startAt ? timeProblem : ''}>
                                    <input id={`slot-${s.key}`} type='datetime-local' disabled={disabled} className={`${inputClass} ${(forceError || s.startAt) && timeProblem ? '!border-[var(--color-danger)]' : ''}`} value={s.startAt} onChange={(e) => update(s.key, { startAt: e.target.value })} />
                                </Field>
                                <NumberField label='Seats' hint='Empty = no limit' value={s.capacity} disabled={disabled} onChange={(v) => update(s.key, { capacity: v })} max={LIMITS.slotCapacity.max} forceError={forceError}
                                    error={seatProblem} className='order-3 sm:order-2 col-span-2 sm:col-span-1' />
                                {!disabled && <button type='button' aria-label={`Remove slot ${i + 1}`} onClick={() => onChange(slots.filter((x) => x.key !== s.key))} className='order-2 sm:order-3 mt-7 p-2 text-text-secondary hover:text-[var(--color-danger)] transition-colors'><Trash2 size={16} /></button>}
                            </div>
                            {booked > 0 && <p className='text-[12px] text-text-secondary mt-2'>{booked} student{booked === 1 ? '' : 's'} booked{!disabled && ' · removing this slot asks them to choose again'}{s.capacity && booked > Number(s.capacity) ? ' · over the new seat limit (they keep their seat)' : ''}</p>}
                        </li>
                    )
                })}
            </ul>
            {error && <p role='alert' className='oa-error-in text-[12px] text-[var(--color-danger)] mt-2'>{error}</p>}
            {!disabled && (
                <div className='flex flex-wrap items-center gap-3 mt-3'>
                    <Button type='button' size='sm' variant='secondary' disabled={slots.length >= LIMITS.slots.max} onClick={add}><Plus size={14} /> Add a slot</Button>
                    <span className='text-[12px] text-text-secondary'>{slots.length} of {LIMITS.slots.max} · students can change their slot until 30 minutes before it starts.</span>
                </div>
            )}
        </div>
    )
}

export default function SetupTab({ assessment: a }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const locked = a.locked
    const now = useNow(15000)
    const [submitted, setSubmitted] = useState(false)
    const initial = useMemo(() => ({
        title: a.title, roundLabel: a.roundLabel || '', description: a.description || '', instructions: a.instructions || '',
        mode: a.schedule?.mode === 'SLOTS' ? 'SLOTS' : 'FIXED',
        startAt: toLocalInput(a.schedule?.startAt), endAt: toLocalInput(a.schedule?.endAt),
        slots: (a.schedule?.slots || []).map((s) => ({ key: s.id, id: s.id, startAt: toLocalInput(s.startAt), capacity: s.capacity ? String(s.capacity) : '' })),
        durationMinutes: String(a.schedule?.durationMinutes ?? 60), lateEntryMinutes: String(a.schedule?.lateEntryMinutes ?? 10),
        settings: { ...a.settings, passPercent: String(a.settings?.passPercent ?? 40) },
        proctoring: { ...a.proctoring, maxViolations: String(a.proctoring?.maxViolations ?? 5), snapshotIntervalSec: String(a.proctoring?.snapshotIntervalSec ?? 45) },
    }), [a])
    const [f, setF] = useState(initial)
    const [serverErrors, setServerErrors] = useState({})
    const dirty = JSON.stringify(f) !== JSON.stringify(initial)
    const set = (key) => (value) => { setF((s) => ({ ...s, [key]: value })); setServerErrors((x) => ({ ...x, [key]: undefined })) }
    const setSetting = (key, value) => setF((s) => ({ ...s, settings: { ...s.settings, [key]: value } }))
    const setProct = (key, value) => setF((s) => ({ ...s, proctoring: { ...s.proctoring, [key]: value } }))
    const hard = f.proctoring.level === 'HARD'

    // Every rule in one place: the same object drives the red messages and decides whether Save is allowed.
    const problems = useMemo(() => {
        const e = {}
        e.title = lengthError(f.title, { ...LIMITS.title, label: 'The name' })
        e.roundLabel = lengthError(f.roundLabel, { max: LIMITS.roundLabel.max, label: 'Round label' })
        e.description = lengthError(f.description, { max: LIMITS.description.max, label: 'Description' })
        e.instructions = lengthError(f.instructions, { max: LIMITS.instructions.max, label: 'Instructions' })
        e.passPercent = rangeError(f.settings.passPercent, { ...LIMITS.passPercent, label: 'Pass mark' })
        e.maxViolations = rangeError(f.proctoring.maxViolations, { ...LIMITS.maxViolations, label: 'Violations' })
        e.snapshotIntervalSec = rangeError(f.proctoring.snapshotIntervalSec, { ...LIMITS.snapshotIntervalSec, label: 'Snapshot interval' })
        if (!locked) {
            e.durationMinutes = rangeError(f.durationMinutes, { ...LIMITS.durationMinutes, label: 'Duration' })
            e.lateEntryMinutes = rangeError(f.lateEntryMinutes, { ...LIMITS.lateEntryMinutes, label: 'Late entry' })
            if (f.mode === 'FIXED') {
                const s = f.startAt ? new Date(f.startAt).getTime() : NaN; const en = f.endAt ? new Date(f.endAt).getTime() : NaN
                if (!f.startAt || Number.isNaN(s)) e.startAt = 'Choose when the test starts.'
                if (!f.endAt || Number.isNaN(en)) e.endAt = 'Choose when the test closes.'
                else if (!e.startAt && !e.durationMinutes && en < s + Number(f.durationMinutes) * MIN) e.endAt = 'It must close at least one full duration after it starts.'
                else if (en <= now) e.endAt = 'The closing time is already in the past.'
            } else {
                const times = f.slots.map((s) => s.startAt)
                if (!f.slots.length) e.slots = 'Add at least one time slot.'
                else if (f.slots.some((s) => !s.startAt || Number.isNaN(new Date(s.startAt).getTime()))) e.slots = 'Every slot needs a date and time.'
                else if (f.slots.some((s) => new Date(s.startAt).getTime() <= now)) e.slots = 'A slot is in the past. Change it or remove it.'
                else if (new Set(times).size !== times.length) e.slots = 'Two slots start at the same time.'
                else if (f.slots.some((s) => rangeError(s.capacity, { ...LIMITS.slotCapacity, label: 'Seats', required: false }))) e.slots = 'Fix the seat numbers.'
            }
        }
        return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
    }, [f, locked, now])
    const invalid = Object.keys(problems).length > 0

    const save = useMutation({
        mutationFn: () => {
            const body = { title: f.title.trim(), roundLabel: f.roundLabel.trim(), description: f.description.trim(), instructions: f.instructions.trim() }
            if (!locked) {
                body.settings = { ...f.settings, passPercent: Number(f.settings.passPercent) }
                body.proctoring = { ...f.proctoring, maxViolations: Number(f.proctoring.maxViolations), snapshotIntervalSec: Number(f.proctoring.snapshotIntervalSec) }
                const common = { mode: f.mode, durationMinutes: Number(f.durationMinutes), lateEntryMinutes: Number(f.lateEntryMinutes), timezone: browserTz() }
                body.schedule = f.mode === 'SLOTS'
                    ? { ...common, slots: f.slots.map((s) => ({ ...(s.id ? { id: s.id } : {}), startAt: fromLocalInput(s.startAt), capacity: s.capacity === '' ? null : Number(s.capacity) })) }
                    : { ...common, startAt: fromLocalInput(f.startAt), endAt: fromLocalInput(f.endAt) }
            }
            return oaApi.updateAssessment(a.id, body)
        },
        onSuccess: () => { setSubmitted(false); queryClient.invalidateQueries({ queryKey: ['oa'] }); toast.success('Saved.') },
        onError: (err) => { setServerErrors(err.fields || {}); toast.error(err.message) },
    })

    const shown = (key) => (submitted ? problems[key] : '') || serverErrors[key] || ''
    const attempt = (e) => { e.preventDefault(); setSubmitted(true); if (!invalid && dirty && !save.isPending) save.mutate() }
    const slotted = f.mode === 'SLOTS'

    return (
        <form onSubmit={attempt} noValidate className='grid xl:grid-cols-2 gap-6 items-start oa-stagger'>
            <div className='space-y-6'>
                <Panel title='Details'>
                    <div className='space-y-4'>
                        <TextField label='Name' value={f.title} onChange={set('title')} max={LIMITS.title.max} error={problems.title || serverErrors.title} forceError={submitted} />
                        <TextField label='Round label' hint='Optional, e.g. “Round 1 · Aptitude”.' value={f.roundLabel} onChange={set('roundLabel')} max={LIMITS.roundLabel.max} error={problems.roundLabel} forceError={submitted} />
                        <TextField textarea rows={2} label='Description' value={f.description} onChange={set('description')} max={LIMITS.description.max} error={problems.description} forceError={submitted} />
                        <TextField textarea rows={4} label='Instructions shown to students' hint='Marking scheme, allowed materials, anything they must know. A proctoring summary is added automatically.' value={f.instructions} onChange={set('instructions')} max={LIMITS.instructions.max} error={problems.instructions} forceError={submitted} />
                    </div>
                </Panel>

                <Panel title='Schedule' description={locked ? 'Locked because students have started.' : `Times use your timezone (${browserTz()}).`}>
                    <ModeChoice value={f.mode} onChange={(mode) => { setF((s) => ({ ...s, mode })); setServerErrors({}) }} disabled={locked} />
                    <fieldset disabled={locked} className='space-y-4'>
                        {slotted ? (
                            <SlotsEditor slots={f.slots} onChange={set('slots')} usage={a.slotUsage} duration={f.durationMinutes} late={f.lateEntryMinutes} disabled={locked} error={shown('slots')} forceError={submitted} now={now} />
                        ) : (
                            <div className='grid sm:grid-cols-2 gap-4'>
                                <Field label='Starts' htmlFor='a-start' error={shown('startAt')}><input id='a-start' type='datetime-local' className={`${inputClass} ${shown('startAt') ? '!border-[var(--color-danger)]' : ''}`} value={f.startAt} onChange={(e) => set('startAt')(e.target.value)} /></Field>
                                <Field label='Closes' htmlFor='a-end' error={shown('endAt')} hint='The latest anyone can still be writing.'><input id='a-end' type='datetime-local' className={`${inputClass} ${shown('endAt') ? '!border-[var(--color-danger)]' : ''}`} value={f.endAt} onChange={(e) => set('endAt')(e.target.value)} /></Field>
                            </div>
                        )}
                        <div className='grid sm:grid-cols-2 gap-4'>
                            <NumberField label='Duration' suffix='minutes' hint={`${LIMITS.durationMinutes.min} to ${LIMITS.durationMinutes.max}. Each student gets this long from when they start.`} value={f.durationMinutes} onChange={set('durationMinutes')} max={LIMITS.durationMinutes.max} error={problems.durationMinutes || serverErrors.durationMinutes} forceError={submitted} />
                            <NumberField label='Late entry' suffix='minutes' hint={`${LIMITS.lateEntryMinutes.min} to ${LIMITS.lateEntryMinutes.max}. How long after the start a student can still begin.`} value={f.lateEntryMinutes} onChange={set('lateEntryMinutes')} max={LIMITS.lateEntryMinutes.max} error={problems.lateEntryMinutes || serverErrors.lateEntryMinutes} forceError={submitted} />
                        </div>
                        {slotted && !locked && f.slots.length > 0 && !problems.slots && (
                            <p className='text-[12.5px] text-text-secondary'>First slot opens {formatDateTime(fromLocalInput(f.slots.map((s) => s.startAt).sort()[0]))}. Each student&apos;s test ends {f.durationMinutes || '…'} minutes after they start.</p>
                        )}
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
                        <div className='py-3'><NumberField label='Pass mark' suffix='%' width='w-36' hint='0 to 100' value={f.settings.passPercent} onChange={(v) => setSetting('passPercent', v)} max={LIMITS.passPercent.max} error={problems.passPercent || serverErrors.passPercent} forceError={submitted} /></div>
                    </fieldset>
                </Panel>

                <Panel title='Proctoring' description='Rules the student must accept before they can begin.'>
                    <fieldset disabled={locked}>
                        <div className='grid grid-cols-2 gap-3 mb-4' role='radiogroup' aria-label='Proctoring level'>
                            {[['HARD', 'Hard', 'Camera, screen share, full screen and face checks, all required.'], ['STANDARD', 'Standard', 'Choose which checks to require.']].map(([value, label, hint]) => (
                                <button type='button' key={value} role='radio' aria-checked={f.proctoring.level === value} onClick={() => setProct('level', value)}
                                    className={`oa-press text-left rounded-xl border-[1.5px] p-3.5 transition-all ${f.proctoring.level === value ? 'border-accent bg-accent/5 shadow-[0_6px_18px_-10px_var(--color-accent)]' : 'border-line hover:border-accent/40 hover:-translate-y-px'}`}>
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
                            <NumberField label='Violations before auto-submit' hint={`${LIMITS.maxViolations.min} to ${LIMITS.maxViolations.max}. The attempt then ends and is flagged.`} value={f.proctoring.maxViolations} onChange={(v) => setProct('maxViolations', v)} max={LIMITS.maxViolations.max} error={problems.maxViolations || serverErrors.maxViolations} forceError={submitted} />
                            <NumberField label='Webcam snapshot every' suffix='seconds' hint={`${LIMITS.snapshotIntervalSec.min} to ${LIMITS.snapshotIntervalSec.max}. Evidence you can review later.`} value={f.proctoring.snapshotIntervalSec} onChange={(v) => setProct('snapshotIntervalSec', v)} max={LIMITS.snapshotIntervalSec.max} error={problems.snapshotIntervalSec || serverErrors.snapshotIntervalSec} forceError={submitted} />
                        </div>
                    </fieldset>
                </Panel>
            </div>

            <div className='xl:col-span-2 flex items-center justify-end gap-3 sticky bottom-0 bg-bg/90 backdrop-blur py-3 -mx-1 px-1 z-[var(--z-sticky-header)]'>
                {submitted && invalid && <span role='alert' className='oa-error-in text-[12.5px] text-[var(--color-danger)]'>Fix the {Object.keys(problems).length} highlighted field{Object.keys(problems).length === 1 ? '' : 's'} to save</span>}
                {dirty && !(submitted && invalid) && <span className='text-[12.5px] text-text-secondary'>You have unsaved changes</span>}
                <Button type='button' variant='secondary' size='sm' disabled={!dirty} onClick={() => { setF(initial); setServerErrors({}); setSubmitted(false) }}>Discard</Button>
                <Button type='submit' size='sm' disabled={!dirty || save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
            </div>
        </form>
    )
}
