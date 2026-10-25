import React, { useMemo, useRef, useState } from 'react'
import { Upload, Download, X, UserPlus, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Input } from '../ui'
import { BRANCH_OPTIONS } from '../../constants/collegeOptions'
import {
    MAX_STUDENTS, MAX_FILE_BYTES, STUDENT_FIELDS, SAMPLE_CSV, readStudentFile, splitFile, studentsFromRows, classify, cleanStudent, problemsOf,
} from '../../utils/studentImport'

const EMPTY_FORM = { name: '', email: '', phone: '', rollNumber: '', branch: '', batch: '' }
const STATUS_STYLE = { ok: 'text-emerald-700 bg-emerald-50', invalid: 'text-red-700 bg-red-50', duplicate: 'text-amber-700 bg-amber-50' }
const STATUS_LABEL = { ok: 'Ready', invalid: 'Fix or remove', duplicate: 'Skipped' }

const downloadSample = () => {
    // The BOM makes Excel read the file as UTF-8, so names with accents survive.
    const url = URL.createObjectURL(new Blob([`\uFEFF${SAMPLE_CSV}\n`], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'students-sample.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

// Adds students to an exam three ways - typed one by one, uploaded as a CSV, or pasted - into one live review list.
// Rows with a problem or a duplicate never block the good ones: they are shown, skipped on submit, and can be removed.
// `existing` = { emails, phones, rolls } already on the exam, so duplicates are caught before anything is sent.
// The parent mounts it only while open, so every opening starts from a clean slate.
function AddStudentsModal({ open, onClose, onSubmit, submitting = false, existing }) {
    const [tab, setTab] = useState('manual')
    const [form, setForm] = useState(EMPTY_FORM)
    const [formError, setFormError] = useState('')
    const [manual, setManual] = useState([])                 // students typed in
    const [file, setFile] = useState(null)                    // { name, raw, hasHeader, mapping }
    const [paste, setPaste] = useState('')
    const [fileError, setFileError] = useState('')
    const [removed, setRemoved] = useState(() => new Set())   // ids taken off the review list
    const nameRef = useRef(null)
    const nextId = useRef(1)

    const split = useMemo(() => (file ? splitFile(file.raw, file.hasHeader) : null), [file])
    const fileStudents = useMemo(() => {
        if (!file || !split) return []
        return studentsFromRows(split.rows, file.mapping, file.hasHeader ? 2 : 1).map((s) => ({ ...s, id: `f-${s.rowNumber}`, source: `Row ${s.rowNumber}` }))
    }, [file, split])

    const reviewed = useMemo(() => {
        const all = [...manual, ...fileStudents].filter((s) => !removed.has(s.id))
        return classify(all, existing).map((s, i) => ({ ...s, id: all[i].id, source: all[i].source }))
    }, [manual, fileStudents, removed, existing])

    const ready = reviewed.filter((s) => s.status === 'ok')
    const skipped = reviewed.length - ready.length
    const tooMany = ready.length > MAX_STUDENTS
    const missingRequired = file ? STUDENT_FIELDS.filter((f) => f.required && !file.mapping.includes(f.key)) : []

    const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

    const addManual = (e) => {
        e.preventDefault()
        const student = cleanStudent(form)
        const problems = problemsOf(student)
        if (problems.length) return setFormError(`Please fix: ${problems.join(', ')}.`)
        const [checked] = classify([student], { ...mergeExisting(existing, reviewed) })
        if (checked.status === 'duplicate') return setFormError(`Not added - ${checked.reason}.`)
        setManual((list) => [...list, { ...student, id: `m-${nextId.current++}`, source: 'Typed' }])
        setForm(EMPTY_FORM)
        setFormError('')
        nameRef.current?.focus()
    }

    const loadText = (text, name) => {
        setFileError('')
        const parsed = readStudentFile(text)
        if (!parsed.raw.length) { setFile(null); return setFileError('No rows were found in that file.') }
        setFile({ name, raw: parsed.raw, hasHeader: parsed.hasHeader, mapping: parsed.mapping })
        setRemoved((r) => new Set([...r].filter((id) => !id.startsWith('f-'))))
    }

    const onFile = async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        if (/\.(xlsx|xls|numbers|ods)$/i.test(f.name)) return setFileError('Excel files are not supported. In Excel choose File > Save As > CSV (UTF-8), then upload that.')
        if (f.size > MAX_FILE_BYTES) return setFileError('That file is larger than 1 MB. Split it into smaller files.')
        try { loadText(await f.text(), f.name) } catch { setFileError('That file could not be read.') }
    }

    const setMapping = (col, key) => setFile((cur) => {
        // A field can come from one column only: choosing it again takes it away from the old column.
        const mapping = cur.mapping.map((k, i) => (i === col ? key : key && k === key ? '' : k))
        return { ...cur, mapping }
    })
    const toggleHeader = (hasHeader) => setFile((cur) => ({ ...cur, hasHeader, mapping: splitFile(cur.raw, hasHeader).mapping }))

    const submit = () => onSubmit(ready.map((s) => ({ name: s.name, email: s.email, phone: s.phone, rollNumber: s.rollNumber, branch: s.branch, batch: s.batch })))

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Add students"
            subtitle="Type them in, upload a CSV, or paste rows. Everyone is checked before anything is sent."
            size="lg"
            footer={
                <div className="flex items-center justify-between gap-3 w-full">
                    <span className="text-[12.5px] text-text-secondary" aria-live="polite">
                        {reviewed.length === 0 ? 'No students added yet' : `${ready.length} ready${skipped ? ` · ${skipped} will be skipped` : ''}`}
                        {tooMany && <span className="text-red-600"> · add at most {MAX_STUDENTS} at a time</span>}
                    </span>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
                        <Button type="button" size="sm" onClick={submit} disabled={submitting || ready.length === 0 || tooMany}>
                            {submitting ? 'Adding...' : `Add ${ready.length || ''} student${ready.length === 1 ? '' : 's'}`}
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-5">
                <div role="tablist" aria-label="How to add students" className="inline-flex p-1 rounded-full bg-black/[0.05]">
                    {[['manual', 'Add manually'], ['csv', 'Import from CSV']].map(([id, label]) => (
                        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                            className={`px-4 min-h-[36px] rounded-full text-[13.5px] font-medium transition-colors ${tab === id ? 'bg-white shadow-sm text-ink' : 'text-text-secondary hover:text-ink'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'manual' ? (
                    <form onSubmit={addManual} className="grid sm:grid-cols-2 gap-4" noValidate>
                        <Input id="stu-name" ref={nameRef} label="Name *" value={form.name} onChange={setField('name')} maxLength={100} autoComplete="off" autoFocus />
                        <Input id="stu-email" label="Email *" type="email" value={form.email} onChange={setField('email')} maxLength={254} autoComplete="off" />
                        <Input id="stu-phone" label="Phone" value={form.phone} onChange={setField('phone')} placeholder="10 digits, +91 is fine" inputMode="tel" autoComplete="off" />
                        <Input id="stu-roll" label="Roll number" value={form.rollNumber} onChange={setField('rollNumber')} maxLength={40} autoComplete="off" />
                        <Input id="stu-branch" label="Branch" value={form.branch} onChange={setField('branch')} list="stu-branches" maxLength={80} autoComplete="off" />
                        <datalist id="stu-branches">{BRANCH_OPTIONS.map((b) => <option key={b.value} value={b.value} />)}</datalist>
                        <Input id="stu-batch" label="Batch / year" value={form.batch} onChange={setField('batch')} placeholder="e.g. 2025" maxLength={40} autoComplete="off" />
                        {formError && <p role="alert" className="sm:col-span-2 text-[13px] text-red-600">{formError}</p>}
                        <div className="sm:col-span-2">
                            <Button type="submit" variant="secondary" size="sm"><UserPlus size={14} /> Add to list</Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                            <label className="inline-flex items-center gap-2 text-[13.5px] font-medium text-accent cursor-pointer min-h-[40px]">
                                <Upload size={16} aria-hidden="true" /> Upload CSV file
                                <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={onFile} />
                            </label>
                            <button type="button" onClick={downloadSample} className="inline-flex items-center gap-2 text-[13.5px] font-medium text-text-secondary hover:text-ink min-h-[40px]">
                                <Download size={16} aria-hidden="true" /> Download sample CSV
                            </button>
                        </div>
                        <details className="rounded-xl border border-line px-4 py-3 text-[13px]">
                            <summary className="cursor-pointer font-medium text-ink min-h-[32px]">What should the file look like?</summary>
                            <p className="mt-2 text-text-secondary">One student per row. Name and email are required; everything else is optional. Column names can be anything - you match them below.</p>
                            <pre className="mt-2 overflow-x-auto rounded-lg bg-black/[0.04] p-3 text-[12px] leading-relaxed">{SAMPLE_CSV}</pre>
                        </details>

                        {!file && (
                            <div className="space-y-2">
                                <label htmlFor="stu-paste" className="text-[13.5px] font-medium text-ink">Or paste rows from a spreadsheet</label>
                                <textarea id="stu-paste" value={paste} onChange={(e) => setPaste(e.target.value)} rows={4}
                                    placeholder={'Name\tEmail\tPhone\nAsha Verma\tasha@college.edu\t9876543210'}
                                    className="w-full rounded-xl border border-line bg-card p-3 font-mono text-[12.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
                                <Button type="button" variant="secondary" size="sm" disabled={!paste.trim()} onClick={() => loadText(paste, 'Pasted rows')}>Read these rows</Button>
                            </div>
                        )}

                        {fileError && <p role="alert" className="flex items-start gap-2 text-[13px] text-red-600"><AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{fileError}</p>}

                        {file && split && (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[13.5px] text-ink"><span className="font-medium">{file.name}</span> <span className="text-text-secondary">· {split.rows.length} row{split.rows.length === 1 ? '' : 's'}</span></p>
                                    <button type="button" onClick={() => { setFile(null); setPaste('') }} className="text-[13px] text-text-secondary hover:text-ink min-h-[36px]">Choose a different file</button>
                                </div>
                                <label className="flex items-center gap-2 text-[13.5px] text-ink min-h-[36px]">
                                    <input type="checkbox" checked={file.hasHeader} onChange={(e) => toggleHeader(e.target.checked)} className="w-4 h-4 accent-accent" />
                                    First row contains column names
                                </label>
                                <div className="rounded-xl border border-line overflow-hidden">
                                    <table className="w-full text-[13px]">
                                        <thead><tr className="text-left text-[11.5px] uppercase tracking-wide text-text-secondary bg-black/[0.03]">
                                            <th className="px-3 py-2 font-medium">Column in your file</th><th className="px-3 py-2 font-medium">Example</th><th className="px-3 py-2 font-medium">Use it as</th>
                                        </tr></thead>
                                        <tbody>{split.headers.map((h, col) => (
                                            <tr key={col} className="border-t border-line">
                                                <td className="px-3 py-2 font-medium text-ink">{h}</td>
                                                <td className="px-3 py-2 text-text-secondary max-w-[180px] truncate">{split.rows[0]?.[col] || '—'}</td>
                                                <td className="px-3 py-2">
                                                    <select aria-label={`What is "${h}"?`} value={file.mapping[col] || ''} onChange={(e) => setMapping(col, e.target.value)}
                                                        className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-[13px] focus:border-accent outline-none">
                                                        <option value="">Ignore this column</option>
                                                        {STUDENT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                                {missingRequired.length > 0 && (
                                    <p role="alert" className="text-[13px] text-red-600">Choose which column holds the student&apos;s {missingRequired.map((f) => f.label.toLowerCase()).join(' and ')}.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {reviewed.length > 0 && (
                    <div>
                        <h3 className="text-[13.5px] font-medium text-ink mb-2">Review ({reviewed.length})</h3>
                        <div className="rounded-xl border border-line max-h-64 overflow-auto">
                            <table className="w-full text-[12.5px]">
                                <thead className="sticky top-0 bg-card"><tr className="text-left text-[11.5px] uppercase tracking-wide text-text-secondary border-b border-line">
                                    <th className="px-3 py-2 font-medium">Student</th><th className="px-3 py-2 font-medium">Roll / branch</th><th className="px-3 py-2 font-medium">Status</th><th className="px-2 py-2"><span className="sr-only">Remove</span></th>
                                </tr></thead>
                                <tbody>{reviewed.map((s) => (
                                    <tr key={s.id} className="border-b border-line last:border-0 align-top">
                                        <td className="px-3 py-2"><p className="font-medium text-ink">{s.name || <em className="text-text-secondary">no name</em>}</p><p className="text-text-secondary">{s.email || 'no email'}{s.phone ? ` · ${s.phone}` : ''}</p></td>
                                        <td className="px-3 py-2 text-text-secondary">{[s.rollNumber, s.branch, s.batch].filter(Boolean).join(' · ') || '—'}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11.5px] font-medium ${STATUS_STYLE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                                            {s.reason && <p className="mt-0.5 text-[11.5px] text-text-secondary">{s.source}: {s.reason}</p>}
                                        </td>
                                        <td className="px-2 py-2 text-right">
                                            <button type="button" aria-label={`Remove ${s.name || 'this row'}`} onClick={() => {
                                                if (s.id.startsWith('m-')) setManual((l) => l.filter((x) => x.id !== s.id))
                                                else setRemoved((r) => new Set(r).add(s.id))
                                            }} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:bg-black/[0.05] hover:text-ink"><X size={14} /></button>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

// What the exam holds plus what is already on the review list, for checking a single typed student.
function mergeExisting(existing = {}, reviewed) {
    const emails = new Set(existing.emails || [])
    const phones = new Set(existing.phones || [])
    const rolls = new Set(existing.rolls || [])
    for (const s of reviewed) {
        if (s.status !== 'ok') continue
        emails.add(s.email)
        if (s.phone) phones.add(s.phone)
        if (s.rollNumber) rolls.add(s.rollNumber.toLowerCase())
    }
    return { emails, phones, rolls }
}

export default AddStudentsModal
