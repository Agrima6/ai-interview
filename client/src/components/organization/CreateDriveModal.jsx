import React, { useState } from 'react'
import { Plus, Check, ArrowRight, ArrowLeft, Link2, Copy, Upload, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Input, Select, Textarea } from '../ui'
import CandidateImportModal from './CandidateImportModal'
import CriteriaWeightageBuilder from './CriteriaWeightageBuilder'
import QuestionSetBuilder from './QuestionSetBuilder'
import { createInterviewDrive } from '../../api/organization/organizationApi'

const ROLE_CATEGORIES = [
  { value: 'SOFTWARE_ENGINEERING', label: 'Software Engineering (SDE / Fullstack)' },
  { value: 'DATA_SCIENCE', label: 'Data Science & Machine Learning' },
  { value: 'PRODUCT_DESIGN', label: 'Product & Design (UI/UX)' },
  { value: 'QUALITY_ASSURANCE', label: 'Quality Assurance & Testing' },
  { value: 'SALES_MARKETING', label: 'Sales & Business Development' },
  { value: 'FINANCE_OPERATIONS', label: 'Finance & Accounts' },
  { value: 'HR_OPERATIONS', label: 'Human Resources & Talent Acquisition' },
  { value: 'CAMPUS_PLACEMENT', label: 'Campus Placement / Graduate Trainee' },
]

const DEPARTMENTS = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Core Tech', label: 'Core Tech' },
  { value: 'Product Management', label: 'Product Management' },
  { value: 'Quality Assurance', label: 'Quality Assurance' },
  { value: 'Human Resources', label: 'Human Resources' },
  { value: 'Finance & Accounts', label: 'Finance & Accounts' },
  { value: 'Sales & Business Dev', label: 'Sales & Business Dev' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Customer Success', label: 'Customer Success' },
]

const EXPERIENCE_LEVELS = [
  { value: '0-1 yr (Fresher)', label: '0-1 yr (Fresher / Graduate)' },
  { value: '1-3 yrs (Junior)', label: '1-3 yrs (Junior)' },
  { value: '3-5 yrs (Mid Level)', label: '3-5 yrs (Mid Level)' },
  { value: '5-8 yrs (Senior)', label: '5-8 yrs (Senior)' },
  { value: '8+ yrs (Lead/Manager)', label: '8+ yrs (Lead / Manager)' },
]

const QUESTION_BANKS = [
  { id: 'qb-1', title: 'SDE Core Engineering Assessment', questions: 8, duration: '20 mins' },
  { id: 'qb-2', title: 'Data Structures & System Architecture', questions: 6, duration: '18 mins' },
  { id: 'qb-3', title: 'Data Science & Machine Learning Fundamentals', questions: 5, duration: '18 mins' },
  { id: 'qb-4', title: 'Sales, Negotiation & Business Aptitude', questions: 5, duration: '15 mins' },
  { id: 'qb-5', title: 'Behavioral & Leadership Competencies', questions: 5, duration: '15 mins' },
  { id: 'qb-6', title: 'Campus Placement Aptitude & General Screening', questions: 8, duration: '25 mins' },
]

function CreateDriveModal({ open, onClose, onCreateDrive }) {
  const [step, setStep] = useState(1)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importedCandidates, setImportedCandidates] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    roleCategory: 'SOFTWARE_ENGINEERING',
    department: 'Engineering',
    experienceLevel: '1-3 yrs (Junior)',
    totalRounds: '2',
    roundType: 'Technical Round',
    expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    questionMode: 'PREBUILT',
    questionBankId: 'qb-1',
    passingThreshold: '70',
    timePerQuestion: '120',
    enablePublicLink: true,
    candidateEmails: '',
  })

  const [skillWeightages, setSkillWeightages] = useState([
    { id: 1, name: 'Domain Knowledge & Technical Competency', weight: 30 },
    { id: 2, name: 'Problem Solving & Analytical Thinking', weight: 25 },
    { id: 3, name: 'Communication & Soft Skills', weight: 25 },
    { id: 4, name: 'Behavioral & Culture Fit', weight: 20 },
  ])

  const [customQuestions, setCustomQuestions] = useState([
    { id: 1, text: 'Describe a complex challenge you solved in your recent role.', topic: 'Problem Solving & Analytical Thinking', timeLimit: 120 },
    { id: 2, text: 'How do you handle disagreement with team members during a project deadline?', topic: 'Communication & Soft Skills', timeLimit: 120 },
  ])

  const [copiedLink, setCopiedLink] = useState(false)

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
    setSkillWeightages((prev) => [...prev, { id: Date.now(), name: `New Evaluation Criteria #${prev.length + 1}`, weight: 10 }])

  const handleRemoveCriteria = (idx) => setSkillWeightages((prev) => prev.filter((_, i) => i !== idx))

  const handleAddCustomQuestion = () =>
    setCustomQuestions((prev) => [...prev, { id: Date.now(), text: '', topic: skillWeightages[0]?.name || 'General', timeLimit: 120 }])

  const handleRemoveCustomQuestion = (idx) => setCustomQuestions((prev) => prev.filter((_, i) => i !== idx))

  const handleCustomQuestionChange = (idx, field, value) =>
    setCustomQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)))

  const handleNext = () => {
    setErrorMessage('')
    if (step === 1 && (!formData.title.trim() || !formData.expiryDate)) {
      setErrorMessage('Please provide a drive title and expiry date.')
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

  const handleSubmit = async (e) => {
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

    const payload = {
      title: formData.title.trim(),
      roleCategory: formData.roleCategory,
      department: formData.department,
      experienceLevel: formData.experienceLevel,
      totalRounds: Number(formData.totalRounds) || 2,
      roundType: formData.roundType,
      expiryDate: formData.expiryDate,
      status: 'ACTIVE',
      questionMode: formData.questionMode,
      questionBankTitle: formData.questionMode === 'PREBUILT' ? (selectedBank ? selectedBank.title : 'Pre-built Question Set') : `Custom Question Set (${customQuestions.length} Qs)`,
      customQuestionsList: formData.questionMode === 'CUSTOM' ? customQuestions : [],
      skillRubrics: skillWeightages,
      passingThreshold: Number(formData.passingThreshold) || 70,
      candidatesCount: importedCandidates.length || (formData.candidateEmails ? formData.candidateEmails.split(',').filter(Boolean).length : 0),
      importedCandidateList: importedCandidates,
      enablePublicLink: formData.enablePublicLink,
      publicLink: formData.enablePublicLink
        ? `https://workmateiq.com/drive/${formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`
        : null,
    }

    try {
      const response = await createInterviewDrive(payload)
      onCreateDrive(response || payload)
      onClose()
      setStep(1)
    } catch (err) {
      // Graceful fallback to optimistic creation if API server is offline
      console.warn('Backend drive creation fallback:', err)
      const fallbackDrive = {
        ...payload,
        id: `drive-${Date.now()}`,
        currentRound: 1,
        createdAt: new Date().toISOString(),
      }
      onCreateDrive(fallbackDrive)
      onClose()
      setStep(1)
    } finally {
      setSubmitting(false)
    }
  }

  const copyPublicLink = () => {
    const link = `https://workmateiq.com/drive/${formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Create New Interview Drive & Round Setup"
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
              <Button type="button" size="sm" onClick={handleNext} disabled={step === 1 && (!formData.title.trim() || !formData.expiryDate)}>
                Continue <ArrowRight size={14} />
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleSubmit} disabled={submitting}>
                <Check size={14} /> {submitting ? 'Creating Drive...' : 'Launch Interview Drive'}
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

        {/* 4-Step Stepper Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-line overflow-x-auto">
          {[
            { num: 1, label: '1. Role & Drive Setup' },
            { num: 2, label: '2. Evaluation Criteria & Weightages' },
            { num: 3, label: '3. Interview Questions Setup' },
            { num: 4, label: '4. Candidate Invites & Access' },
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

        {/* Step 1: Drive Setup */}
        {step === 1 && (
          <div className="space-y-6 max-w-4xl mx-auto py-2">
            <Input
              label="Drive / Role Title *"
              placeholder="e.g. Senior Product Manager / Sales Specialist Drive 2026"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />

            <div className="grid sm:grid-cols-2 gap-6">
              <Select
                label="Role Category *"
                value={formData.roleCategory}
                onChange={(e) => handleChange('roleCategory', e.target.value)}
                options={ROLE_CATEGORIES}
              />
              <Select
                label="Department *"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                options={DEPARTMENTS}
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <Select
                label="Experience Level *"
                value={formData.experienceLevel}
                onChange={(e) => handleChange('experienceLevel', e.target.value)}
                options={EXPERIENCE_LEVELS}
              />
              <Select
                label="Total Rounds *"
                value={formData.totalRounds}
                onChange={(e) => handleChange('totalRounds', e.target.value)}
                options={[
                  { value: '1', label: '1 Round' },
                  { value: '2', label: '2 Rounds (Round 1 & 2)' },
                  { value: '3', label: '3 Rounds (Technical, Managerial, HR)' },
                ]}
              />
              <Select
                label="Round 1 Type *"
                value={formData.roundType}
                onChange={(e) => handleChange('roundType', e.target.value)}
                options={[
                  { value: 'Technical Round', label: 'Technical / Domain Assessment' },
                  { value: 'HR Round', label: 'HR & Communication Round' },
                  { value: 'Managerial Round', label: 'Managerial / Case Study' },
                ]}
              />
            </div>

            <Input
              label="Mandatory Drive Expiry Date *"
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
            />

            <div className="grid sm:grid-cols-2 gap-6 p-6 rounded-2xl border border-line bg-card">
              <Input
                label="AI Passing Threshold Score (%)"
                type="number"
                value={formData.passingThreshold}
                onChange={(e) => handleChange('passingThreshold', e.target.value)}
                hint="Candidates scoring above this threshold will automatically qualify for Round 2."
              />
              <Select
                label="Default Max Time Per Answer"
                value={formData.timePerQuestion}
                onChange={(e) => handleChange('timePerQuestion', e.target.value)}
                options={[
                  { value: '60', label: '1 Minute' },
                  { value: '120', label: '2 Minutes' },
                  { value: '180', label: '3 Minutes' },
                ]}
              />
            </div>
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

        {/* Step 4: Candidate Invites & Access Setup */}
        {step === 4 && (
          <div className="space-y-6 max-w-4xl mx-auto py-2">
            <div className="p-6 rounded-2xl border border-line bg-card space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[15px] font-bold text-ink flex items-center gap-2">
                    <Link2 size={18} className="text-accent" /> Enable Shareable Public Invite Link
                  </h4>
                  <p className="text-[13px] text-text-secondary mt-0.5">
                    Choose whether candidates can join via a public URL link or restrict access strictly to direct invites.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enablePublicLink}
                    onChange={(e) => handleChange('enablePublicLink', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-black/10 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              {formData.enablePublicLink ? (
                <div className="p-4 bg-black/[0.02] dark:bg-white/[0.04] rounded-xl border border-line">
                  <label className="block text-[12.5px] font-semibold text-ink mb-1.5">Shareable Invite Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={`https://workmateiq.com/drive/${formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'new-drive'}`}
                      className="flex-1 px-3 py-2 text-[13px] bg-card border border-line rounded-lg text-ink font-mono"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={copyPublicLink}>
                      <Copy size={13} /> {copiedLink ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[13px] text-amber-700 dark:text-amber-300">
                  Public invite link is disabled. Only explicitly invited candidates will be granted interview access.
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl border border-line bg-card space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[15px] text-ink">Candidate Invitations (Optional)</span>
                <Button type="button" size="sm" variant="secondary" onClick={() => setImportModalOpen(true)}>
                  <Upload size={14} /> Upload CSV Spreadsheet
                </Button>
              </div>

              {importedCandidates.length > 0 ? (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                  <span className="text-[13.5px] font-bold text-emerald-600 flex items-center gap-2">
                    <Check size={18} /> {importedCandidates.length} Candidates Loaded from CSV
                  </span>
                  <Button type="button" size="xs" variant="secondary" onClick={() => setImportModalOpen(true)}>
                    Edit CSV Candidate Batch
                  </Button>
                </div>
              ) : (
                <Textarea
                  label="Direct Email Invitations (Comma-separated, Optional)"
                  placeholder="e.g. candidate1@gmail.com, candidate2@company.com"
                  rows={3}
                  value={formData.candidateEmails}
                  onChange={(e) => handleChange('candidateEmails', e.target.value)}
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      <CandidateImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={(candidates) => setImportedCandidates(candidates)}
      />
    </>
  )
}

export default CreateDriveModal
