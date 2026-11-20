import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Wand2, X } from 'lucide-react'
import { createInterviewDrive, getQuestionBanks } from '../../api/organization/organizationApi'
import { questionBanksForRole } from '../../constants/blueCollarRoles'
import { dateInputFromToday } from '../../utils/dateOnly'
import Button from '../Button'
import Modal from '../ui/Modal'
import Skeleton from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import InterviewLanguageSettings from '../organization/InterviewLanguageSettings'
import AiQuestionDraftModal from '../organization/AiQuestionDraftModal'
import DriveDetailsFields from './DriveDetailsFields'
import { inputClass } from './oaFormat'

const MAX_QUESTIONS = 20
const FOLLOW_UP_CHOICES = [[0, 'No follow-up'], [1, 'Up to 1 follow-up'], [2, 'Up to 2 follow-ups'], [3, 'Up to 3 follow-ups']]
// The same four skills the full form starts with; the interviewer weighs them when it scores.
const DEFAULT_SKILLS = [
    { name: 'Domain Knowledge & Technical Competency', weight: 30 },
    { name: 'Problem Solving & Analytical Thinking', weight: 25 },
    { name: 'Communication & Soft Skills', weight: 25 },
    { name: 'Behavioral & Culture Fit', weight: 20 },
]
const keyOf = (q, i) => String(q.id ?? q._id ?? `${i}-${q.text}`)

/**
 * The short way to set up an AI interview: one screen, the few decisions that matter. Everything else uses sensible
 * defaults. It never holds candidates or sends anything: candidates live in the round and are sent from there. The full
 * Create Interview form stays available as "More options".
 */
export default function QuickAiInterviewModal({ prefill, onClose, onCreated, onAdvanced }) {
    const toast = useToast()
    const [title, setTitle] = useState(prefill?.title || '')
    const [details, setDetails] = useState({ department: prefill?.department || '', roleCategory: prefill?.roleCategory || '', experienceLevel: prefill?.experienceLevel || '' })
    const [language, setLanguage] = useState({ defaultLanguage: 'en', allowed: [], allowSwitch: true })
    const [passing, setPassing] = useState('60')
    const [bankId, setBankId] = useState('')
    const [own, setOwn] = useState([])                 // [{ text, topic, followUps }]: typed by hand or written by the AI
    const [followUpsByKey, setFollowUpsByKey] = useState({})   // follow-ups chosen for ready-made questions, by question key
    const [aiOpen, setAiOpen] = useState(false)
    const [draft, setDraft] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const banks = useQuery({ queryKey: ['question-banks'], queryFn: getQuestionBanks, staleTime: 60 * 1000 })
    const offered = useMemo(() => questionBanksForRole(banks.data || [], details.roleCategory).filter((b) => (b.questions || []).length), [banks.data, details.roleCategory])
    const bank = offered.find((b) => String(b._id || b.id) === bankId) || offered[0]
    const bankQuestions = useMemo(() => (bank?.questions || []).slice(0, 40), [bank])

    // Each set starts with its first few questions ticked, ready to use as they are; changes are remembered per set.
    const bankKey = String(bank?._id || bank?.id || '')
    const [pickedByBank, setPickedByBank] = useState({})
    const picked = pickedByBank[bankKey] ?? new Set(bankQuestions.slice(0, 6).map(keyOf))

    const chosenQuestions = [
        ...bankQuestions.map((q, i) => ({ q, k: keyOf(q, i) })).filter(({ k }) => picked.has(k)).map(({ q, k }) => ({ id: String(q.id ?? q._id ?? ''), text: q.text, topic: q.topic || 'General', timeLimit: q.timeLimit || 120, followUps: followUpsByKey[k] ?? 1 })),
        ...own.map((o, i) => ({ id: `own-${i + 1}`, text: o.text, topic: o.topic || 'General', timeLimit: 120, followUps: o.followUps ?? 1 })),
    ].map((q, i) => ({ ...q, id: q.id || `q-${i + 1}` }))

    const toggle = (k) => setPickedByBank((prev) => { const n = new Set(prev[bankKey] ?? picked); if (n.has(k)) n.delete(k); else n.add(k); return { ...prev, [bankKey]: n } })
    const addOwn = () => { const text = draft.trim(); if (!text || chosenQuestions.length >= MAX_QUESTIONS) return; setOwn((p) => [...p, { text: text.slice(0, 500), topic: 'General', followUps: 1 }]); setDraft('') }
    const addDrafted = (drafts) => setOwn((p) => [...p, ...drafts.slice(0, Math.max(0, MAX_QUESTIONS - chosenQuestions.length)).map((d) => ({ text: d.text.slice(0, 500), topic: d.topic || 'General', followUps: 1 }))])
    const followUpTotal = chosenQuestions.reduce((sum, q) => sum + q.followUps, 0)
    const followUpSelect = (value, onChange, label) => (
        <select aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))} className='shrink-0 bg-card border border-line rounded-lg px-2 py-1 text-[12px] text-ink outline-none focus:border-accent'>
            {FOLLOW_UP_CHOICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
    )

    const problem = !title.trim() ? 'Give the interview a name.' : !details.department.trim() || !details.roleCategory.trim() ? 'Choose the department and position.' : chosenQuestions.length === 0 ? 'Choose at least one question.' : chosenQuestions.length > MAX_QUESTIONS ? `Choose at most ${MAX_QUESTIONS} questions.` : ''

    const create = async () => {
        if (problem || saving) { setError(problem); return }
        setSaving(true); setError('')
        try {
            const drive = await createInterviewDrive({
                title: title.trim(), roleCategory: details.roleCategory.trim(), department: details.department.trim(), experienceLevel: details.experienceLevel.trim() || '1-3 yrs (Junior)',
                totalRounds: 1, roundType: 'Technical', startDate: dateInputFromToday(0), expiryDate: dateInputFromToday(30), status: 'ACTIVE',
                questionMode: 'CUSTOM', questionBankId: null, questionBankTitle: `Custom Question Set (${chosenQuestions.length} Qs)`, questions: chosenQuestions, customQuestionsList: chosenQuestions,
                skillRubrics: DEFAULT_SKILLS, passingThreshold: Math.min(100, Math.max(1, Number(passing) || 60)), enablePublicLink: true, languagePolicy: language,
                communicationSettings: { emailEnabled: false, whatsappEnabled: false, callEnabled: false, reminderEnabled: false }, candidatesCount: 0, importedCandidateList: [],
            })
            toast.success('AI interview ready.')
            onCreated(drive)
        } catch (err) { setError(err.message); setSaving(false) }
    }

    return (
        <Modal open onClose={() => !saving && !aiOpen && onClose()} title='Set up the AI interview' size='lg'
            footer={<><button type='button' className='mr-auto text-[13px] font-semibold text-text-secondary hover:text-ink' disabled={saving} onClick={onAdvanced}>More options</button><Button variant='secondary' size='sm' disabled={saving} onClick={onClose}>Cancel</Button><Button size='sm' disabled={saving || Boolean(problem)} onClick={create}>{saving ? 'Creating…' : 'Create AI interview'}</Button></>}>
            <div className='space-y-6'>
                <label className='block'><span className='text-[13px] font-bold text-ink'>Name</span>
                    <input className={`${inputClass} mt-1.5`} value={title} maxLength={140} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder='e.g. Campus Hiring 2026 · AI interview' /></label>

                <div><p className='text-[13px] font-bold text-ink mb-2'>The job</p><DriveDetailsFields value={details} onChange={(d) => { setDetails(d); setError('') }} /></div>

                <div>
                    <p className='text-[13px] font-bold text-ink'>Questions the AI will ask <span className='font-normal text-text-secondary'>({chosenQuestions.length} chosen)</span></p>
                    <p className='text-[12.5px] text-text-secondary mb-2'>It asks exactly these, in this order, and nothing else. For each question you choose how many follow-ups it may ask.</p>
                    <p role='status' className='mb-2 rounded-xl border border-line bg-bg px-3.5 py-2 text-[13px] text-text-secondary'><b className='text-ink'>{chosenQuestions.length} question{chosenQuestions.length === 1 ? '' : 's'}</b>{followUpTotal > 0 ? <> + up to <b className='text-ink'>{followUpTotal} follow-up{followUpTotal === 1 ? '' : 's'}</b> = up to <b className='text-ink'>{chosenQuestions.length + followUpTotal} in total</b></> : ' and no follow-ups'}</p>
                    {banks.isLoading ? <Skeleton className='h-24 w-full rounded-xl' /> : (
                        <>
                            {offered.length > 1 && (
                                <select aria-label='Question set' className={`${inputClass} mb-2`} value={bankId} onChange={(e) => setBankId(e.target.value)}>
                                    {offered.map((b) => <option key={b._id || b.id} value={b._id || b.id}>{b.title}</option>)}
                                </select>
                            )}
                            {bankQuestions.length === 0 ? <p className='text-[13px] text-text-secondary'>There is no ready-made set for this role yet. Write your own questions below.</p> : (
                                <ul className='max-h-56 overflow-y-auto rounded-xl border border-line divide-y divide-line'>
                                    {bankQuestions.map((q, i) => {
                                        const k = keyOf(q, i)
                                        return (
                                            <li key={k} className='flex items-start gap-2 px-3.5 py-2.5 hover:bg-black/[0.02]'><label className='flex flex-1 min-w-0 items-start gap-3 cursor-pointer'>
                                                <input type='checkbox' className='mt-1 accent-[var(--color-accent)]' checked={Boolean(picked.has(k))} onChange={() => toggle(k)} />
                                                <span className='text-[13.5px] text-ink'>{q.text}</span></label>
                                                {picked.has(k) && followUpSelect(followUpsByKey[k] ?? 1, (n) => setFollowUpsByKey((prev) => ({ ...prev, [k]: n })), 'Follow-ups for this question')}</li>
                                        )
                                    })}
                                </ul>
                            )}
                        </>
                    )}
                    {own.length > 0 && <ul className='mt-2 space-y-1.5'>{own.map((o, i) => <li key={i} className='flex items-start gap-2 text-[13.5px] text-ink bg-surface-muted rounded-lg px-3 py-2'><span className='flex-1'>{o.text}</span>{followUpSelect(o.followUps, (n) => setOwn((p) => p.map((x, j) => (j === i ? { ...x, followUps: n } : x))), 'Follow-ups for this question')}<button type='button' aria-label='Remove this question' className='text-text-secondary hover:text-[var(--color-danger)]' onClick={() => setOwn((p) => p.filter((_, j) => j !== i))}><X size={14} /></button></li>)}</ul>}
                    <div className='mt-2 flex gap-2'>
                        <input className={inputClass} value={draft} maxLength={500} placeholder='Add your own question…' onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOwn() } }} />
                        <Button size='sm' variant='secondary' disabled={!draft.trim() || chosenQuestions.length >= MAX_QUESTIONS} onClick={addOwn}><Plus size={14} /> Add</Button>
                    </div>
                    <div className='mt-2'><Button size='sm' variant='secondary' disabled={chosenQuestions.length >= MAX_QUESTIONS} onClick={() => setAiOpen(true)}><Wand2 size={14} /> Write questions with AI</Button></div>
                    <AiQuestionDraftModal open={aiOpen} onClose={() => setAiOpen(false)} topics={DEFAULT_SKILLS.map((k) => k.name)} onAdd={addDrafted} />
                </div>

                <InterviewLanguageSettings value={language} onChange={setLanguage} />

                <label className='block max-w-[180px]'><span className='text-[13px] font-bold text-ink'>Passing score</span>
                    <div className='mt-1.5 flex items-center gap-2'><input inputMode='numeric' maxLength={3} className={`${inputClass} !w-20`} value={passing} onChange={(e) => setPassing(e.target.value.replace(/\D/g, '').slice(0, 3))} /><span className='text-[13px] text-text-secondary'>%</span></div></label>

                <p className='text-[12.5px] text-text-secondary'>Nothing is sent from here and candidates are not added here. They stay in the round and are sent from there. Dates, skills and messages use standard settings; use <b>More options</b> to change them.</p>
                {error && <p role='alert' className='text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5'>{error}</p>}
            </div>
        </Modal>
    )
}
