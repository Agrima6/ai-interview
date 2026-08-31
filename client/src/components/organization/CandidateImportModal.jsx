import React, { useState } from 'react'
import { Upload, CheckCircle2, AlertTriangle, XCircle, FileText, Check, Edit2, ArrowRight } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Input, Select, Badge } from '../ui'

const MOCK_PRESET_FILE_ROWS = [
  { row: 14, name: 'David Connor', email: 'david.c@invalid', phone: '+1-555-0192', exp: '3 yrs', error: "Missing '@' in Email", status: 'ERROR' },
  { row: 88, name: '', email: 's.connor@gmail.com', phone: '+1-555-0188', exp: '2 yrs', error: 'Empty Name Field', status: 'ERROR' },
  { row: 42, name: 'Vikram Mehta', email: 'aarav.sharma@gmail.com', phone: '+91-9876543210', exp: '4 yrs', error: 'Already Sent Link (Duplicate)', status: 'DUPLICATE' },
  { row: 102, name: 'Marcus Wright', email: 'marcus@skynet.net', phone: '+1-555-0144', exp: '5 yrs', error: null, status: 'VERIFIED' },
  { row: 105, name: 'Priya Sharma', email: 'priya.s@techcorp.com', phone: '+91-9812345678', exp: '1 yr', error: null, status: 'VERIFIED' },
]

function CandidateImportModal({ open, onClose, onImportComplete }) {
  const [step, setStep] = useState(1) // 1: Upload, 2: Map Headers, 3: Verify & Fix
  const [fileName, setFileName] = useState('candidates_list_senior_fe_june.csv')
  const [candidateRows, setCandidateRows] = useState(MOCK_PRESET_FILE_ROWS)
  const [editingRow, setEditingRow] = useState(null)

  // Header mapping states
  const [mapping, setMapping] = useState({
    nameHeader: 'Candidate Name',
    emailHeader: 'Primary Email',
    expHeader: 'Experience (Years)',
    phoneHeader: 'Phone Number',
  })

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      setStep(2)
    }
  }

  const handleFixRowSave = (rowNum, updatedData) => {
    setCandidateRows((prev) =>
      prev.map((r) => {
        if (r.row === rowNum) {
          const isValidEmail = updatedData.email.includes('@') && updatedData.email.includes('.')
          const hasName = Boolean(updatedData.name.trim())
          const newStatus = isValidEmail && hasName ? 'VERIFIED' : 'ERROR'
          const newError = !hasName ? 'Empty Name Field' : !isValidEmail ? "Missing '@' in Email" : null
          return { ...r, ...updatedData, status: newStatus, error: newError }
        }
        return r
      })
    )
    setEditingRow(null)
  }

  const validCount = candidateRows.filter((r) => r.status === 'VERIFIED').length
  const totalCount = candidateRows.length

  const handleFinishImport = () => {
    const verifiedCandidates = candidateRows.filter((r) => r.status === 'VERIFIED')
    onImportComplete(verifiedCandidates)
    onClose()
    setStep(1)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Candidate Spreadsheet & Data Mapping"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>

          {step === 1 && (
            <Button type="button" size="sm" onClick={() => setStep(2)}>
              Next: Map Headers <ArrowRight size={14} />
            </Button>
          )}

          {step === 2 && (
            <Button type="button" size="sm" onClick={() => setStep(3)}>
              Next: Verify Rows <ArrowRight size={14} />
            </Button>
          )}

          {step === 3 && (
            <Button type="button" size="sm" onClick={handleFinishImport} disabled={validCount === 0}>
              <Check size={14} /> Finish Import ({validCount}/{totalCount})
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
              <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          {fileName && (
            <div className="p-3.5 rounded-xl border border-line bg-card flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink flex items-center gap-2">
                <FileText size={16} className="text-accent" /> {fileName}
              </span>
              <Badge variant="purple">{candidateRows.length} Rows Detected</Badge>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Map CSV Headers to System Fields */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-[14.5px] font-bold text-ink mb-1">Map CSV Headers to System Fields</h3>
            <p className="text-[12.5px] text-text-secondary">Ensure each column in your CSV matches our candidate schema.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Full Name Column (CSV)"
              value={mapping.nameHeader}
              onChange={(e) => setMapping({ ...mapping, nameHeader: e.target.value })}
              options={[
                { value: 'Candidate Name', label: 'Candidate Name' },
                { value: 'Full Name', label: 'Full Name' },
                { value: 'First & Last Name', label: 'First & Last Name' },
              ]}
            />
            <Select
              label="E-mail Address Column (CSV)"
              value={mapping.emailHeader}
              onChange={(e) => setMapping({ ...mapping, emailHeader: e.target.value })}
              options={[
                { value: 'Primary Email', label: 'Primary Email' },
                { value: 'Email Address', label: 'Email Address' },
              ]}
            />
            <Select
              label="Phone Number Column (CSV)"
              value={mapping.phoneHeader}
              onChange={(e) => setMapping({ ...mapping, phoneHeader: e.target.value })}
              options={[
                { value: 'Phone Number', label: 'Phone Number' },
                { value: 'Mobile Contact', label: 'Mobile Contact' },
              ]}
            />
            <Select
              label="Years Experience Column (CSV)"
              value={mapping.expHeader}
              onChange={(e) => setMapping({ ...mapping, expHeader: e.target.value })}
              options={[
                { value: 'Experience (Years)', label: 'Experience (Years)' },
                { value: 'Total Exp', label: 'Total Exp' },
              ]}
            />
          </div>
        </div>
      )}

      {/* Step 3: Verification & Errors List */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14.5px] font-bold text-ink">Verification & Errors List</h3>
              <p className="text-[12.5px] text-text-secondary">Review spreadsheet validation results and fix formatting errors inline.</p>
            </div>
            <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {validCount} Ready / {totalCount} Total
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-line rounded-xl">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-black/[0.02] dark:bg-white/[0.04] border-b border-line text-[12px] font-semibold text-text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Row</th>
                  <th className="py-2.5 px-3">Candidate Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Phone</th>
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
                    <td className="py-3 px-3">
                      {row.status === 'VERIFIED' && <Badge variant="success">Verified</Badge>}
                      {row.status === 'ERROR' && <Badge variant="danger">{row.error}</Badge>}
                      {row.status === 'DUPLICATE' && <Badge variant="warning">{row.error}</Badge>}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {row.status !== 'VERIFIED' && (
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
          </div>
        </Modal>
      )}
    </Modal>
  )
}

export default CandidateImportModal
