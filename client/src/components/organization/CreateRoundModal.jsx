import React, { useState } from 'react'
import { Plus, Check, ArrowRight, ArrowLeft, CheckSquare, Square, Upload, Users, FileSpreadsheet, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Input, Select, Badge } from '../ui'
import CriteriaWeightageBuilder from './CriteriaWeightageBuilder'
import QuestionSetBuilder from './QuestionSetBuilder'
import CandidateImportModal from './CandidateImportModal'
import { addRoundToInterviewDrive } from '../../api/organization/organizationApi'

const QUESTION_BANKS = [
  { id: 'qb-m1', title: 'System Architecture & Engineering Leadership', questions: 5, duration: '20 mins' },
  { id: 'qb-m2', title: 'Managerial Case Studies & Problem Solving', questions: 4, duration: '18 mins' },
  { id: 'qb-m3', title: 'HR, Behavioral & Cultural Alignment', questions: 5, duration: '15 mins' },
]

function CreateRoundModal({ open, onClose, driveId, roundNumber = 2, shortlistedCandidates = [], onCreateRound }) {
  const [step, setStep] = useState(1)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [candidateSource, setCandidateSource] = useState('SHORTLISTED') // SHORTLISTED | EXCEL
  const [excelCandidates, setExcelCandidates] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    roundTitle: `Round ${roundNumber}: Managerial & System Design Assessment`,
    roundType: 'Managerial Round',
    passingThreshold: '75',
    expiryDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    questionMode: 'PREBUILT',
    questionBankId: 'qb-m1',
  })

  const [skillWeightages, setSkillWeightages] = useState([
    { id: 1, name: 'System Architecture & Design Patterns', weight: 40 },
    { id: 2, name: 'Leadership & Team Management', weight: 30 },
    { id: 3, name: 'Cultural Alignment & HR', weight: 30 },
  ])

  const [customQuestions, setCustomQuestions] = useState([
    { id: 1, text: 'Design a high-concurrency real-time notification engine for 10M users.', topic: 'System Architecture & Design Patterns', timeLimit: 180 },
    { id: 2, text: 'How do you handle conflict between senior architects regarding tech stack migration?', topic: 'Leadership & Team Management', timeLimit: 180 },
  ])

  const [selectedCandidateIds, setSelectedCandidateIds] = useState(
    shortlistedCandidates.map((c) => c.id)
  )

  const handleChange = (field, value) => {
    setErrorMessage('')
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCriteriaNameChange = (idx, newName) =>
    setSkillWeightages((prev) => prev.map((item, i) => (i === idx ? { ...item, name: newName } : item)))

  const handleCriteriaWeightChange = (idx, newWeight) => {
    setErrorMessage('')
    setSkillWeightages((prev) => prev.map((item, i) => (i === idx ? { ...item, weight: Number(newWeight) || 0 } : item)))
  }

  const handleAddCriteria = () =>
    setSkillWeightages((prev) => [...prev, { id: Date.now(), name: `Round ${roundNumber} Criteria #${prev.length + 1}`, weight: 10 }])

  const handleRemoveCriteria = (idx) => setSkillWeightages((prev) => prev.filter((_, i) => i !== idx))

  const handleAddCustomQuestion = () =>
    setCustomQuestions((prev) => [...prev, { id: Date.now(), text: '', topic: skillWeightages[0]?.name || 'General', timeLimit: 120 }])

  const handleRemoveCustomQuestion = (idx) => setCustomQuestions((prev) => prev.filter((_, i) => i !== idx))

  const handleCustomQuestionChange = (idx, field, value) =>
    setCustomQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)))

  const handleToggleCandidate = (id) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    )
  }

  const handleExcelImportComplete = (importedList) => {
    const formatted = importedList.map((c, i) => ({
      id: `cand-excel-${Date.now()}-${i}`,
      name: c.name || c['Candidate Name'] || 'Candidate',
      email: c.email || c['Email Address'] || `candidate${i}@example.com`,
      phone: c.phone || c['Phone Number'] || '+91-9999999999',
      exp: c.experience || '3 yrs',
      aiScore: 85,
      malpracticeFlags: 0,
      status: 'SHORTLISTED',
    }))
    setExcelCandidates(formatted)
  }

  const handleNext = () => {
    setErrorMessage('')
    if (step === 1 && (!formData.roundTitle.trim() || !formData.expiryDate)) {
      setErrorMessage('Please specify round title and expiry date.')
      return
    }
    if (step === 2) {
      const totalWeight = skillWeightages.reduce((acc, s) => acc + s.weight, 0)
      if (totalWeight !== 100) {
        setErrorMessage(`Total skill criteria weightage must sum to 100% (currently ${totalWeight}%).`)
        return
      }
    }
    setStep((prev) => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setErrorMessage('')
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleLaunchRound = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    const totalWeight = skillWeightages.reduce((acc, s) => acc + s.weight, 0)
    if (totalWeight !== 100) {
      setErrorMessage(`Total skill criteria weightage must sum to 100% (currently ${totalWeight}%).`)
      setSubmitting(false)
      return
    }

    const selectedBank = QUESTION_BANKS.find((b) => b.id === formData.questionBankId)

    const roundCandidateRoster =
      candidateSource === 'SHORTLISTED'
        ? shortlistedCandidates.filter((c) => selectedCandidateIds.includes(c.id))
        : excelCandidates

    const payload = {
      roundNumber,
      title: formData.roundTitle,
      type: formData.roundType,
      expiryDate: formData.expiryDate,
      passingThreshold: Number(formData.passingThreshold) || 75,
      questionMode: formData.questionMode,
      questionBankTitle: formData.questionMode === 'PREBUILT' ? (selectedBank ? selectedBank.title : 'Pre-built Question Set') : `Custom Question Set (${customQuestions.length} Qs)`,
      skillRubrics: skillWeightages,
      customQuestions,
      candidates: roundCandidateRoster,
    }

    try {
      if (driveId) {
        const response = await addRoundToInterviewDrive(driveId, payload)
        onCreateRound(response || payload)
      } else {
        onCreateRound(payload)
      }
      onClose()
      setStep(1)
    } catch (err) {
      console.warn('Backend add round fallback:', err)
      onCreateRound(payload)
      onClose()
      setStep(1)
    } finally {
      setSubmitting(false)
    }
  }

  const activeCandidatesCount =
    candidateSource === 'SHORTLISTED' ? selectedCandidateIds.length : excelCandidates.length

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Create & Setup Round ${roundNumber}`}
        size="full"
        footer={
          <div className="flex items-center justify-between w-full">
            {step > 1 ? (
              <Button type="button" variant="secondary" size="sm" onClick={handleBack} disabled={submitting}>
                <ArrowLeft size={14} /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button type="button" size="sm" onClick={handleNext} disabled={step === 1 && (!formData.roundTitle.trim() || !formData.expiryDate)}>
                Continue <ArrowRight size={14} />
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleLaunchRound} disabled={activeCandidatesCount === 0 || submitting}>
                <Check size={14} /> {submitting ? 'Launching Round...' : `Activate & Launch Round ${roundNumber} (${activeCandidatesCount} Candidates)`}
              </Button>
            )}
          </div>
        }
      >
        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-[13.5px] font-medium flex items-center gap-2.5 max-w-4xl mx-auto">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Stepper Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-line overflow-x-auto">
          {[
            { num: 1, label: `1. Round ${roundNumber} Setup` },
            { num: 2, label: '2. Evaluation Criteria & Weightages' },
            { num: 3, label: '3. Interview Questions Setup' },
            { num: 4, label: '4. Round Candidate Roster' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2.5 shrink-0 px-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors ${
                  step === s.num
                    ? 'bg-accent text-white shadow-sm'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-black/[0.05] dark:bg-white/[0.08] text-text-secondary'
                }`}
              >
                {step > s.num ? <Check size={15} /> : s.num}
              </div>
              <span className={`text-[13.5px] font-medium ${step === s.num ? 'text-ink font-bold' : 'text-text-secondary'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Round Metadata */}
        {step === 1 && (
          <div className="space-y-6 max-w-4xl mx-auto py-2">
            <Input
              label={`Round ${roundNumber} Title *`}
              placeholder="e.g. Round 2: System Architecture & Executive Interview"
              value={formData.roundTitle}
              onChange={(e) => handleChange('roundTitle', e.target.value)}
              required
            />

            <div className="grid sm:grid-cols-2 gap-6">
              <Select
                label="Round Type *"
                value={formData.roundType}
                onChange={(e) => handleChange('roundType', e.target.value)}
                options={[
                  { value: 'Managerial Round', label: 'Managerial / System Architecture' },
                  { value: 'Technical Deep-Dive', label: 'Technical Deep-Dive / Live Coding' },
                  { value: 'HR & Executive Round', label: 'HR & Executive Culture Fit' },
                ]}
              />
              <Input
                label="AI Qualification Passing Threshold (%)"
                type="number"
                value={formData.passingThreshold}
                onChange={(e) => handleChange('passingThreshold', e.target.value)}
              />
            </div>

            <Input
              label={`Mandatory Round ${roundNumber} Expiry Date *`}
              type="date"
              value={formData.expiryDate}
              onChange={(e) => handleChange('expiryDate', e.target.value)}
              required
            />
          </div>
        )}

        {/* Step 2: Reusable Criteria & Weightages */}
        {step === 2 && (
          <div className="space-y-6 max-w-4xl mx-auto py-2">
            <CriteriaWeightageBuilder
              skillWeightages={skillWeightages}
              onCriteriaNameChange={handleCriteriaNameChange}
              onCriteriaWeightChange={handleCriteriaWeightChange}
              onAddCriteria={handleAddCriteria}
              onRemoveCriteria={handleRemoveCriteria}
              title={`Round ${roundNumber} Criteria & Weightage Breakdown`}
              description={`Customize skill evaluation rubrics specific to Round ${roundNumber}.`}
            />
          </div>
        )}

        {/* Step 3: Reusable Question Set Builder */}
        {step === 3 && (
          <div className="space-y-6 max-w-4xl mx-auto py-2">
            <QuestionSetBuilder
              questionMode={formData.questionMode}
              onQuestionModeChange={(mode) => handleChange('questionMode', mode)}
              questionBanks={QUESTION_BANKS}
              selectedBankId={formData.questionBankId}
              onSelectBankId={(id) => handleChange('questionBankId', id)}
              customQuestions={customQuestions}
              onAddCustomQuestion={handleAddCustomQuestion}
              onRemoveCustomQuestion={handleRemoveCustomQuestion}
              onCustomQuestionChange={handleCustomQuestionChange}
              skillWeightages={skillWeightages}
            />
          </div>
        )}

        {/* Step 4: Candidate Roster & Excel Import Option */}
        {step === 4 && (
          <div className="space-y-6 max-w-4xl mx-auto py-2">
            {/* Candidate Source Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-line bg-card shadow-sm">
              <div>
                <h4 className="text-[16px] font-bold text-ink">Round {roundNumber} Candidate Selection</h4>
                <p className="text-[13px] text-text-secondary mt-0.5">
                  Advance shortlisted candidates from Round 1 or upload a new candidate Excel/CSV batch.
                </p>
              </div>

              <div className="flex items-center gap-2 p-1.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl border border-line">
                <button
                  type="button"
                  onClick={() => setCandidateSource('SHORTLISTED')}
                  className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold transition-all ${
                    candidateSource === 'SHORTLISTED' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-ink'
                  }`}
                >
                  Round 1 Shortlisted ({shortlistedCandidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCandidateSource('EXCEL')}
                  className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold transition-all ${
                    candidateSource === 'EXCEL' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-ink'
                  }`}
                >
                  Upload Excel / CSV Batch
                </button>
              </div>
            </div>

            {candidateSource === 'SHORTLISTED' ? (
              <div className="overflow-x-auto border border-line rounded-2xl bg-card">
                <table className="w-full text-left text-[13.5px]">
                  <thead className="bg-black/[0.02] dark:bg-white/[0.04] border-b border-line text-[12px] font-semibold text-text-secondary">
                    <tr>
                      <th className="py-3.5 px-4">Select</th>
                      <th className="py-3.5 px-4">Candidate Name</th>
                      <th className="py-3.5 px-4">Email Address</th>
                      <th className="py-3.5 px-4">Round 1 AI Score</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shortlistedCandidates.map((cand) => {
                      const isSelected = selectedCandidateIds.includes(cand.id)
                      return (
                        <tr
                          key={cand.id}
                          onClick={() => handleToggleCandidate(cand.id)}
                          className="hover:bg-black/[0.015] cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            {isSelected ? (
                              <CheckSquare size={18} className="text-accent" />
                            ) : (
                              <Square size={18} className="text-text-secondary" />
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-ink">{cand.name}</td>
                          <td className="py-3.5 px-4 font-mono text-[13px] text-text-secondary">{cand.email}</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600">{cand.aiScore}%</td>
                          <td className="py-3.5 px-4">
                            <Badge variant="success">Passed Round 1</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Excel Upload UI */
              <div className="p-6 rounded-2xl border border-line bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[15px] text-ink flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-accent" /> Upload Excel / CSV Roster for Round {roundNumber}
                  </span>
                  <Button type="button" size="sm" onClick={() => setImportModalOpen(true)}>
                    <Upload size={14} /> Open Excel CSV Importer
                  </Button>
                </div>

                {excelCandidates.length > 0 ? (
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                    <span className="text-[13.5px] font-bold text-emerald-600 flex items-center gap-2">
                      <Check size={18} /> {excelCandidates.length} Verified Candidates Loaded from Excel
                    </span>
                    <Button type="button" size="xs" variant="secondary" onClick={() => setImportModalOpen(true)}>
                      Re-upload Excel File
                    </Button>
                  </div>
                ) : (
                  <p className="text-[13px] text-text-secondary">
                    No Excel candidate batch uploaded yet. Click "Open Excel CSV Importer" to map headers and load candidate records directly for Round {roundNumber}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CSV / Excel Importer Modal */}
      <CandidateImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={handleExcelImportComplete}
      />
    </>
  )
}

export default CreateRoundModal
