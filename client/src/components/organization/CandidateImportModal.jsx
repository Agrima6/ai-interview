import React, { useState } from 'react'
import { Upload, FileText, Check, Edit2, ArrowRight, Download, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Input, Select, Badge } from '../ui'
import { parseCsv, downloadCsv } from '../../utils/candidateCsv'
import { CANDIDATE_FIELDS, CANDIDATE_SAMPLE_ROWS, guessCandidateMapping, validateCandidateRecord } from '../../constants/candidateSchema'

const SAMPLE_HEADERS = CANDIDATE_FIELDS.map((f) => f.label)
const EMPTY_MAPPING = Object.fromEntries(CANDIDATE_FIELDS.map((f) => [`${f.key}Header`, '']))

// Reads every schema field out of one parsed CSV record using the current
// column mapping - the only place that turns "a row + a mapping" into "a
// candidate object", so import and the Fix Row editor can't drift apart.
const extractRecord = (source, mapping) =>
    Object.fromEntries(CANDIDATE_FIELDS.map((f) => {
        const raw = mapping[`${f.key}Header`] ? source[mapping[`${f.key}Header`]] : (source[f.key] ?? '')
        const value = (raw || '').trim()
        return [f.key, f.type === 'email' ? value.toLowerCase() : value]
    }))

function CandidateImportModal({ open, onClose, onImportComplete }) {
    const [step, setStep] = useState(1) // 1: Upload, 2: Map Headers, 3: Verify & Fix
    const [fileName, setFileName] = useState('')
    const [headers, setHeaders] = useState([])
    const [records, setRecords] = useState([])
    const [parseError, setParseError] = useState('')
    const [mapping, setMapping] = useState(EMPTY_MAPPING)
    const [candidateRows, setCandidateRows] = useState([])
    const [editingRow, setEditingRow] = useState(null)

    const reset = () => {
        setStep(1); setFileName(''); setHeaders([]); setRecords([]); setParseError('')
        setMapping(EMPTY_MAPPING); setCandidateRows([])
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
            setMapping(guessCandidateMapping(parsedHeaders))
        }
        reader.onerror = () => setParseError('Could not read this file.')
        reader.readAsText(file)
    }

    const buildRowsFromMapping = () => {
        const seenEmails = new Set()
        const rows = records.map((source, i) => {
            const candidate = extractRecord(source, mapping)
            const { severity, issues } = validateCandidateRecord(candidate, seenEmails)
            if (candidate.email) seenEmails.add(candidate.email)
            return { row: i + 2, ...candidate, status: severity, issues }
        })
        setCandidateRows(rows)
    }

    const goToVerify = () => { buildRowsFromMapping(); setStep(3) }

    const handleFixRowSave = (rowNum, updatedData) => {
        setCandidateRows((prev) => {
            const seenEmails = new Set(prev.filter((r) => r.row !== rowNum && r.email).map((r) => r.email.toLowerCase()))
            return prev.map((r) => {
                if (r.row !== rowNum) return r
                const candidate = extractRecord(updatedData, {}) // updatedData is already keyed by field, not header
                const { severity, issues } = validateCandidateRecord(candidate, seenEmails)
                return { ...r, ...candidate, status: severity, issues }
            })
        })
        setEditingRow(null)
    }

    const validCount = candidateRows.filter((r) => r.status === 'VALID').length
    const warningCount = candidateRows.filter((r) => r.status === 'WARNING').length
    const invalidCount = candidateRows.filter((r) => r.status === 'INVALID').length
    const totalCount = candidateRows.length
    const mappingComplete = CANDIDATE_FIELDS.filter((f) => f.required).every((f) => mapping[`${f.key}Header`])

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
                                onClick={() => downloadCsv('candidate_import_template.csv', SAMPLE_HEADERS, CANDIDATE_SAMPLE_ROWS)}
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
                                    {CANDIDATE_SAMPLE_ROWS.map((r, i) => (
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
                        <p className="text-[12.5px] text-text-secondary">
                            We detected these columns in <strong>{fileName}</strong> - match each one to a candidate field
                            ({CANDIDATE_FIELDS.filter((f) => f.required).map((f) => f.label).join(' and ')} required).
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        {CANDIDATE_FIELDS.map((field) => (
                            <Select
                                key={field.key}
                                label={`${field.label} Column${field.required ? ' *' : ''}`}
                                value={mapping[`${field.key}Header`]}
                                onChange={(e) => setMapping({ ...mapping, [`${field.key}Header`]: e.target.value })}
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
                                    {CANDIDATE_FIELDS.map((f) => <th key={f.key} className="py-2.5 px-3">{f.label}</th>)}
                                    <th className="py-2.5 px-3">Status / Validation</th>
                                    <th className="py-2.5 px-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {candidateRows.map((row) => (
                                    <tr key={row.row} className="hover:bg-black/[0.015]">
                                        <td className="py-3 px-3 font-mono text-[12px] text-text-secondary">Row {row.row}</td>
                                        {CANDIDATE_FIELDS.map((f) => (
                                            <td key={f.key} className={`py-3 px-3 ${f.key === 'name' ? 'font-semibold text-ink' : f.key === 'email' ? 'font-mono text-[12.5px]' : 'text-text-secondary'}`}>
                                                {row[f.key] || (f.required ? <span className="text-red-500 italic">[Empty]</span> : '—')}
                                            </td>
                                        ))}
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
                        {CANDIDATE_FIELDS.map((field) => (
                            <Input
                                key={field.key}
                                label={field.label}
                                placeholder={field.type === 'text' && field.key === 'exp' ? 'e.g. 4 or 4 years' : undefined}
                                value={editingRow[field.key] || ''}
                                onChange={(e) => setEditingRow({ ...editingRow, [field.key]: e.target.value })}
                            />
                        ))}
                    </div>
                </Modal>
            )}
        </Modal>
    )
}

export default CandidateImportModal
