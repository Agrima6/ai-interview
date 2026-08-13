import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Pencil, ListChecks, ChevronUp, ChevronDown, Save, GripVertical } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Button from '../../components/Button'
import Dropdown from '../../components/Dropdown'
import AdminNav from './AdminNav'
import { Input, Textarea, Card, Modal, ModalHeader, Badge, PageHeader, EmptyState, Skeleton, ErrorText, TagInput } from './adminUi'
import {
    listInterviewTemplates, getInterviewTemplate, createInterviewTemplate,
    updateInterviewTemplate, deleteInterviewTemplate, listQuestionBanks,
} from '../../utils/conductApi'

const ROUND_TYPES = ["HR", "Technical", "Behavioral", "System Design", "Case Study", "Group Discussion", "Managerial Round"]
const ROUND_TYPE_OPTIONS = ROUND_TYPES.map((t) => ({ value: t, label: t }))
const SOURCE_OPTIONS = [
    { value: 'bank', label: 'From Question Bank' },
    { value: 'ai-generated', label: 'AI Generated' },
    { value: 'manual', label: 'Manual' },
]
const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"].map((d) => ({ value: d, label: d }))

const emptyRound = () => ({
    name: '', type: 'Technical', questionSource: 'bank', questionBankId: '', numQuestions: 5,
    timeLimitPerQuestionSec: 90, manualQuestions: [], aiGenerationConfig: { role: '', experience: '', skills: [] },
})

function ManualQuestionEditor({ questions, onChange }) {
    const update = (i, next) => onChange(questions.map((q, idx) => (idx === i ? next : q)))
    const remove = (i) => onChange(questions.filter((_, idx) => idx !== i))
    return (
        <div className='space-y-2'>
            {questions.map((q, i) => (
                <div key={i} className='bg-card border border-line rounded-xl p-3 space-y-2'>
                    <div className='flex items-start gap-2'>
                        <Textarea rows={2} placeholder="Question text" value={q.text} onChange={(e) => update(i, { ...q, text: e.target.value })} className='flex-1' />
                        <button type="button" onClick={() => remove(i)} className='mt-1 text-text-secondary hover:text-red-500 shrink-0'><Trash2 size={15} /></button>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                        <Dropdown value={q.difficulty} onChange={(v) => update(i, { ...q, difficulty: v })} options={DIFFICULTY_OPTIONS} placeholder="Difficulty" />
                        <Input type="number" min={10} placeholder="Time limit (sec)" value={q.timeLimitSec} onChange={(e) => update(i, { ...q, timeLimitSec: e.target.value })} />
                    </div>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...questions, { text: '', difficulty: 'Medium', timeLimitSec: 90 }])}
                className='w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-line rounded-xl text-[13px] font-medium text-accent hover:bg-accent/[0.04] transition-colors'>
                <Plus size={14} /> Add Question
            </button>
        </div>
    )
}

function RoundEditor({ round, index, total, banks, onChange, onRemove, onMove }) {
    return (
        <Card className='p-4'>
            <div className='flex items-start gap-3'>
                <div className='flex flex-col items-center gap-1 pt-1.5 text-text-secondary shrink-0'>
                    <GripVertical size={15} />
                    <span className='text-[11px] font-semibold'>{index + 1}</span>
                </div>
                <div className='flex-1 space-y-3'>
                    <div className='grid sm:grid-cols-2 gap-2'>
                        <Input placeholder="Round name (e.g. Technical Deep Dive)" value={round.name} onChange={(e) => onChange({ ...round, name: e.target.value })} />
                        <Dropdown value={round.type} onChange={(v) => onChange({ ...round, type: v })} options={ROUND_TYPE_OPTIONS} placeholder="Round type" />
                    </div>

                    <div className='flex gap-2'>
                        {SOURCE_OPTIONS.map((opt) => (
                            <button key={opt.value} type="button" onClick={() => onChange({ ...round, questionSource: opt.value })}
                                className={`flex-1 px-3 py-2 rounded-xl text-[12.5px] font-medium border transition-colors ${
                                    round.questionSource === opt.value ? 'bg-accent text-white border-accent' : 'bg-card border-line text-text-secondary hover:text-ink'
                                }`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {round.questionSource === 'bank' && (
                        <div className='space-y-2'>
                            <Dropdown value={round.questionBankId} onChange={(v) => onChange({ ...round, questionBankId: v })}
                                options={banks.map((b) => ({ value: b._id, label: b.title }))} placeholder={banks.length ? 'Select question bank' : 'No banks available - create one first'} />
                            <div>
                                <label className='text-[12px] text-text-secondary'>Number of questions: {round.numQuestions}</label>
                                <input type="range" min={1} max={20} value={round.numQuestions}
                                    onChange={(e) => onChange({ ...round, numQuestions: Number(e.target.value) })} className='w-full accent-accent' />
                            </div>
                        </div>
                    )}

                    {round.questionSource === 'manual' && (
                        <ManualQuestionEditor questions={round.manualQuestions} onChange={(qs) => onChange({ ...round, manualQuestions: qs })} />
                    )}

                    {round.questionSource === 'ai-generated' && (
                        <div className='space-y-2'>
                            <Input placeholder="Role (e.g. Backend Engineer)" value={round.aiGenerationConfig.role}
                                onChange={(e) => onChange({ ...round, aiGenerationConfig: { ...round.aiGenerationConfig, role: e.target.value } })} />
                            <Input placeholder="Experience level (e.g. 3 years)" value={round.aiGenerationConfig.experience}
                                onChange={(e) => onChange({ ...round, aiGenerationConfig: { ...round.aiGenerationConfig, experience: e.target.value } })} />
                            <TagInput tags={round.aiGenerationConfig.skills} placeholder="Skills to focus on"
                                onChange={(skills) => onChange({ ...round, aiGenerationConfig: { ...round.aiGenerationConfig, skills } })} />
                            <div>
                                <label className='text-[12px] text-text-secondary'>Number of questions: {round.numQuestions}</label>
                                <input type="range" min={1} max={20} value={round.numQuestions}
                                    onChange={(e) => onChange({ ...round, numQuestions: Number(e.target.value) })} className='w-full accent-accent' />
                            </div>
                        </div>
                    )}

                    <Input type="number" min={10} placeholder="Time limit per question (sec)" value={round.timeLimitPerQuestionSec}
                        onChange={(e) => onChange({ ...round, timeLimitPerQuestionSec: e.target.value })} />
                </div>
                <div className='flex flex-col gap-1 shrink-0'>
                    <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className='w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-accent disabled:opacity-30 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'><ChevronUp size={14} /></button>
                    <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className='w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-accent disabled:opacity-30 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'><ChevronDown size={14} /></button>
                    <button type="button" onClick={onRemove} className='w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-red-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'><Trash2 size={14} /></button>
                </div>
            </div>
        </Card>
    )
}

function TemplateFormModal({ template, organizationId, banks, onClose, onSaved }) {
    const isEdit = !!template
    const [title, setTitle] = useState(template?.title || '')
    const [description, setDescription] = useState(template?.description || '')
    const [defaultMode, setDefaultMode] = useState(template?.defaultMode || 'real')
    const [rounds, setRounds] = useState(
        template?.rounds?.length
            ? template.rounds.map((r) => ({
                ...r,
                questionBankId: r.questionBankId?._id || r.questionBankId || '',
                aiGenerationConfig: r.aiGenerationConfig || { role: '', experience: '', skills: [] },
                manualQuestions: r.manualQuestions || [],
            }))
            : [emptyRound()]
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const updateRoundAt = (i, next) => setRounds((rs) => rs.map((r, idx) => (idx === i ? next : r)))
    const removeRoundAt = (i) => setRounds((rs) => rs.filter((_, idx) => idx !== i))
    const moveRoundAt = (i, dir) => setRounds((rs) => {
        const next = [...rs]
        const target = i + dir
        if (target < 0 || target >= next.length) return rs
        ;[next[i], next[target]] = [next[target], next[i]]
        return next
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!title.trim()) { setError('Title is required.'); return }
        if (rounds.length === 0) { setError('Add at least one round.'); return }
        for (const r of rounds) {
            if (!r.name.trim()) { setError('Every round needs a name.'); return }
            if (r.questionSource === 'bank' && !r.questionBankId) { setError(`Round "${r.name}" needs a question bank selected.`); return }
            if (r.questionSource === 'manual' && r.manualQuestions.filter((q) => q.text.trim()).length === 0) { setError(`Round "${r.name}" needs at least one manual question.`); return }
            if (r.questionSource === 'ai-generated' && !r.aiGenerationConfig.role.trim()) { setError(`Round "${r.name}" needs a role for AI generation.`); return }
        }
        setSaving(true)
        setError('')
        try {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                defaultMode,
                rounds: rounds.map((r) => ({
                    ...r,
                    manualQuestions: r.manualQuestions.filter((q) => q.text.trim()),
                })),
            }
            if (isEdit) await updateInterviewTemplate(template._id, payload, organizationId)
            else await createInterviewTemplate(payload, organizationId)
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save template.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal onClose={onClose} maxWidth="max-w-3xl">
            <ModalHeader title={isEdit ? 'Edit Interview Template' : 'New Interview Template'} onClose={onClose} />
            <form onSubmit={handleSubmit} className='space-y-4'>
                <Input placeholder="Template title (e.g. Senior Backend Loop)" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea rows={2} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />

                <div className='flex gap-2'>
                    {['practice', 'real'].map((m) => (
                        <button key={m} type="button" onClick={() => setDefaultMode(m)}
                            className={`flex-1 px-3 py-2.5 rounded-xl text-[13px] font-medium border capitalize transition-colors ${
                                defaultMode === m ? 'bg-accent text-white border-accent' : 'bg-card border-line text-text-secondary hover:text-ink'
                            }`}>
                            {m} mode
                        </button>
                    ))}
                </div>

                <div className='space-y-3 max-h-[45vh] overflow-y-auto pr-1'>
                    {rounds.map((round, i) => (
                        <RoundEditor key={i} round={round} index={i} total={rounds.length} banks={banks}
                            onChange={(next) => updateRoundAt(i, next)} onRemove={() => removeRoundAt(i)} onMove={(dir) => moveRoundAt(i, dir)} />
                    ))}
                </div>

                <button type="button" onClick={() => setRounds((rs) => [...rs, emptyRound()])}
                    className='w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-line rounded-xl text-[13.5px] font-medium text-accent hover:bg-accent/[0.04] transition-colors'>
                    <Plus size={15} /> Add Round
                </button>

                <ErrorText>{error}</ErrorText>
                <Button type="submit" disabled={saving} className='w-full !py-2.5'>
                    {saving ? 'Saving...' : (<><Save size={15} /> Save Template</>)}
                </Button>
            </form>
        </Modal>
    )
}

function TemplateBuilder() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const organizationId = searchParams.get('organizationId') || undefined

    const [templates, setTemplates] = useState([])
    const [banks, setBanks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [busyId, setBusyId] = useState(null)

    const load = async () => {
        setLoading(true)
        setError('')
        try {
            const [t, b] = await Promise.all([listInterviewTemplates(organizationId), listQuestionBanks(organizationId)])
            setTemplates(t)
            setBanks(b)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load templates.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [organizationId])

    const handleEdit = async (id) => {
        try {
            const full = await getInterviewTemplate(id, organizationId)
            setEditingTemplate(full)
            setShowForm(true)
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to load template.')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this interview template? This cannot be undone.')) return
        setBusyId(id)
        try {
            await deleteInterviewTemplate(id, organizationId)
            load()
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete template.')
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className='min-h-screen bg-bg flex flex-col'>
            <Navbar />
            <div className='flex-1 bg-noise'>
                <div className='max-w-[1280px] mx-auto px-6 py-16'>
                    <PageHeader
                        title="Interview Template Builder"
                        subtitle="Compose multi-round interview flows from question banks, AI-generated or manual questions"
                        onBack={() => navigate('/admin')}
                        actions={<Button onClick={() => { setEditingTemplate(null); setShowForm(true) }} className='!px-5'><Plus size={16} /> New Template</Button>}
                    />

                    <AdminNav />

                    {loading ? (
                        <div className='grid md:grid-cols-2 gap-4'>
                            {[...Array(2)].map((_, i) => <Skeleton key={i} className='h-32' />)}
                        </div>
                    ) : error ? (
                        <p className='text-red-500 text-[14px]'>{error}</p>
                    ) : templates.length === 0 ? (
                        <EmptyState icon={ListChecks} title="No interview templates yet"
                            subtitle="Create a template to define the rounds a candidate will go through."
                            action={<Button onClick={() => setShowForm(true)} className='mt-2'><Plus size={15} /> New Template</Button>} />
                    ) : (
                        <div className='grid md:grid-cols-2 gap-4'>
                            {templates.map((tpl) => (
                                <Card key={tpl._id} className='p-5'>
                                    <div className='flex items-start justify-between gap-3'>
                                        <div>
                                            <div className='flex items-center gap-2 flex-wrap'>
                                                <p className='text-[15px] font-semibold text-ink'>{tpl.title}</p>
                                                <Badge tone={tpl.isActive ? 'active' : 'inactive'}>{tpl.isActive ? 'Active' : 'Inactive'}</Badge>
                                            </div>
                                            {tpl.description && <p className='text-[13px] text-text-secondary mt-1'>{tpl.description}</p>}
                                            <p className='text-[12.5px] text-text-secondary mt-2'>
                                                {tpl.rounds?.length || 0} round{tpl.rounds?.length === 1 ? '' : 's'} &bull; {tpl.defaultMode} mode
                                            </p>
                                        </div>
                                        <div className='flex items-center gap-1 shrink-0'>
                                            <button onClick={() => handleEdit(tpl._id)} className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-text-secondary hover:text-accent transition-colors'>
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(tpl._id)} disabled={busyId === tpl._id} className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-text-secondary hover:text-red-500 transition-colors'>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {tpl.rounds?.length > 0 && (
                                        <div className='mt-3 pt-3 border-t border-line flex flex-wrap gap-1.5'>
                                            {tpl.rounds.map((r, i) => (
                                                <span key={i} className='text-[11.5px] px-2 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-text-secondary'>
                                                    {i + 1}. {r.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Footer />

            {showForm && (
                <TemplateFormModal template={editingTemplate} organizationId={organizationId} banks={banks}
                    onClose={() => { setShowForm(false); setEditingTemplate(null) }}
                    onSaved={() => { setShowForm(false); setEditingTemplate(null); load() }} />
            )}
        </div>
    )
}

export default TemplateBuilder
