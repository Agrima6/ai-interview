import React, { useState } from 'react'
import { Upload, FileText, Check, Edit2, ArrowRight, Download, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Input, Select, Badge } from '../ui'
import { parseCsv, downloadCsv } from '../../utils/candidateCsv'

const SAMPLE_HEADERS = ['Candidate Name', 'Email Address', 'Phone Number', 'Experience (Years)']
const SAMPLE_ROWS = [
    { 'Candidate Name': 'Aarav Sharma', 'Email Address': 'aarav.sharma@example.com', 'Phone Number': '+91-9876543210', 'Experience (Years)': '4' },
    { 'Candidate Name': 'Priya Patel', 'Email Address': 'priya.patel@example.com', 'Phone Number': '+91-9812345678', 'Experience (Years)': '3' },
]

const FIELD_LABELS = { nameHeader: 'Full Name', emailHeader: 'Email Address', phoneHeader: 'Phone Number', expHeader: 'Years Experience' }

// Guesses the likely source column for each candidate field from the
// uploaded file's actual headers, so the mapping step starts pre-filled
// instead of forcing the admin to map four columns by hand every time.
const guessMapping = (headers) => {
    const find = (patterns) => headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p))) || ''
    return {
        nameHeader: find(['name']),
        emailHeader: find(['email']),
        phoneHeader: find(['phone', 'mobile', 'contact']),
        expHeader: find(['exp']),
    }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Loose on purpose - candidate phone numbers arrive in every country/
// formatting convention (spaces, dashes, parens, leading +). This only
// rejects things that clearly aren't a phone number (letters, too short).
const PHONE_RE = /^\+?[\d\s\-()]{7,18}$/
// Accepts "4", "4.5", "4 years", "4yrs" etc. - whatever an admin's
// spreadsheet happens to use - but rejects free text that isn't a number
// at all (e.g. "Senior").
const EXPERIENCE_RE = /^\d+(\.\d+)?\s*(yrs?|years?)?$/i

// Returns { severity: 'VALID' | 'WARNING' | 'INVALID', issues: string[] }.
// INVALID rows (missing required field, or a duplicate email within this
// file) are excluded from import; WARNING rows (optional-field formatting
// issues) still import, just flagged for the admin to review.
const validateRow = ({ name, email, phone, exp }, seenEmails) => {
    const issues = []
    if (!name?.trim()) issues.push({ text: 'Empty Name Field', severity: 'INVALID' })
    if (!email || !EMAIL_RE.test(email)) issues.push({ text: 'Missing/invalid Email', severity: 'INVALID' })
    else if (seenEmails.has(email)) issues.push({ text: 'Duplicate email in this file', severity: 'INVALID' })
    if (phone?.trim() && !PHONE_RE.test(phone.trim())) issues.push({ text: 'Invalid phone number', severity: 'WARNING' })
    if (exp?.trim() && !EXPERIENCE_RE.test(exp.trim())) issues.push({ text: 'Invalid experience value', severity: 'WARNING' })

    const severity = issues.some((i) => i.severity === 'INVALID') ? 'INVALID' : issues.length ? 'WARNING' : 'VALID'
    return { severity, issues }
}

function CandidateImportModal({ open, onClose, onImportComplete }) {
    const [step, setStep] = useState(1) // 1: Upload, 2: Map Headers, 3: Verify & Fix
    const [fileName, setFileName] = useState('')
    const [headers, setHeaders] = useState([])
    const [records, setRecords] = useState([])
    const [parseError, setParseError] = useState('')
    const [mapping, setMapping] = useState({ nameHeader: '', emailHeader: '', phoneHeader: '', expHeader: '' })
    const [candidateRows, setCandidateRows] = useState([])
    const [editingRow, setEditingRow] = useState(null)

    const reset = () => {
        setStep(1); setFileName(''); setHeaders([]); setRecords([]); setParseError('')
        setMapping({ nameHeader: '', emailHeader: '', phoneHeader: '', expHeader: '' }); setCandidateRows([])
    }

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setParseError('')
        const reader = new FileReader()
        reader.onload = (event) => {
            const { headers: parsedHeaders, records: parsedRecords } = parseCsv(String(event.target.result))
            if (parsedHeaders.length === 0 || parsedRecords.length === 0) {
                setParseError('Could not find any data rows in this file. Make sure it has a header row and at least one candidate row.')
                return
            }
            setFileName(file.name)
            setHeaders(parsedHeaders)
            setRecords(parsedRecords)
            setMapping(guessMapping(parsedHeaders))
        }
        reader.onerror = () => setParseError('Could not read this file.')
        reader.readAsText(file)
    }

    const buildRowsFromMapping = () => {
        const seenEmails = new Set()
        const rows = records.map((record, i) => {
            const name = (mapping.nameHeader ? record[mapping.nameHeader] : '')?.trim() || ''
            const email = (mapping.emailHeader ? record[mapping.emailHeader] : '').toLowerCase().trim()
            const phone = (mapping.phoneHeader ? record[mapping.phoneHeader] : '')?.trim() || ''
            const exp = (mapping.expHeader ? record[mapping.expHeader] : '')?.trim() || ''

            const { severity, issues } = validateRow({ name, email, phone, exp }, seenEmails)
            if (email) seenEmails.add(email)
            return { row: i + 2, name, email, phone, exp, status: severity, issues }
        })
        setCandidateRows(rows)
    }

    const goToVerify = () => { buildRowsFromMapping(); setStep(3) }

    const handleFixRowSave = (rowNum, updatedData) => {
        setCandidateRows((prev) => {
            const seenEmails = new Set(prev.filter((r) => r.row !== rowNum && r.email).map((r) => r.email.toLowerCase()))
            return prev.map((r) => {
                if (r.row !== rowNum) return r
                const name = (updatedData.name || '').trim()
                const email = (updatedData.email || '').toLowerCase().trim()
                const phone = (updatedData.phone || '').trim()
                const exp = (updatedData.exp || '').trim()
                const { severity, issues } = validateRow({ name, email, phone, exp }, seenEmails)
                return { ...r, name, email, phone, exp, status: severity, issues }
            })
        })
        setEditingRow(null)
    }

    const validCount = candidateRows.filter((r) => r.status === 'VALID').length
    const warningCount = candidateRows.filter((r) => r.status === 'WARNING').length
    const invalidCount = candidateRows.filter((r) => r.status === 'INVALID').length
    const totalCount = candidateRows.length
    const mappingComplete = mapping.nameHeader && mapping.emailHeader

    const handleFinishImport = () => {
        // Warnings are flagged, not blocking - only rows missing a required
        // field or duplicating another row's email are excluded.
        const importableCandidates = candidateRows.filter((r) => r.status !== 'INVALID')
        onImportComplete(importableCandidates)
        onClose()
        reset()
    }

    const handleClose = () => { onClose(); reset() }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Import Candidate Spreadsheet & Data Mapping"
            size="xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
                        Cancel
                    </Button>

                    {step === 1 && (
                        <Button type="button" size="sm" onClick={() => setStep(2)} disabled={!records.length}>
                            Next: Map Headers <ArrowRight size={14} />
                        </Button>
                    )}

                    {step === 2 && (
                        <Button type="button" size="sm" onClick={goToVerify} disabled={!mappingComplete}>
                            Next: Verify Rows <ArrowRight size={14} />
                        </Button>
                    )}

                    {step === 3 && (
                        <Button type="button" size="sm" onClick={handleFinishImport} disabled={validCount + warningCount === 0}>
                            <Check size={14} /> Finish Import ({validCount + warningCount}/{totalCount})
                        </Button>
                    )}
                </div>
            }
        >
            {/* Stepper Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-line">
                {[
                    { num: 1, label: '1. Upload CSV' },
                    { num: 2, label: '2. Map Headers' },
                    { num: 3, label: '3. Verification & Errors' },
                ].map((s) => (
                    <div key={s.num} className="flex items-center gap-2">
                        <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${
                                step === s.num
                                    ? 'bg-accent text-white shadow-sm'
                                    : step > s.num
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-black/[0.05] dark:bg-white/[0.08] text-text-secondary'
                            }`}
                        >
                            {s.num}
                        </div>
                        <span className={`text-[13px] font-medium ${step === s.num ? 'text-ink font-semibold' : 'text-text-secondary'}`}>
                            {s.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Step 1: Upload Candidate Spreadsheet */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-line rounded-2xl p-8 text-center bg-black/[0.01] dark:bg-white/[0.02] hover:border-accent transition-colors">
                        <Upload size={32} className="text-accent mx-auto mb-3" />
                        <h3 className="text-[15px] font-bold text-ink mb-1">Upload Candidate Spreadsheet</h3>
                        <p className="text-[13px] text-text-secondary mb-4">Drag and drop your candidate CSV file here or browse files.</p>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white font-semibold text-[13px] hover:bg-accent-dark transition-colors">
                            <FileText size={15} /> Select CSV File
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>

                    {parseError && (
                        <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-[13px] flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {parseError}
                        </div>
                    )}

                    {fileName && (
                        <div className="p-3.5 rounded-xl border border-line bg-card flex items-center justify-between">
                            <span className="text-[13px] font-medium text-ink flex items-center gap-2">
                                <FileText size={16} className="text-accent" /> {fileName}
                            </span>
                            <Badge variant="info">{records.length} Rows Detected</Badge>
                        </div>
                    )}

                    <div className="p-4 rounded-xl border border-line bg-black/[0.02] dark:bg-white/[0.04]">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[13px] font-semibold text-ink">Not sure of the format?</p>
                            <Button
                                type="button" size="xs" variant="secondary"
                                onClick={() => downloadCsv('candidate_import_template.csv', SAMPLE_HEADERS, SAMPLE_ROWS)}
                            >
                                <Download size={12} /> Download Sample CSV
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[12px]">
                                <thead className="text-text-secondary font-semibold">
                                    <tr>{SAMPLE_HEADERS.map((h) => <th key={h} className="py-1.5 pr-4">{h}</th>)}</tr>
                                </thead>
                                <tbody className="text-ink">
                                    {SAMPLE_ROWS.map((r, i) => (
                                        <tr key={i}>{SAMPLE_HEADERS.map((h) => <td key={h} className="py-1 pr-4 font-mono">{r[h]}</td>)}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[11.5px] text-text-secondary mt-2">Column names don't need to match exactly - you'll map them to the right fields next.</p>
                    </div>
                </div>
            )}

            {/* Step 2: Map CSV Headers to System Fields */}
            {step === 2 && (
                <div className="space-y-5">
                    <div>
                        <h3 className="text-[14.5px] font-bold text-ink mb-1">Map CSV Headers to System Fields</h3>
                        <p className="text-[12.5px] text-text-secondary">We detected these columns in <strong>{fileName}</strong> - match each one to a candidate field (Name and Email are required).</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        {Object.entries(FIELD_LABELS).map(([field, label]) => (
                            <Select
                                key={field}
                                label={`${label} Column${field === 'nameHeader' || field === 'emailHeader' ? ' *' : ''}`}
                                value={mapping[field]}
                                onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                                options={[{ value: '', label: '— Not in file —' }, ...headers.map((h) => ({ value: h, label: h }))]}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Verification & Errors List */}
            {step === 3 && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-[14.5px] font-bold text-ink">Import Preview</h3>
                            <p className="text-[12.5px] text-text-secondary">Review spreadsheet validation results and fix formatting errors inline.</p>
                        </div>
                        <div className="flex items-center gap-2 text-[12.5px] font-bold">
                            <span className="flex items-center gap-1 text-[var(--color-success)] bg-[var(--color-success-soft)] px-2.5 py-1 rounded-lg">
                                <Check size={13} /> {validCount} valid
                            </span>
                            <span className="flex items-center gap-1 text-[var(--color-warning)] bg-[var(--color-warning-soft)] px-2.5 py-1 rounded-lg">
                                <AlertCircle size={13} /> {warningCount} warnings
                            </span>
                            <span className="flex items-center gap-1 text-[var(--color-danger)] bg-[var(--color-danger-soft)] px-2.5 py-1 rounded-lg">
                                <AlertCircle size={13} /> {invalidCount} invalid
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-line rounded-xl">
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-black/[0.02] dark:bg-white/[0.04] border-b border-line text-[12px] font-semibold text-text-secondary">
                                <tr>
                                    <th className="py-2.5 px-3">Row</th>
                                    <th className="py-2.5 px-3">Candidate Name</th>
                                    <th className="py-2.5 px-3">Email Address</th>
                                    <th className="py-2.5 px-3">Phone</th>
                                    <th className="py-2.5 px-3">Experience</th>
                                    <th className="py-2.5 px-3">Status / Validation</th>
                                    <th className="py-2.5 px-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {candidateRows.map((row) => (
                                    <tr key={row.row} className="hover:bg-black/[0.015]">
                                        <td className="py-3 px-3 font-mono text-[12px] text-text-secondary">Row {row.row}</td>
                                        <td className="py-3 px-3 font-semibold text-ink">{row.name || <span className="text-red-500 italic">[Empty]</span>}</td>
                                        <td className="py-3 px-3 font-mono text-[12.5px]">{row.email}</td>
                                        <td className="py-3 px-3 text-text-secondary">{row.phone}</td>
                                        <td className="py-3 px-3 text-text-secondary">{row.exp || '—'}</td>
                                        <td className="py-3 px-3">
                                            {row.status === 'VALID' && <Badge variant="success">Verified</Badge>}
                                            {row.issues.map((issue, i) => (
                                                <Badge key={i} variant={issue.severity === 'INVALID' ? 'danger' : 'warning'} className="mr-1 mb-1">
                                                    {issue.text}
                                                </Badge>
                                            ))}
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            {row.status !== 'VALID' && (
                                                <Button
                                                    size="xs"
                                                    variant="secondary"
                                                    onClick={() => setEditingRow(row)}
                                                    className="text-accent hover:bg-accent/10 border-accent/30"
                                                >
                                                    <Edit2 size={12} /> Fix Row
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit Inline Row Modal */}
            {editingRow && (
                <Modal
                    open={Boolean(editingRow)}
                    onClose={() => setEditingRow(null)}
                    title={`Fix Candidate Row #${editingRow.row}`}
                    size="sm"
                    footer={
                        <div className="flex justify-end gap-2 w-full">
                            <Button size="sm" variant="secondary" onClick={() => setEditingRow(null)}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleFixRowSave(editingRow.row, editingRow)}>
                                <Check size={14} /> Update Row
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-3">
                        <Input
                            label="Candidate Name"
                            value={editingRow.name}
                            onChange={(e) => setEditingRow({ ...editingRow, name: e.target.value })}
                        />
                        <Input
                            label="Email Address"
                            value={editingRow.email}
                            onChange={(e) => setEditingRow({ ...editingRow, email: e.target.value })}
                        />
                        <Input
                            label="Phone Number"
                            value={editingRow.phone}
                            onChange={(e) => setEditingRow({ ...editingRow, phone: e.target.value })}
                        />
                        <Input
                            label="Experience"
                            placeholder="e.g. 4 or 4 years"
                            value={editingRow.exp}
                            onChange={(e) => setEditingRow({ ...editingRow, exp: e.target.value })}
                        />
                    </div>
                </Modal>
            )}
        </Modal>
    )
}

export default CandidateImportModal
