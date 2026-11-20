import React, { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Download, FileUp, Loader2, Pencil, Plus, RefreshCw, Sparkles, Trash2, TriangleAlert, Wand2 } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import { parseCsv } from '../../utils/csvRows'
import Badge from '../ui/Badge'
import Button from '../Button'
import ConfirmModal from '../ui/ConfirmModal'
import EmptyState from '../ui/EmptyState'
import Modal from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { Panel } from './oaUi'
import { DIFFICULTIES, TYPE_LABELS, difficultyLabel, downloadText, inputClass, sectionLabel } from './oaFormat'
import { OA_LANGUAGES, languageLabel } from './oaLanguages'
import { NumberField, TextField } from './oaFields'
import { FILTERS, LIMITS, lengthError, rangeError } from './oaRules'
import QuestionEditorModal from './QuestionEditorModal'
import useAiInterviews from '../../hooks/useAiInterviews'

const TEMPLATE = [
    'section,type,question,optionA,optionB,optionC,optionD,correct,marks,negative,keywords,answer,difficulty',
    'Section 1,MCQ,"What is 15% of 200?",20,25,30,35,C,2,0.5,,,EASY',
    'Section 1,MSQ,"Which are prime numbers?",2,4,5,9,"A;C",3,1,,,MEDIUM',
    'Section 1,SHORT,"Define a database index.",,,,,,4,0,"lookup;speed","An index speeds up lookups",MEDIUM',
    'Section 1,LONG,"Explain normalisation with an example.",,,,,,10,0,,"Marking guide here",HARD',
    'Section 1,CODING,"Read two integers and print their sum.",,,,,,20,0,,,MEDIUM',
    'Section 1,VIDEO,"Tell me about yourself.",,,,,,10,0,,,EASY',
].join('\n')

// Turns uploaded rows (CSV columns or JSON objects) into the shape the API takes. Anything unreadable is left for
// the server to reject with a row number, rather than being guessed at here.
const rowToQuestion = (row, sections, fallbackSectionId) => {
    const get = (...keys) => { for (const k of keys) { const v = row[k] ?? row[k.toLowerCase()]; if (v !== undefined && String(v).trim() !== '') return String(v).trim() } return '' }
    const sectionName = get('section')
    const numbered = /^(?:section\s*)?(\d{1,2})$/i.exec(sectionName)
    const section = sections.find((s) => s.title && s.title.toLowerCase() === sectionName.toLowerCase()) || (numbered ? sections[Number(numbered[1]) - 1] : undefined)
    const options = ['optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'optionF'].map((k) => get(k)).filter(Boolean)
    return {
        sectionId: section?.id || fallbackSectionId, type: get('type').toUpperCase(), text: get('question', 'text'),
        options, correct: get('correct'), marks: get('marks') || undefined, negativeMarks: get('negative', 'negativeMarks') || undefined,
        keywords: get('keywords'), modelAnswer: get('answer', 'modelAnswer'), difficulty: get('difficulty'),
    }
}

const readFileRows = async (file, sections, fallbackSectionId) => {
    const text = await file.text()
    if (/\.json$/i.test(file.name)) {
        const parsed = JSON.parse(text)
        return (Array.isArray(parsed) ? parsed : parsed.questions || []).map((q) => ({ sectionId: fallbackSectionId, ...q }))
    }
    const { rows } = parseCsv(text)
    if (rows.length < 2) return []
    const header = rows[0].map((h) => h.replace(/\s+/g, '').toLowerCase())
    return rows.slice(1).map((cells) => {
        const row = {}
        header.forEach((h, i) => { row[h] = cells[i] })
        return rowToQuestion(row, sections, fallbackSectionId)
    })
}

function UploadModal({ open, onClose, assessment, onDone }) {
    const toast = useToast()
    const input = useRef(null)
    const [rows, setRows] = useState(null)
    const [name, setName] = useState('')
    const [sectionId, setSectionId] = useState(assessment.sections[0]?.id)
    const [problem, setProblem] = useState('')
    const [rejected, setRejected] = useState([])

    const pick = async (file) => {
        if (!file) return
        setProblem(''); setRejected([])
        try { setRows(await readFileRows(file, assessment.sections, sectionId)); setName(file.name) } catch { setRows(null); setProblem('That file could not be read. Use the template: a CSV, or a JSON list of questions.') }
    }
    const upload = useMutation({
        mutationFn: () => oaApi.addQuestions(assessment.id, { questions: rows.map((r) => ({ ...r, sectionId: r.sectionId || sectionId })), source: 'UPLOAD', sectionId }),
        onSuccess: (r) => {
            // The good rows are in now: drop them so a second click cannot add them twice.
            if (r.rejected.length) { setRows(null); setName(''); setRejected(r.rejected); toast.warning(`${r.added} added, ${r.rejected.length} row(s) need fixing.`); onDone() } else { toast.success(`${r.added} questions added.`); onDone(); onClose() }
        },
        onError: (err) => { setProblem(err.message); setRejected(err.fields?.rows || []) },
    })

    return (
        <Modal open={open} onClose={onClose} title='Upload questions' size='lg'
            footer={<><Button variant='secondary' size='sm' onClick={onClose}>Close</Button><Button size='sm' disabled={!rows?.length || upload.isPending} onClick={() => upload.mutate()}>{upload.isPending ? 'Uploading…' : `Add ${rows?.length || ''} questions`}</Button></>}>
            <div className='space-y-4'>
                <p className='text-[13.5px] text-text-secondary'>Upload a CSV or JSON file and the questions are added exactly as written. Every row is checked, and the ones with problems are listed so you can fix and re-upload just those.</p>
                <div className='flex flex-wrap gap-2'>
                    <Button size='sm' variant='secondary' onClick={() => downloadText('questions-template.csv', TEMPLATE)}><Download size={14} /> Download template</Button>
                    <Button size='sm' variant='secondary' onClick={() => input.current?.click()}><FileUp size={14} /> Choose file</Button>
                    <input ref={input} type='file' accept='.csv,.json,text/csv,application/json' className='sr-only' aria-label='Choose a questions file' onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
                </div>
                <label className='block max-w-xs'><span className='text-[12.5px] font-semibold text-ink'>Rows with no section go to</span>
                    <select className={`${inputClass} mt-1.5`} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>{assessment.sections.map((s, i) => <option key={s.id} value={s.id}>{sectionLabel(s, i)}</option>)}</select></label>
                {problem && <div role='alert' className='text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5'>{problem}</div>}
                {rows && !rows.length && <p className='text-[13px] text-text-secondary'>No questions found in {name}.</p>}
                {rows?.length > 0 && (
                    <div className='border border-line rounded-xl overflow-hidden'>
                        <div className='px-4 py-2.5 bg-surface-muted text-[13px] font-semibold'>{name}: {rows.length} question{rows.length === 1 ? '' : 's'} found</div>
                        <ul className='max-h-48 overflow-y-auto divide-y divide-line text-[13px]'>
                            {rows.slice(0, 50).map((r, i) => <li key={i} className='px-4 py-2 flex gap-2'><span className='text-text-secondary w-6 shrink-0'>{i + 1}</span><Badge variant='neutral'>{r.type || '?'}</Badge><span className='truncate'>{r.text}</span></li>)}
                        </ul>
                    </div>
                )}
                {rejected.length > 0 && (
                    <div role='alert' className='border border-[var(--color-danger)]/30 rounded-xl overflow-hidden'>
                        <div className='px-4 py-2.5 bg-[var(--color-danger-soft)] text-[13px] font-semibold text-[var(--color-danger)]'>{rejected.length} row(s) were not added</div>
                        <ul className='max-h-40 overflow-y-auto divide-y divide-line text-[13px]'>{rejected.map((r) => <li key={r.row} className='px-4 py-2'>Row {r.row}: {r.error}</li>)}</ul>
                    </div>
                )}
            </div>
        </Modal>
    )
}

// Asks the server to make one tiny call to the AI provider, so the organizer sees whether drafting really works
// (and why not) before typing a brief.
function AiConnection({ status }) {
    if (status.isPending || status.isFetching) return <div role='status' className='mb-4 flex items-center gap-2 text-[13px] text-text-secondary bg-surface-muted rounded-xl px-3.5 py-2.5'><Loader2 size={15} className='animate-spin' /> Checking the AI connection…</div>
    const d = status.data
    // When everything works there is nothing to say: the banner appears only when AI is not available.
    if (d?.ok) return null
    const message = status.isError ? status.error.message : d?.configured ? d.message || 'The AI service did not answer.' : 'No AI key is set on the server. Add OA_AI_API_KEY (or GROQ_API_KEY) to the client-service .env and restart it.'
    return (
        <div role='alert' className='mb-4 flex items-start gap-2.5 text-[13px] bg-[var(--color-warning-soft)] text-[var(--color-warning)] rounded-xl px-3.5 py-2.5'>
            <TriangleAlert size={15} className='mt-0.5 shrink-0' />
            <div className='min-w-0 flex-1'>
                <p className='font-semibold'>AI drafting is not working right now</p>
                <p className='break-words'>{message}</p>
                <p className='mt-1 text-text-secondary'>You can still write questions or upload a file.</p>
            </div>
            <button type='button' onClick={() => status.refetch()} className='shrink-0 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline'><RefreshCw size={13} /> Check again</button>
        </div>
    )
}

function AiModal({ open, onClose, assessment, onDone }) {
    const toast = useToast()
    const status = useQuery({ queryKey: ['oa', 'ai-status'], queryFn: oaApi.aiStatus, retry: false, staleTime: 60_000 })
    const aiAvailable = Boolean(status.data?.ok)
    const [f, setF] = useState({ prompt: '', count: '8', types: ['MCQ'], difficulty: 'MEDIUM', sectionId: assessment.sections[0]?.id, codeLanguages: ['javascript', 'python'] })
    const countError = rangeError(f.count, { ...LIMITS.aiCount, label: 'Number of questions' })
    const promptError = lengthError(f.prompt, { ...LIMITS.aiPrompt, label: 'The description' })
    const [drafts, setDrafts] = useState(null)
    const [picked, setPicked] = useState(new Set())
    const [error, setError] = useState('')

    const generate = useMutation({
        mutationFn: () => oaApi.generateQuestions(assessment.id, { ...f, count: Number(f.count) }),
        onSuccess: (r) => { setDrafts(r.questions); setPicked(new Set(r.questions.map((q) => q.id))); setError('') },
        onError: (err) => setError(err.message),
    })
    const add = useMutation({
        mutationFn: () => oaApi.addQuestions(assessment.id, { questions: drafts.filter((q) => picked.has(q.id)).map((q) => ({ ...q, correct: q.correct.map((id) => q.options.find((o) => o.id === id)?.text ?? id) })), source: 'AI', sectionId: f.sectionId }),
        onSuccess: (r) => { toast.success(`${r.added} questions added.`); onDone(); onClose() },
        onError: (err) => setError(err.message),
    })
    const toggleLanguage = (id) => setF((s) => ({ ...s, codeLanguages: s.codeLanguages.includes(id) ? s.codeLanguages.filter((x) => x !== id) : [...s.codeLanguages, id] }))
    const needsLanguage = f.types.includes('CODING') && f.codeLanguages.length === 0
    const toggleType = (t) => setF((s) => ({ ...s, types: s.types.includes(t) ? s.types.filter((x) => x !== t) : [...s.types, t] }))

    return (
        <Modal open={open} onClose={onClose} title='Generate questions with AI' size='lg'
            footer={drafts
                ? <><Button variant='secondary' size='sm' onClick={() => setDrafts(null)}>Back</Button><Button size='sm' disabled={!picked.size || add.isPending} onClick={() => add.mutate()}>{add.isPending ? 'Adding…' : `Add ${picked.size} selected`}</Button></>
                : <><Button variant='secondary' size='sm' onClick={onClose}>Cancel</Button><Button size='sm' disabled={!aiAvailable || Boolean(promptError) || Boolean(countError) || !f.types.length || needsLanguage || generate.isPending} onClick={() => generate.mutate()}><Wand2 size={14} /> {generate.isPending ? 'Writing questions…' : 'Generate'}</Button></>}>
            {!drafts && <AiConnection status={status} />}
            {error && <div role='alert' className='mb-4 text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5'>{error}</div>}
            {!drafts ? (
                <div className='space-y-4'>
                    <TextField textarea rows={4} label='What should the questions cover?' hint={`At least ${LIMITS.aiPrompt.min} characters. Name the topic, level and skills to test.`} value={f.prompt} onChange={(v) => setF({ ...f, prompt: v })} max={LIMITS.aiPrompt.max} error={promptError} placeholder='e.g. Core Java for freshers: OOP, collections, exceptions and basic multithreading. Practical, scenario-based.' />
                    <div className='grid sm:grid-cols-3 gap-3'>
                        <NumberField label='How many' hint={`${LIMITS.aiCount.min} to ${LIMITS.aiCount.max}`} value={f.count} onChange={(v) => setF({ ...f, count: v })} max={LIMITS.aiCount.max} error={countError} />
                        <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Difficulty</span><select className={`${inputClass} mt-1.5`} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>{DIFFICULTIES.map(([value, label, years]) => <option key={value} value={value}>{label} · {years}</option>)}</select></label>
                        <label className='block'><span className='text-[12.5px] font-semibold text-ink'>Add to section</span><select className={`${inputClass} mt-1.5`} value={f.sectionId} onChange={(e) => setF({ ...f, sectionId: e.target.value })}>{assessment.sections.map((s, i) => <option key={s.id} value={s.id}>{sectionLabel(s, i)}</option>)}</select></label>
                    </div>
                    <fieldset><legend className='text-[12.5px] font-semibold text-ink mb-1.5'>Question types</legend>
                        <div className='flex flex-wrap gap-2'>{Object.entries(TYPE_LABELS).filter(([t]) => t !== 'VIDEO').map(([t, l]) => (
                            <label key={t} className={`px-3 py-1.5 rounded-full border text-[12.5px] font-medium cursor-pointer ${f.types.includes(t) ? 'border-accent bg-accent/10 text-accent' : 'border-line text-text-secondary'}`}>
                                <input type='checkbox' className='sr-only' checked={f.types.includes(t)} onChange={() => toggleType(t)} />{l}</label>))}</div></fieldset>
                    {f.types.includes('CODING') && (
                        <fieldset><legend className='text-[12.5px] font-semibold text-ink mb-1.5'>Programming languages for coding questions <span className='font-normal text-text-secondary'>— {f.codeLanguages.length} selected</span></legend>
                            <div className='flex flex-wrap gap-2'>{OA_LANGUAGES.map(([id, label]) => (
                                <label key={id} className={`px-3 py-1.5 rounded-full border text-[12.5px] font-medium cursor-pointer ${f.codeLanguages.includes(id) ? 'border-accent bg-accent/10 text-accent' : 'border-line text-text-secondary hover:border-accent/40'}`}>
                                    <input type='checkbox' className='sr-only' checked={f.codeLanguages.includes(id)} onChange={() => toggleLanguage(id)} />{label}</label>))}</div>
                            {needsLanguage && <p role='alert' className='text-[12px] text-[var(--color-danger)] mt-1.5'>Choose at least one language.</p>}
                            <p className='text-[12px] text-text-secondary mt-1.5'>The questions are written for these languages, and candidates can pick any of them in the test.</p></fieldset>
                    )}
                    <p className='text-[12.5px] text-text-secondary'>You review every question before it is added. AI can be wrong, so check the answers.</p>
                </div>
            ) : (
                <div className='space-y-3'>
                    <p className='text-[13px] text-text-secondary'>Untick any you do not want. The correct answer is marked so you can check it.</p>
                    <ul className='space-y-2.5'>
                        {drafts.map((q) => (
                            <li key={q.id} className='border border-line rounded-xl p-3.5'>
                                <label className='flex gap-3 cursor-pointer'>
                                    <input type='checkbox' className='mt-1 w-4 h-4 accent-[var(--color-accent)]' checked={picked.has(q.id)} onChange={() => setPicked((s) => { const n = new Set(s); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n })} />
                                    <span className='min-w-0'>
                                        <span className='flex gap-1.5 mb-1'><Badge variant='brand'>{TYPE_LABELS[q.type]}</Badge><Badge variant='neutral'>{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge></span>
                                        <span className='block text-[13.5px] font-medium text-ink'>{q.text}</span>
                                        {q.options.length > 0 && <ul className='mt-1.5 text-[13px] space-y-0.5'>{q.options.map((o) => <li key={o.id} className={q.correct.includes(o.id) ? 'text-[var(--color-success)] font-semibold' : 'text-text-secondary'}>{q.correct.includes(o.id) ? '✓ ' : '• '}{o.text}</li>)}</ul>}
                                        {q.type === 'CODING' && q.codeLanguages?.length > 0 && <span className='block mt-1.5 text-[12.5px] text-text-secondary'>Languages: {q.codeLanguages.map(languageLabel).join(', ')}</span>}
                                        {q.modelAnswer && <span className='block mt-1.5 text-[12.5px] text-text-secondary'>Model answer: {q.modelAnswer.slice(0, 200)}</span>}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Modal>
    )
}

// The AI interview is the last item of the paper, so HR sees the whole order: sections, then the interview.
function AiInterviewLastRow({ assessment: a }) {
    const { options } = useAiInterviews()
    if (!a.aiPart?.enabled || a.aiPart.when === 'AFTER_REVIEW') return null
    const title = options.find((o) => o.id === a.aiPart.aiInterviewDriveId)?.title
    return (
        <div className='mt-6 flex items-center gap-3 rounded-2xl border-2 border-accent bg-accent/[0.05] px-5 py-4' aria-label='The AI interview comes last'>
            <span className='w-9 h-9 shrink-0 rounded-xl bg-accent text-white flex items-center justify-center' aria-hidden='true'><Bot size={18} strokeWidth={1.8} /></span>
            <div className='min-w-0'>
                <p className='text-[14px] font-bold text-ink'>Last: AI interview{title ? ` · ${title}` : ''}</p>
                <p className='text-[12.5px] text-text-secondary'>After the last question above, candidates go straight into it on the same screen.</p>
            </div>
        </div>
    )
}

export default function QuestionsTab({ assessment: a }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [editing, setEditing] = useState(null)     // null | { question?, sectionId }
    const [upload, setUpload] = useState(false)
    const [ai, setAi] = useState(false)
    const [removing, setRemoving] = useState(null)
    const [renaming, setRenaming] = useState(null)
    const [dropping, setDropping] = useState(null)
    const locked = a.locked
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['oa'] })

    const bySection = useMemo(() => a.sections.map((s) => ({ ...s, questions: a.questions.filter((q) => q.sectionId === s.id) })), [a])

    const save = useMutation({
        mutationFn: ({ payload, id }) => (id ? oaApi.updateQuestion(a.id, id, payload) : oaApi.addQuestions(a.id, { questions: [payload], sectionId: payload.sectionId })),
        onSuccess: (_, { id }) => { refresh(); setEditing(null); toast.success(id ? 'Question saved.' : 'Question added.') },
    })
    const remove = useMutation({
        mutationFn: (id) => oaApi.deleteQuestion(a.id, id),
        onSuccess: () => { refresh(); setRemoving(null); toast.success('Question deleted.') },
        onError: (err) => { setRemoving(null); toast.error(err.message) },
    })
    const sections = useMutation({
        mutationFn: (next) => oaApi.updateAssessment(a.id, { sections: next }),
        onSuccess: () => { refresh(); setRenaming(null) },
        onError: (err) => toast.error(err.message),
    })

    return (
        <>
            <div className='flex flex-wrap items-center justify-between gap-3 mb-5'>
                <p className='text-[13.5px] text-text-secondary'>{a.questionCount} question{a.questionCount === 1 ? '' : 's'} · {a.totalMarks} marks in total · {a.sections.length} section{a.sections.length === 1 ? '' : 's'}</p>
                <div className='flex flex-wrap gap-2'>
                    <Button size='sm' variant='secondary' disabled={locked || sections.isPending || a.sections.length >= 12} onClick={() => sections.mutate([...a.sections, { title: '' }])}><Plus size={14} /> Add section</Button>
                    <Button size='sm' variant='secondary' disabled={locked} onClick={() => setAi(true)}><Sparkles size={14} /> Generate with AI</Button>
                    <Button size='sm' variant='secondary' disabled={locked} onClick={() => setUpload(true)}><FileUp size={14} /> Upload file</Button>
                    <Button size='sm' disabled={locked} onClick={() => setEditing({ sectionId: a.sections[0].id })}><Plus size={14} /> Write a question</Button>
                </div>
            </div>

            {a.questionCount === 0 && (
                <div className='bg-card border border-line rounded-2xl mb-6'>
                    <EmptyState compact title='No questions yet' description='Write them yourself, upload a CSV, or describe a topic and let AI draft them for you to review.' actionLabel='Write a question' onAction={() => setEditing({ sectionId: a.sections[0].id })} />
                </div>
            )}

            <div className='space-y-6'>
                {bySection.map((s, index) => (
                    <Panel key={s.id} title={sectionLabel(s, index)} description={`${s.questions.length} question${s.questions.length === 1 ? '' : 's'}`}
                        actions={!locked && <div className='flex gap-1'>
                            <button className='text-[12.5px] font-semibold text-text-secondary hover:text-ink px-2 py-1' onClick={() => setRenaming({ id: s.id, number: index + 1, title: s.title || '' })}>{s.title ? 'Rename' : 'Name it'}</button>
                            {a.sections.length > 1 && <button className='text-[12.5px] font-semibold text-text-secondary hover:text-[var(--color-danger)] px-2 py-1' disabled={sections.isPending} onClick={() => (s.questions.length ? setDropping({ ...s, index }) : sections.mutate(a.sections.filter((x) => x.id !== s.id)))}>Delete</button>}
                        </div>} bodyClassName='!p-0'>
                        {s.questions.length === 0 ? <p className='px-5 py-4 text-[13px] text-text-secondary'>Nothing in this section yet.</p> : (
                            <ol className='divide-y divide-line'>
                                {s.questions.map((q, i) => (
                                    <li key={q.id} className='flex items-start gap-3 px-5 py-3.5'>
                                        <span className='w-6 text-[12.5px] text-text-secondary pt-0.5 tabular-nums'>{i + 1}</span>
                                        <div className='min-w-0 flex-1'>
                                            <p className='text-[14px] text-ink break-words'>{q.text}</p>
                                            <div className='flex flex-wrap items-center gap-1.5 mt-1.5'>
                                                <Badge variant='brand'>{TYPE_LABELS[q.type]}</Badge>
                                                <Badge variant='neutral'>{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
                                                <Badge variant='neutral'>{difficultyLabel(q.difficulty)}</Badge>
                                                {q.source !== 'MANUAL' && <Badge variant='info'>{q.source === 'AI' ? 'AI drafted' : 'Uploaded'}</Badge>}
                                            </div>
                                        </div>
                                        {!locked && <div className='flex shrink-0'>
                                            <button aria-label='Edit question' className='p-2 text-text-secondary hover:text-ink' onClick={() => setEditing({ question: q, sectionId: q.sectionId })}><Pencil size={15} /></button>
                                            <button aria-label='Delete question' className='p-2 text-text-secondary hover:text-[var(--color-danger)]' onClick={() => setRemoving(q)}><Trash2 size={15} /></button>
                                        </div>}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Panel>
                ))}
            </div>
            <AiInterviewLastRow assessment={a} />
            {!locked && a.sections.length < 12 && (
                <button className='mt-4 text-[13px] font-semibold text-accent inline-flex items-center gap-1.5' onClick={() => sections.mutate([...a.sections, { title: '' }])} disabled={sections.isPending}><Plus size={14} /> Add a section</button>
            )}

            {editing && <QuestionEditorModal key={editing.question?.id || 'new'} open sections={a.sections} question={editing.question} defaultSectionId={editing.sectionId} saving={save.isPending} onClose={() => setEditing(null)}
                onSave={(payload, showError) => save.mutate({ payload, id: editing.question?.id }, { onError: (err) => showError(err.message) })} />}
            {upload && <UploadModal key='upload' open assessment={a} onClose={() => setUpload(false)} onDone={refresh} />}
            {ai && <AiModal key='ai' open assessment={a} onClose={() => setAi(false)} onDone={refresh} />}

            <ConfirmModal open={Boolean(removing)} onClose={() => setRemoving(null)} danger title='Delete this question?' confirmLabel='Delete' onConfirm={() => remove.mutateAsync(removing.id)}>
                “{removing?.text?.slice(0, 120)}” will be removed from this round.
            </ConfirmModal>
            <ConfirmModal open={Boolean(dropping)} onClose={() => setDropping(null)} danger title={`Delete ${dropping ? sectionLabel(dropping, dropping.index) : 'this section'}?`} confirmLabel='Delete section'
                onConfirm={() => sections.mutateAsync(a.sections.filter((x) => x.id !== dropping.id)).finally(() => setDropping(null))}>
                Its {dropping?.questions.length} question{dropping?.questions.length === 1 ? '' : 's'} will be deleted with it.
            </ConfirmModal>
            <Modal open={Boolean(renaming)} onClose={() => setRenaming(null)} title={`Name Section ${renaming?.number || ''}`} size='sm'
                footer={<><Button variant='secondary' size='sm' onClick={() => setRenaming(null)}>Cancel</Button><Button size='sm' disabled={sections.isPending} onClick={() => sections.mutate(a.sections.map((x) => (x.id === renaming.id ? { ...x, title: renaming.title.trim() } : x)))}>{sections.isPending ? 'Saving…' : 'Save'}</Button></>}>
                <TextField label='Name (optional)' hint={`Candidates see “Section ${renaming?.number || 1}${renaming?.title.trim() ? ` · ${renaming.title.trim()}` : ''}”. Leave empty to show only the number.`} value={renaming?.title || ''} onChange={(v) => setRenaming({ ...renaming, title: v })} max={LIMITS.sectionTitle.max} filter={FILTERS.title} placeholder='e.g. Aptitude' />
            </Modal>
        </>
    )
}
