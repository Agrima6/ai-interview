import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Pencil, Upload, Library, X, Save } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Button from '../../components/Button'
import Dropdown from '../../components/Dropdown'
import AdminNav from './AdminNav'
import { Input, Textarea, Card, Modal, ModalHeader, Badge, PageHeader, EmptyState, Skeleton, TagInput, ErrorText } from './adminUi'
import {
    listQuestionBanks, getQuestionBank, createQuestionBank, updateQuestionBank,
    deleteQuestionBank, uploadQuestionBank,
} from '../../utils/conductApi'

const QUESTION_TYPES = ["HR", "Technical", "Behavioral", "System Design", "Case Study", "Group Discussion", "Managerial Round"]
const DIFFICULTIES = ["Easy", "Medium", "Hard"]
const TYPE_OPTIONS = QUESTION_TYPES.map((t) => ({ value: t, label: t }))
const DIFFICULTY_OPTIONS = DIFFICULTIES.map((d) => ({ value: d, label: d }))

const emptyQuestion = () => ({ text: '', type: 'Technical', difficulty: 'Medium', skillTags: [], expectedDurationSec: 90 })

function QuestionRow({ question, onChange, onRemove }) {
    return (
        <div className='bg-bg border border-line rounded-xl p-4 space-y-3'>
            <div className='flex items-start gap-2'>
                <Textarea rows={2} placeholder="Question text" value={question.text}
                    onChange={(e) => onChange({ ...question, text: e.target.value })} className='flex-1' />
                <button type="button" onClick={onRemove} className='mt-1 text-text-secondary hover:text-red-500 shrink-0'>
                    <Trash2 size={16} />
                </button>
            </div>
            <div className='grid sm:grid-cols-3 gap-2'>
                <Dropdown value={question.type} onChange={(v) => onChange({ ...question, type: v })} options={TYPE_OPTIONS} placeholder="Type" />
                <Dropdown value={question.difficulty} onChange={(v) => onChange({ ...question, difficulty: v })} options={DIFFICULTY_OPTIONS} placeholder="Difficulty" />
                <Input type="number" min={10} placeholder="Duration (sec)" value={question.expectedDurationSec}
                    onChange={(e) => onChange({ ...question, expectedDurationSec: e.target.value })} />
            </div>
            <TagInput tags={question.skillTags} onChange={(tags) => onChange({ ...question, skillTags: tags })} placeholder="Skill tags (e.g. React, SQL)" />
        </div>
    )
}

function BankFormModal({ bank, organizationId, onClose, onSaved }) {
    const isEdit = !!bank
    const [title, setTitle] = useState(bank?.title || '')
    const [questions, setQuestions] = useState(bank?.questions?.length ? bank.questions.map((q) => ({ ...q, skillTags: q.skillTags || [] })) : [emptyQuestion()])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const updateQuestionAt = (i, next) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? next : q)))
    const removeQuestionAt = (i) => setQuestions((qs) => qs.filter((_, idx) => idx !== i))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!title.trim()) { setError('Title is required.'); return }
        const cleanQuestions = questions.filter((q) => q.text.trim())
        if (cleanQuestions.length === 0) { setError('Add at least one question.'); return }
        setSaving(true)
        setError('')
        try {
            const payload = { title: title.trim(), questions: cleanQuestions }
            if (isEdit) await updateQuestionBank(bank._id, payload, organizationId)
            else await createQuestionBank(payload, organizationId)
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save question bank.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal onClose={onClose} maxWidth="max-w-2xl">
            <ModalHeader title={isEdit ? 'Edit Question Bank' : 'New Question Bank'} onClose={onClose} />
            <form onSubmit={handleSubmit} className='space-y-4'>
                <Input placeholder="Bank title (e.g. Backend Screening)" value={title} onChange={(e) => setTitle(e.target.value)} />

                <div className='space-y-3 max-h-[45vh] overflow-y-auto pr-1'>
                    {questions.map((q, i) => (
                        <QuestionRow key={i} question={q} onChange={(next) => updateQuestionAt(i, next)} onRemove={() => removeQuestionAt(i)} />
                    ))}
                </div>

                <button type="button" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
                    className='w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-line rounded-xl text-[13.5px] font-medium text-accent hover:bg-accent/[0.04] transition-colors'>
                    <Plus size={15} /> Add Question
                </button>

                <ErrorText>{error}</ErrorText>
                <Button type="submit" disabled={saving} className='w-full !py-2.5'>
                    {saving ? 'Saving...' : (<><Save size={15} /> Save Bank</>)}
                </Button>
            </form>
        </Modal>
    )
}

function BulkUploadModal({ organizationId, onClose, onDone }) {
    const [title, setTitle] = useState('')
    const [defaultType, setDefaultType] = useState('Technical')
    const [fileName, setFileName] = useState('')
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!title.trim()) { setError('Title is required.'); return }
        if (!file) { setError('Choose a .txt or .csv file.'); return }
        setUploading(true)
        setError('')
        try {
            await uploadQuestionBank(file, title.trim(), defaultType, organizationId)
            onDone()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload file.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <Modal onClose={onClose}>
            <ModalHeader title="Bulk Upload Questions" onClose={onClose} />
            <form onSubmit={handleUpload} className='space-y-3'>
                <Input placeholder="Bank title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Dropdown value={defaultType} onChange={setDefaultType} options={TYPE_OPTIONS} placeholder="Default question type" />

                <p className='text-[12.5px] text-text-secondary leading-relaxed'>
                    One question per line, optionally CSV-style: <span className='font-medium text-ink'>text,type,difficulty,tag1|tag2,expectedDurationSec</span>
                </p>

                <label className='border-2 border-dashed border-line rounded-2xl p-6 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/[0.03] transition-colors flex flex-col items-center gap-2'>
                    <Upload size={22} className='text-accent' />
                    <span className='text-[13.5px] text-text-secondary font-medium'>{fileName || 'Click to choose a .txt or .csv file'}</span>
                    <input type="file" accept=".csv,.txt,text/csv,text/plain" className='hidden'
                        onChange={(e) => { const f = e.target.files[0]; if (f) { setFile(f); setFileName(f.name) } }} />
                </label>

                <ErrorText>{error}</ErrorText>
                <Button type="submit" disabled={uploading} className='w-full !py-2.5'>
                    {uploading ? 'Uploading...' : 'Upload'}
                </Button>
            </form>
        </Modal>
    )
}

function QuestionBankManager() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const organizationId = searchParams.get('organizationId') || undefined

    const [banks, setBanks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [showUpload, setShowUpload] = useState(false)
    const [editingBank, setEditingBank] = useState(null)
    const [expandedId, setExpandedId] = useState(null)
    const [expandedBank, setExpandedBank] = useState(null)
    const [busyId, setBusyId] = useState(null)

    const load = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await listQuestionBanks(organizationId)
            setBanks(data)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load question banks.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [organizationId])

    const toggleExpand = async (id) => {
        if (expandedId === id) { setExpandedId(null); setExpandedBank(null); return }
        setExpandedId(id)
        try {
            const full = await getQuestionBank(id, organizationId)
            setExpandedBank(full)
        } catch {
            setExpandedBank(null)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this question bank? This cannot be undone.')) return
        setBusyId(id)
        try {
            await deleteQuestionBank(id, organizationId)
            load()
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete question bank.')
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
                        title="Question Bank Manager"
                        subtitle="Build and manage reusable pools of interview questions"
                        onBack={() => navigate('/admin')}
                        actions={
                            <>
                                <Button variant="secondary" onClick={() => setShowUpload(true)} className='!px-5'>
                                    <Upload size={16} /> Bulk Upload
                                </Button>
                                <Button onClick={() => { setEditingBank(null); setShowForm(true) }} className='!px-5'>
                                    <Plus size={16} /> New Bank
                                </Button>
                            </>
                        }
                    />

                    <AdminNav />

                    {loading ? (
                        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className='h-32' />)}
                        </div>
                    ) : error ? (
                        <p className='text-red-500 text-[14px]'>{error}</p>
                    ) : banks.length === 0 ? (
                        <EmptyState icon={Library} title="No question banks yet"
                            subtitle="Create your first question bank to start building interview templates."
                            action={<Button onClick={() => setShowForm(true)} className='mt-2'><Plus size={15} /> New Bank</Button>} />
                    ) : (
                        <div className='space-y-4'>
                            {banks.map((bank) => (
                                <Card key={bank._id} className='p-5'>
                                    <div className='flex items-start justify-between gap-4 flex-wrap'>
                                        <button onClick={() => toggleExpand(bank._id)} className='text-left flex-1 min-w-[200px]'>
                                            <p className='text-[15px] font-semibold text-ink'>{bank.title}</p>
                                            <p className='text-[12.5px] text-text-secondary mt-1'>
                                                {bank.questions?.length ?? '—'} questions &bull; created {new Date(bank.createdAt).toLocaleDateString()}
                                            </p>
                                        </button>
                                        <div className='flex items-center gap-1 shrink-0'>
                                            <button onClick={async () => { const full = await getQuestionBank(bank._id, organizationId); setEditingBank(full); setShowForm(true) }}
                                                className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-text-secondary hover:text-accent transition-colors'>
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(bank._id)} disabled={busyId === bank._id}
                                                className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-text-secondary hover:text-red-500 transition-colors'>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {expandedId === bank._id && (
                                        <div className='mt-4 pt-4 border-t border-line space-y-2'>
                                            {!expandedBank ? (
                                                <Skeleton className='h-16' />
                                            ) : expandedBank.questions.length === 0 ? (
                                                <p className='text-text-secondary text-[13px]'>No questions in this bank.</p>
                                            ) : (
                                                expandedBank.questions.map((q) => (
                                                    <div key={q._id} className='bg-bg border border-line rounded-xl p-3 flex items-start justify-between gap-3'>
                                                        <p className='text-[13.5px] text-ink flex-1'>{q.text}</p>
                                                        <div className='flex items-center gap-1.5 shrink-0'>
                                                            <Badge tone={q.difficulty}>{q.difficulty}</Badge>
                                                            <span className='text-[11.5px] text-text-secondary'>{q.type}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
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
                <BankFormModal bank={editingBank} organizationId={organizationId}
                    onClose={() => { setShowForm(false); setEditingBank(null) }}
                    onSaved={() => { setShowForm(false); setEditingBank(null); setExpandedId(null); load() }} />
            )}
            {showUpload && (
                <BulkUploadModal organizationId={organizationId}
                    onClose={() => setShowUpload(false)}
                    onDone={() => { setShowUpload(false); load() }} />
            )}
        </div>
    )
}

export default QuestionBankManager
