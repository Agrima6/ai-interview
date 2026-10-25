import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../ui/Modal'
import { Button, Input, Select } from '../ui'
import { createInterviewDrive, getQuestionBanks } from '../../api/organization/organizationApi'
import { EXAM_TOPIC_OPTIONS, BRANCH_OPTIONS, EXAM_TYPE_OPTIONS, PROCTORING_OPTIONS, DEFAULT_EXAM_RUBRIC } from '../../constants/collegeOptions'

const toInput = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)

// A college exam is a single-round interview drive: pick the topic and the students' branch, a question set, the
// window students can attempt it in and the pass mark. There is no shortlisting, ranking or next round.
function CreateExamModal({ open, onClose, onCreated, questionSetsPath = '/college/question-sets' }) {
    const today = toInput(new Date())
    const initial = {
        title: '', roleCategory: 'CAMPUS_PLACEMENT', department: BRANCH_OPTIONS[0].value, roundType: 'Technical',
        interviewMode: 'VIDEO', startDate: today, expiryDate: toInput(addDays(new Date(), 14)), passingThreshold: 60, questionBankId: '',
    }
    const [form, setForm] = useState(initial)
    const [banks, setBanks] = useState([])
    const [banksLoading, setBanksLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) return
        setForm({ ...initial, startDate: toInput(new Date()), expiryDate: toInput(addDays(new Date(), 14)) })
        setError('')
        setBanksLoading(true)
        getQuestionBanks().then((res) => setBanks(Array.isArray(res) ? res : res?.items || [])).catch(() => setBanks([])).finally(() => setBanksLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

    const submit = async (e) => {
        e.preventDefault()
        if (submitting) return
        setError('')
        const start = new Date(`${form.startDate}T00:00:00`)
        const expiry = new Date(`${form.expiryDate}T00:00:00`)
        const midnight = new Date(`${toInput(new Date())}T00:00:00`)
        if (!form.title.trim()) return setError('Give the exam a name.')
        if (!form.questionBankId) return setError('Choose a question set for this exam.')
        if (start < midnight) return setError('The start date cannot be in the past.')
        if (expiry < start || (expiry - start) / 86400000 > 50) return setError('The closing date must be after the start date, within 50 days.')
        const pass = Number(form.passingThreshold)
        if (!Number.isFinite(pass) || pass < 1 || pass > 100) return setError('The pass mark must be between 1 and 100.')

        const bank = banks.find((b) => (b._id || b.id) === form.questionBankId)
        setSubmitting(true)
        try {
            const drive = await createInterviewDrive({
                title: form.title.trim(),
                roleCategory: form.roleCategory,
                department: form.department,
                experienceLevel: '0-1 yr (Fresher)',
                totalRounds: 1,
                roundType: form.roundType,
                interviewMode: form.interviewMode,
                startDate: form.startDate,
                expiryDate: form.expiryDate,
                status: 'ACTIVE',
                questionMode: 'PREBUILT',
                questionBankId: form.questionBankId,
                questionBankTitle: bank?.title || 'Question set',
                questions: bank?.questions || [],
                skillRubrics: DEFAULT_EXAM_RUBRIC,
                passingThreshold: pass,
                enablePublicLink: true,
            })
            onCreated(drive)
            onClose()
        } catch (err) {
            setError(err.message || 'Could not create the exam.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Create exam drive"
            subtitle="One exam for a group of students. Results are recorded for each student - no shortlisting."
            size="lg"
            footer={
                <div className="flex items-center justify-end gap-2 w-full">
                    <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button type="submit" form="create-exam-form" size="sm" disabled={submitting}>{submitting ? 'Creating...' : 'Create exam'}</Button>
                </div>
            }
        >
            <form id="create-exam-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-5">
                {error && <p role="alert" className="sm:col-span-2 text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
                <div className="sm:col-span-2">
                    <Input id="exam-title" label="Exam name" placeholder="e.g. Mock Placement Interview - Semester 7" value={form.title} onChange={set('title')} maxLength={120} required />
                </div>
                <Select id="exam-topic" label="Topic" value={form.roleCategory} onChange={set('roleCategory')} options={EXAM_TOPIC_OPTIONS} />
                <Select id="exam-branch" label="Branch" value={form.department} onChange={set('department')} options={BRANCH_OPTIONS} />
                <Select id="exam-type" label="Interview type" value={form.roundType} onChange={set('roundType')} options={EXAM_TYPE_OPTIONS} />
                <Select id="exam-mode" label="Proctoring" value={form.interviewMode} onChange={set('interviewMode')} options={PROCTORING_OPTIONS} />
                <Input id="exam-start" label="Opens on" type="date" min={today} value={form.startDate} onChange={set('startDate')} required />
                <Input id="exam-end" label="Closes on" type="date" min={form.startDate} value={form.expiryDate} onChange={set('expiryDate')} required />
                <Input id="exam-pass" label="Pass mark (%)" type="number" min={1} max={100} value={form.passingThreshold} onChange={set('passingThreshold')} hint="Students at or above this score pass." />
                <div>
                    <Select
                        id="exam-bank"
                        label="Question set"
                        value={form.questionBankId}
                        onChange={set('questionBankId')}
                        placeholder={banksLoading ? 'Loading question sets...' : 'Choose a question set'}
                        options={banks.map((b) => ({ value: b._id || b.id, label: `${b.title} (${b.questions?.length ?? 0} questions)` }))}
                    />
                    {!banksLoading && banks.length === 0 && (
                        <p className="text-[12.5px] text-text-secondary mt-1.5">No question sets yet. <Link to={questionSetsPath} className="text-accent font-medium hover:underline">Create one first</Link>.</p>
                    )}
                </div>
            </form>
        </Modal>
    )
}

export default CreateExamModal
