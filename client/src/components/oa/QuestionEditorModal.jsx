import React, { useState } from 'react'
import { Check, Plus, Search, Trash2, Video } from 'lucide-react'
import Button from '../Button'
import Modal from '../ui/Modal'
import { DIFFICULTIES, TYPE_LABELS, inputClass, sectionLabel } from './oaFormat'
import { OA_LANGUAGES, languageLabel } from './oaLanguages'
import { NumberField } from './oaFields'
import { FILTERS, LIMITS, rangeError } from './oaRules'

const DEFAULT_MARKS = { MCQ: 1, MSQ: 2, SHORT: 3, LONG: 10, CODING: 15, VIDEO: 10 }
const VIDEO_SECONDS = { min: 15, max: 300 }

const blank = (sectionId) => ({ type: 'MCQ', text: '', sectionId, marks: 1, negativeMarks: 0, difficulty: 'MEDIUM', options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], correctIdx: [], modelAnswer: '', keywords: '', codeLanguages: ['javascript', 'python'], starterCode: '', starterCodes: {}, maxDurationSec: '120', testCases: [{ input: '', expected: '', hidden: false }], explanation: '' })

const fromQuestion = (q) => ({
    ...blank(q.sectionId), ...q,
    options: q.options?.length ? q.options.map((o) => ({ id: o.id, text: o.text })) : [{ text: '' }, { text: '' }],
    correctIdx: (q.options || []).map((o, i) => (q.correct?.includes(o.id) ? i : -1)).filter((i) => i >= 0),
    keywords: (q.keywords || []).join(', '),
    // A question written before per-language starters keeps its one snippet under its first language.
    starterCodes: { ...(q.starterCode && q.codeLanguages?.[0] ? { [q.codeLanguages[0]]: q.starterCode } : {}), ...(q.starterCodes || {}) },
    maxDurationSec: String(q.maxDurationSec ?? 120),
    testCases: q.testCases?.length ? q.testCases : [{ input: '', expected: '', hidden: false }],
})

const toPayload = (f) => {
    const base = { type: f.type, text: f.text, sectionId: f.sectionId, marks: Number(f.marks), difficulty: f.difficulty, explanation: f.explanation }
    // Options and the correct answers are filled in by submit(), which names the correct ones by their text.
    if (f.type === 'MCQ' || f.type === 'MSQ') return { ...base, negativeMarks: Number(f.negativeMarks) || 0 }
    if (f.type === 'SHORT') return { ...base, modelAnswer: f.modelAnswer, keywords: f.keywords.split(',').map((k) => k.trim()).filter(Boolean) }
    if (f.type === 'LONG') return { ...base, modelAnswer: f.modelAnswer }
    if (f.type === 'VIDEO') return { ...base, maxDurationSec: Number(f.maxDurationSec) }
    const starterCodes = Object.fromEntries(f.codeLanguages.map((id) => [id, f.starterCodes[id] || '']).filter(([, code]) => code.trim()))
    return { ...base, codeLanguages: f.codeLanguages, starterCode: '', starterCodes, modelAnswer: f.modelAnswer, testCases: f.testCases.filter((t) => t.input.trim() || t.expected.trim()) }
}

// Pick any number of languages from the full list, then write an optional starter for each one picked.
function LanguagePicker({ selected, onChange, starters, onStarter }) {
    const [query, setQuery] = useState('')
    const [editing, setEditing] = useState(selected[0] || '')
    const current = selected.includes(editing) ? editing : selected[0] || ''
    const term = query.trim().toLowerCase()
    const shown = OA_LANGUAGES.filter(([id, label]) => !term || label.toLowerCase().includes(term) || id.includes(term))
    const toggle = (id) => {
        const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
        onChange(next)
        if (!selected.includes(id)) setEditing(id)
    }
    return (
        <div className='space-y-3'>
            <fieldset>
                <legend className='text-[12.5px] font-semibold text-ink mb-1.5'>Languages candidates can choose <span className='font-normal text-text-secondary'>— {selected.length} selected</span></legend>
                <div className='rounded-xl border-[1.5px] border-line overflow-hidden'>
                    <div className='relative border-b border-line'>
                        <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary' aria-hidden='true' />
                        <input value={query} onChange={(e) => setQuery(e.target.value.replace(/[^A-Za-z0-9+# /]/g, '').slice(0, 30))} placeholder='Search languages' aria-label='Search languages' className='w-full bg-transparent pl-9 pr-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-text-secondary/70' />
                    </div>
                    <div className='max-h-[168px] overflow-y-auto p-2 grid grid-cols-2 sm:grid-cols-3 gap-1'>
                        {shown.map(([id, label]) => {
                            const on = selected.includes(id)
                            return (
                                <label key={id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer transition-colors ${on ? 'bg-accent/10 text-accent font-semibold' : 'text-ink hover:bg-black/[0.04]'}`}>
                                    <input type='checkbox' className='sr-only' checked={on} onChange={() => toggle(id)} />
                                    <span className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 ${on ? 'bg-accent border-accent text-white' : 'border-line'}`}>{on && <Check size={11} strokeWidth={3} />}</span>
                                    <span className='truncate'>{label}</span>
                                </label>
                            )
                        })}
                        {!shown.length && <p className='col-span-full text-[12.5px] text-text-secondary px-2 py-3'>No language matches “{query}”.</p>}
                    </div>
                </div>
                <div className='flex flex-wrap gap-2 mt-2'>
                    <button type='button' onClick={() => onChange(OA_LANGUAGES.map(([id]) => id))} className='text-[12.5px] font-semibold text-accent'>Select all</button>
                    <button type='button' onClick={() => onChange([])} className='text-[12.5px] font-semibold text-text-secondary hover:text-ink'>Clear</button>
                </div>
            </fieldset>
            {current && (
                <div>
                    <div className='flex flex-wrap items-center justify-between gap-2 mb-1.5'>
                        <label htmlFor='starter-code' className='text-[12.5px] font-semibold text-ink'>Starter code candidates begin with</label>
                        <select aria-label='Language of the starter code' className='bg-card border-[1.5px] border-line rounded-lg px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent' value={current} onChange={(e) => setEditing(e.target.value)}>
                            {selected.map((id) => <option key={id} value={id}>{languageLabel(id)}{starters[id]?.trim() ? ' · custom' : ''}</option>)}
                        </select>
                    </div>
                    <textarea id='starter-code' rows={5} spellCheck={false} maxLength={6000} className={`${inputClass} font-mono text-[13px]`} value={starters[current] || ''} onChange={(e) => onStarter(current, e.target.value)} placeholder={`Leave empty to use the standard ${languageLabel(current)} starter.`} />
                    <p className='text-[12px] text-text-secondary mt-1'>In the test, the candidate picks a language from a dropdown and its starter appears in the editor.</p>
                </div>
            )}
        </div>
    )
}

export default function QuestionEditorModal({ open, onClose, sections, question, defaultSectionId, saving, onSave }) {
    const [f, setF] = useState(() => (question ? fromQuestion(question) : blank(defaultSectionId)))
    const [error, setError] = useState('')
    const set = (key, value) => setF((s) => ({ ...s, [key]: value }))
    const choice = f.type === 'MCQ' || f.type === 'MSQ'

    const changeType = (type) => setF((s) => ({ ...s, type, marks: question ? s.marks : DEFAULT_MARKS[type], correctIdx: type === 'MCQ' ? s.correctIdx.slice(0, 1) : s.correctIdx }))
    const toggleCorrect = (i) => setF((s) => ({ ...s, correctIdx: f.type === 'MCQ' ? [i] : s.correctIdx.includes(i) ? s.correctIdx.filter((x) => x !== i) : [...s.correctIdx, i] }))
    const setOption = (i, text) => setF((s) => ({ ...s, options: s.options.map((o, j) => (j === i ? { ...o, text } : o)) }))
    const removeOption = (i) => setF((s) => ({ ...s, options: s.options.filter((_, j) => j !== i), correctIdx: s.correctIdx.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)) }))

    const marksError = rangeError(f.marks, { ...LIMITS.marks, label: 'Marks', decimals: true })
    const negativeError = !choice ? '' : rangeError(f.negativeMarks, { min: 0, max: Math.min(Number(f.marks) || LIMITS.marks.max, LIMITS.marks.max), label: 'Negative marks', decimals: true, required: false })
    const videoError = f.type === 'VIDEO' ? rangeError(f.maxDurationSec, { ...VIDEO_SECONDS, label: 'Recording length' }) : ''
    const submit = (e) => {
        e.preventDefault()
        setError('')
        if (!f.text.trim()) return setError('Write the question.')
        if (f.text.length > LIMITS.questionText.max) return setError(`The question can be at most ${LIMITS.questionText.max} characters.`)
        if (marksError) return setError(marksError)
        if (negativeError) return setError(negativeError)
        if (choice) {
            const filled = f.options.filter((o) => o.text.trim())
            if (filled.length < LIMITS.options.min) return setError(`Give at least ${LIMITS.options.min} options.`)
            if (new Set(filled.map((o) => o.text.trim().toLowerCase())).size !== filled.length) return setError('Options must be different from each other.')
            const right = f.correctIdx.filter((i) => f.options[i]?.text.trim())
            if (!right.length) return setError('Mark the correct answer.')
            if (f.type === 'MCQ' && right.length !== 1) return setError('A single-answer question has exactly one correct option.')
        }
        if (f.type === 'CODING' && !f.codeLanguages.length) return setError('Pick at least one language.')
        if (f.type === 'VIDEO' && videoError) return setError(videoError)
        // Options are sent as plain text with the correct ones named by their text, so a re-ordered or edited list can never point at the wrong option.
        const payload = toPayload(f)
        if (choice) {
            const kept = f.options.filter((o) => o.text.trim())
            payload.options = kept.map((o) => ({ ...(o.id ? { id: o.id } : {}), text: o.text.trim() }))
            payload.correct = f.correctIdx.map((i) => f.options[i]).filter((o) => o?.text.trim()).map((o) => o.text.trim())
        }
        onSave(payload, setError)
    }

    return (
        <Modal open={open} onClose={onClose} size='lg' title={question ? 'Edit question' : 'New question'}
            footer={<><Button variant='secondary' size='sm' onClick={onClose}>Cancel</Button><Button size='sm' disabled={saving} onClick={submit}>{saving ? 'Saving…' : question ? 'Save question' : 'Add question'}</Button></>}>
            <form onSubmit={submit} className='space-y-4'>
                {error && <div role='alert' className='text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5'>{error}</div>}
                <div className='grid sm:grid-cols-3 gap-3'>
                    <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Type</span>
                        <select className={`${inputClass} mt-1.5`} value={f.type} disabled={Boolean(question)} onChange={(e) => changeType(e.target.value)}>{Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                    <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Section</span>
                        <select className={`${inputClass} mt-1.5`} value={f.sectionId} onChange={(e) => set('sectionId', e.target.value)}>{sections.map((s, i) => <option key={s.id} value={s.id}>{sectionLabel(s, i)}</option>)}</select></label>
                    <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Difficulty</span>
                        <select className={`${inputClass} mt-1.5`} value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)}>{DIFFICULTIES.map(([value, label, years]) => <option key={value} value={value}>{label} · {years} experience</option>)}</select></label>
                </div>

                <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Question</span>
                    <textarea rows={f.type === 'CODING' ? 5 : 3} className={`${inputClass} mt-1.5`} value={f.text} onChange={(e) => set('text', e.target.value)} maxLength={4000} placeholder={f.type === 'CODING' ? 'Describe the problem, the input format and the expected output.' : f.type === 'VIDEO' ? 'e.g. Tell me about yourself.' : 'Write the question'} /></label>

                <div className='grid grid-cols-2 gap-3 max-w-sm'>
                    <NumberField label='Marks' decimals hint={`${LIMITS.marks.min} to ${LIMITS.marks.max}`} value={String(f.marks)} onChange={(v) => set('marks', v)} max={LIMITS.marks.max} error={marksError} />
                    {choice && <NumberField label='Negative marks' decimals hint='For a wrong answer' value={String(f.negativeMarks)} onChange={(v) => set('negativeMarks', v)} max={LIMITS.marks.max} error={negativeError} />}
                </div>

                {f.type === 'VIDEO' && (
                    <div className='rounded-xl border border-line bg-surface-muted/60 p-4'>
                        <p className='flex items-center gap-2 text-[13.5px] font-semibold text-ink'><Video size={15} className='text-accent' /> The candidate records a video answer</p>
                        <p className='text-[12.5px] text-text-secondary mt-1 mb-3'>They see the question, record with their webcam and microphone, and can re-record before moving on. You watch it in their report and give the marks.</p>
                        <NumberField label='Longest recording' suffix='seconds' width='w-44' hint={`${VIDEO_SECONDS.min} to ${VIDEO_SECONDS.max} (120 = 2 minutes)`} value={f.maxDurationSec} onChange={(v) => set('maxDurationSec', v)} max={VIDEO_SECONDS.max} error={videoError} />
                    </div>
                )}

                {choice && (
                    <fieldset>
                        <legend className='text-[12.5px] font-semibold text-ink mb-1.5'>Options <span className='font-normal text-text-secondary'>— tick the correct {f.type === 'MCQ' ? 'one' : 'ones'}</span></legend>
                        <div className='space-y-2'>
                            {f.options.map((o, i) => (
                                <div key={i} className='flex items-center gap-2'>
                                    <input type={f.type === 'MCQ' ? 'radio' : 'checkbox'} name='correct' aria-label={`Option ${i + 1} is correct`} className='w-4 h-4 accent-[var(--color-accent)] shrink-0' checked={f.correctIdx.includes(i)} onChange={() => toggleCorrect(i)} />
                                    <input className={inputClass} value={o.text} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} maxLength={500} aria-label={`Option ${i + 1}`} />
                                    {f.options.length > 2 && <button type='button' onClick={() => removeOption(i)} aria-label={`Remove option ${i + 1}`} className='text-text-secondary hover:text-[var(--color-danger)] p-1'><Trash2 size={15} /></button>}
                                </div>
                            ))}
                        </div>
                        {f.options.length < LIMITS.options.max && <button type='button' onClick={() => set('options', [...f.options, { text: '' }])} className='mt-2 text-[12.5px] font-semibold text-accent inline-flex items-center gap-1'><Plus size={13} /> Add option</button>}
                    </fieldset>
                )}

                {f.type === 'SHORT' && (
                    <>
                        <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Keywords for automatic scoring</span>
                            <input className={`${inputClass} mt-1.5`} value={f.keywords} onChange={(e) => set('keywords', FILTERS.keywords(e.target.value))} maxLength={300} placeholder='index, lookup, speed' />
                            <span className='block text-[12px] text-text-secondary mt-1'>Comma separated. Marks are split across the keywords found; you can always change a score when reviewing. Leave empty to grade by hand.</span></label>
                        <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Model answer (only you see this)</span><textarea rows={2} maxLength={6000} className={`${inputClass} mt-1.5`} value={f.modelAnswer} onChange={(e) => set('modelAnswer', e.target.value)} /></label>
                    </>
                )}
                {f.type === 'LONG' && <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Model answer or marking guide (only you see this)</span><textarea rows={4} maxLength={6000} className={`${inputClass} mt-1.5`} value={f.modelAnswer} onChange={(e) => set('modelAnswer', e.target.value)} /><span className='block text-[12px] text-text-secondary mt-1'>Long answers are graded by hand in the results.</span></label>}

                {f.type === 'CODING' && (
                    <>
                        <LanguagePicker selected={f.codeLanguages} onChange={(next) => set('codeLanguages', next)} starters={f.starterCodes} onStarter={(id, code) => set('starterCodes', { ...f.starterCodes, [id]: code })} />
                        <fieldset><legend className='text-[12.5px] font-semibold text-ink mb-1.5'>Test cases <span className='font-normal text-text-secondary'>— for your reference when grading; shown to candidates unless hidden</span></legend>
                            <div className='space-y-2'>{f.testCases.map((t, i) => (
                                <div key={i} className='grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center'>
                                    <input className={`${inputClass} font-mono text-[13px]`} placeholder='Input' maxLength={2000} aria-label={`Test case ${i + 1} input`} value={t.input} onChange={(e) => set('testCases', f.testCases.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)))} />
                                    <input className={`${inputClass} font-mono text-[13px]`} placeholder='Expected output' maxLength={2000} aria-label={`Test case ${i + 1} expected output`} value={t.expected} onChange={(e) => set('testCases', f.testCases.map((x, j) => (j === i ? { ...x, expected: e.target.value } : x)))} />
                                    <label className='text-[12px] text-text-secondary flex items-center gap-1'><input type='checkbox' checked={t.hidden} onChange={(e) => set('testCases', f.testCases.map((x, j) => (j === i ? { ...x, hidden: e.target.checked } : x)))} /> Hidden</label>
                                    <button type='button' aria-label={`Remove test case ${i + 1}`} onClick={() => set('testCases', f.testCases.filter((_, j) => j !== i))} className='text-text-secondary hover:text-[var(--color-danger)] p-1'><Trash2 size={15} /></button>
                                </div>))}</div>
                            <button type='button' onClick={() => set('testCases', [...f.testCases, { input: '', expected: '', hidden: false }])} className='mt-2 text-[12.5px] font-semibold text-accent inline-flex items-center gap-1'><Plus size={13} /> Add test case</button></fieldset>
                        <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Reference solution (only you see this)</span><textarea rows={4} spellCheck={false} maxLength={6000} className={`${inputClass} mt-1.5 font-mono text-[13px]`} value={f.modelAnswer} onChange={(e) => set('modelAnswer', e.target.value)} /></label>
                    </>
                )}
                {(choice) && <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Explanation (optional, only you see this)</span><input className={`${inputClass} mt-1.5`} value={f.explanation} onChange={(e) => set('explanation', e.target.value)} maxLength={2000} /></label>}
            </form>
        </Modal>
    )
}
