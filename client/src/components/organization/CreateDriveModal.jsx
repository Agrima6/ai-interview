import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Check, ArrowRight, ArrowLeft, Link2, Upload, Pencil, Trash2, Edit3, AlertCircle, Mail, MessageSquareText, Phone, BellRing, Sparkles, Clock3, CalendarDays, Users, FileSpreadsheet, UserPlus } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Input, Select, EditableSelect, Textarea } from '../ui'
import CriteriaWeightageBuilder from './CriteriaWeightageBuilder'
import QuestionSetBuilder from './QuestionSetBuilder'
import CandidateImportModal from './CandidateImportModal'
import { createInterviewDrive, getQuestionBanks, getNotificationTemplates, getOrganizationProfile, updateRound } from '../../api/organization/organizationApi'

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

const INTERVIEW_TYPES = [
  { value: 'Technical', label: 'Technical Round' },
  { value: 'Managerial Round', label: 'Managerial Round' },
  { value: 'HR', label: 'HR Round' },
  { value: 'Behavioral', label: 'Behavioral Round' },
  { value: 'System Design', label: 'System Design Round' },
]

const defaultInvitationBody = `Hello {{candidate_name}},

You have been invited to an interview for {{role}} at {{organization_name}}.

Interview: {{interview_link}}
Date: {{interview_date}}
Time: {{interview_time}}`

const defaultReminderBody = `Hello {{candidate_name}},

This is a reminder that your interview for {{role}} is scheduled soon.`

const defaultWhatsappBody = `Hello {{candidate_name}}, your interview for {{role}} is scheduled for {{interview_date}} at {{interview_time}}.`

const VARIABLE_TAGS = [
  'candidate_name',
  'organization_name',
  'role',
  'interview_date',
  'interview_time',
  'interview_link',
]

const renderTokens = (body = '') => body
  .replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, key) => `{{${key}}}`)
  .replace(/\{\s*([a-zA-Z_]+)\s*\}/g, (_, key) => `{{${key}}}`)

const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, 10)
const sanitizePositiveExperience = (value) => {
  const cleaned = value.replace(/[^\d.]/g, '')
  const [whole = '', decimals] = cleaned.split('.')
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '')
  const normalized = decimals === undefined ? normalizedWhole : `${normalizedWhole || '0'}.${decimals.replace(/\D/g, '')}`
  const number = Number(normalized)
  return number > 70 ? '70' : normalized
}
const formatDateInput = (date) => date.toISOString().split('T')[0]
const todayInput = formatDateInput(new Date())
const defaultExpiryInput = formatDateInput(new Date(Date.now() + 14 * 86400000))

function CreateDriveModal({ open, onClose, onCreateDrive, editDrive = null }) {
  const isEditing = Boolean(editDrive)
  const [step, setStep] = useState(1)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importedCandidates, setImportedCandidates] = useState([])
  const [editingStudent, setEditingStudent] = useState(null)
  const [studentEditForm, setStudentEditForm] = useState({ name: '', email: '', phone: '', exp: '' })
  const [singleStudent, setSingleStudent] = useState({ name: '', email: '', phone: '', exp: '' })
  const [singleStudentError, setSingleStudentError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [questionBanks, setQuestionBanks] = useState([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [templates, setTemplates] = useState([])
  const [orgName, setOrgName] = useState('WorkmateIQ')

  const [formData, setFormData] = useState({
    title: '',
    roleCategory: '',
    department: '',
    experienceLevel: '1-3 yrs (Junior)',
    totalRounds: '2',
    roundType: '',
    startDate: todayInput,
    expiryDate: defaultExpiryInput,
    questionMode: 'PREBUILT',
    questionBankId: '',
    passingThreshold: '70',
    timePerQuestion: '120',
    enablePublicLink: true,
  })

  const [communication, setCommunication] = useState({
    emailEnabled: true,
    whatsappEnabled: true,
    callEnabled: false,
    reminderEnabled: true,
    reminderTiming: '24h',
    invitationTemplateId: '',
    reminderTemplateId: '',
    whatsappTemplateId: '',
    invitationCustom: false,
    whatsappCustom: false,
    callType: 'automated',
    callTiming: '1d',
    invitationText: defaultInvitationBody,
    whatsappText: defaultWhatsappBody,
    reminderText: defaultReminderBody,
  })
  const [communicationChannel, setCommunicationChannel] = useState('email')
  const [emailEditorOpen, setEmailEditorOpen] = useState(false)

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

  useEffect(() => {
    if (!open) return

    const loadTemplates = async () => {
      try {
        const response = await getNotificationTemplates()
        const mapped = Array.isArray(response) ? response : []
        setTemplates(mapped.map((template) => ({
          id: template.templateId || template._id || template.id,
          name: template.name || template.title || 'Template',
          category: template.category || template.type || 'Email',
          type: template.type || template.category || 'EMAIL',
          subject: template.subject || 'Interview Invitation',
          body: template.body || template.content || defaultInvitationBody,
          updatedAt: template.updatedAt || template.updated_at || null,
        })))
      } catch (error) {
        setTemplates([])
      }
    }

    const loadProfile = async () => {
      try {
        const profile = await getOrganizationProfile()
        if (profile?.name) setOrgName(profile.name)
      } catch (error) {
        setOrgName('WorkmateIQ')
      }
    }

    setBanksLoading(true)
    getQuestionBanks()
      .then((banks) => setQuestionBanks(banks || []))
      .catch(() => setQuestionBanks([]))
      .finally(() => setBanksLoading(false))

    loadTemplates()
    loadProfile()
  }, [open])

  useEffect(() => {
    if (questionBanks.length && !formData.questionBankId) {
      setFormData((prev) => ({ ...prev, questionBankId: questionBanks[0]._id || questionBanks[0].id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionBanks])

  const mappedTemplates = useMemo(() => ({
    invitation: templates.filter((template) => /invite|interview|email/i.test(template.name || template.category || '')),
    reminder: templates.filter((template) => /remind|follow/i.test(template.name || template.category || '')),
    whatsapp: templates.filter((template) => /whatsapp|sms/i.test(template.name || template.category || '')),
  }), [templates])

  const invitationTemplate = useMemo(
    () => templates.find((template) => template.id === communication.invitationTemplateId) || null,
    [templates, communication.invitationTemplateId]
  )
  const reminderTemplate = useMemo(
    () => templates.find((template) => template.id === communication.reminderTemplateId) || null,
    [templates, communication.reminderTemplateId]
  )
  const whatsappTemplate = useMemo(
    () => templates.find((template) => template.id === communication.whatsappTemplateId) || null,
    [templates, communication.whatsappTemplateId]
  )

  useEffect(() => {
    if (!templates.length) return

    setCommunication((prev) => ({
      ...prev,
      invitationTemplateId: prev.invitationTemplateId || mappedTemplates.invitation[0]?.id || templates[0]?.id || '',
      reminderTemplateId: prev.reminderTemplateId || mappedTemplates.reminder[0]?.id || '',
      whatsappTemplateId: prev.whatsappTemplateId || mappedTemplates.whatsapp[0]?.id || templates[0]?.id || '',
      invitationText: prev.invitationCustom ? prev.invitationText : (mappedTemplates.invitation[0]?.body || prev.invitationText || defaultInvitationBody),
      whatsappText: prev.whatsappText || (mappedTemplates.whatsapp[0]?.body || defaultWhatsappBody),
      reminderText: prev.reminderText || (mappedTemplates.reminder[0]?.body || defaultReminderBody),
    }))
  }, [templates, mappedTemplates])

  // Prefill form data when editing an existing drive (Round 1 edit mode)
  useEffect(() => {
    if (!open || !editDrive) return

    const safeEditDrive = editDrive || {}
    const round1 = Array.isArray(safeEditDrive.rounds) ? safeEditDrive.rounds.find((r) => r?.roundNumber === 1) || {} : {}
    const existingCandidates = Array.isArray(round1.candidates) ? round1.candidates : Array.isArray(safeEditDrive.importedCandidateList) ? safeEditDrive.importedCandidateList : []
    const skillRubs = Array.isArray(round1.skillRubrics) ? round1.skillRubrics : Array.isArray(safeEditDrive.skillRubrics) ? safeEditDrive.skillRubrics : []
    const customQs = Array.isArray(round1.customQuestions) ? round1.customQuestions : Array.isArray(safeEditDrive.customQuestionsList) ? safeEditDrive.customQuestionsList : []

    const formatDate = (val) => {
      if (!val) return ''
      const parsed = new Date(val)
      if (Number.isNaN(parsed.getTime())) return ''
      return parsed.toISOString().split('T')[0]
    }

    setFormData({
      title: safeEditDrive.title || '',
      roleCategory: safeEditDrive.roleCategory || '',
      department: safeEditDrive.department || '',
      experienceLevel: safeEditDrive.experienceLevel || '',
      totalRounds: String(safeEditDrive.totalRounds || round1.roundNumber || 1),
      roundType: safeEditDrive.roundType || '',
      startDate: formatDate(safeEditDrive.startDate) || '',
      expiryDate: formatDate(safeEditDrive.expiryDate) || '',
      questionMode: round1.questionMode || safeEditDrive.questionMode || 'PREBUILT',
      questionBankId: '', // Will be set after questionBanks load
      passingThreshold: String(round1.passingThreshold || safeEditDrive.passingThreshold || 70),
      timePerQuestion: '120',
      enablePublicLink: safeEditDrive.enablePublicLink !== false,
    })

    setCommunication({
      emailEnabled: !!safeEditDrive.communicationSettings?.emailEnabled,
      whatsappEnabled: !!safeEditDrive.communicationSettings?.whatsappEnabled,
      callEnabled: !!safeEditDrive.communicationSettings?.callEnabled,
      reminderEnabled: !!safeEditDrive.communicationSettings?.reminderEnabled,
      reminderTiming: safeEditDrive.communicationSettings?.reminderTiming || '24h',
      invitationTemplateId: safeEditDrive.communicationSettings?.invitationTemplateId || '',
      reminderTemplateId: safeEditDrive.communicationSettings?.reminderTemplateId || '',
      whatsappTemplateId: safeEditDrive.communicationSettings?.whatsappTemplateId || '',
      invitationCustom: !!safeEditDrive.communicationSettings?.invitationCustom,
      whatsappCustom: !!safeEditDrive.communicationSettings?.whatsappCustom,
      callType: safeEditDrive.communicationSettings?.callType || 'automated',
      callTiming: safeEditDrive.communicationSettings?.callTiming || '1d',
      invitationText: safeEditDrive.communicationSettings?.invitationText || defaultInvitationBody,
      whatsappText: safeEditDrive.communicationSettings?.whatsappText || defaultWhatsappBody,
      reminderText: safeEditDrive.communicationSettings?.reminderText || defaultReminderBody,
    })

    setSkillWeightages(skillRubs.length ? skillRubs : skillWeightages)
    setCustomQuestions(customQs.length ? customQs : customQuestions)
    setImportedCandidates(existingCandidates.map((c, i) => ({
      id: `csv-${Date.now()}-${i}`,
      name: c?.name || 'Candidate',
      email: c?.email || '',
      phone: c?.phone || '',
      exp: c?.exp ? `${c.exp} yrs` : '',
      status: c?.status || 'INVITED',
      aiScore: Number(c?.aiScore) || 0,
      malpracticeFlags: Number(c?.malpracticeFlags) || 0,
    })))
  }, [open, editDrive])

  // Set questionBankId from existing round data when banks load
  useEffect(() => {
    if (!open || !editDrive || formData.questionBankId || !questionBanks.length) return
    const round1 = editDrive.rounds?.find((r) => r.roundNumber === 1) || {}
    const bankTitle = round1.questionBankTitle
    if (bankTitle) {
      const found = questionBanks.find((b) => b.title === bankTitle || b._id === bankTitle || b.id === bankTitle)
      if (found) setFormData((prev) => ({ ...prev, questionBankId: found._id || found.id }))
      else setFormData((prev) => ({ ...prev, questionBankId: questionBanks[0]._id || questionBanks[0].id }))
    } else {
      setFormData((prev) => ({ ...prev, questionBankId: questionBanks[0]._id || questionBanks[0].id }))
    }
  }, [open, editDrive, questionBanks])

  const communicationReady = useMemo(() => {
    if (!communication.emailEnabled && !communication.whatsappEnabled && !communication.callEnabled) {
      return false
    }

    if (communication.emailEnabled && !communication.invitationCustom && !invitationTemplate && !communication.invitationText.trim()) {
      return false
    }

    if (communication.emailEnabled && communication.invitationCustom && !communication.invitationText.trim()) {
      return false
    }

    if (communication.whatsappEnabled && !whatsappTemplate && !communication.whatsappText.trim()) {
      return false
    }

    return true
  }, [communication, invitationTemplate, whatsappTemplate])

  const communicationError = !communicationReady ? 'Choose at least one communication channel and provide a valid template before scheduling.' : ''

  const timelineItems = [
    { title: 'Interview scheduled', time: 'Immediately', channel: communication.emailEnabled || communication.whatsappEnabled ? 'Email + WhatsApp' : 'Manual setup', active: true },
    { title: 'Reminder', time: communication.reminderTiming === '24h' ? '24 hours before' : communication.reminderTiming === '1h' ? '1 hour before' : 'On the day', channel: communication.reminderEnabled ? 'Reminder Email' : 'Disabled', active: communication.reminderEnabled },
    { title: 'Interview', time: formData.expiryDate ? 'Scheduled date' : 'Pending', channel: 'Candidate flow', active: true },
  ]

  const handleChange = (field, value) => {
    setErrorMessage('')
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCriteriaNameChange = (idx, newName) =>
    setSkillWeightages((prev) => prev.map((item, i) => (i === idx ? { ...item, name: newName } : item)))

  const handleCriteriaWeightChange = (idx, newWeight) => {
    setErrorMessage('')
    const weight = Number(newWeight) || 0
    const clampedWeight = Math.min(weight, 100)

    const otherTotal = skillWeightages.reduce((acc, s, i) => acc + (i === idx ? 0 : s.weight), 0)
    if (otherTotal + clampedWeight > 100) {
      setErrorMessage(`Weight cannot exceed 100% total. Maximum allowed: ${Math.max(0, 100 - otherTotal)}%`)
      return
    }

    setSkillWeightages((prev) => prev.map((item, i) => (i === idx ? { ...item, weight: clampedWeight } : item)))
  }

  const handleAddCriteria = () =>
    setSkillWeightages((prev) => [...prev, { id: Date.now(), name: `New Evaluation Criteria #${prev.length + 1}`, weight: 10 }])

  const handleRemoveCriteria = (idx) => setSkillWeightages((prev) => prev.filter((_, i) => i !== idx))

  const handleAddCustomQuestion = () =>
    setCustomQuestions((prev) => [...prev, { id: Date.now(), text: '', topic: skillWeightages[0]?.name || 'General', timeLimit: 120 }])

  const handleRemoveCustomQuestion = (idx) => setCustomQuestions((prev) => prev.filter((_, i) => i !== idx))

  const handleCustomQuestionChange = (idx, field, value) =>
    setCustomQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)))

  const openStudentEdit = (student) => {
    setEditingStudent(student)
    setStudentEditForm({ name: student.name || '', email: student.email || '', phone: student.phone || '', exp: student.exp || '' })
  }

  const saveStudentEdit = () => {
    const name = studentEditForm.name.trim()
    const email = studentEditForm.email.trim().toLowerCase()
    if (!name || !email) return
    if (studentEditForm.phone && !/^\d{10}$/.test(studentEditForm.phone.trim())) return
    const editedExperience = studentEditForm.exp.trim().match(/^\d+(?:\.\d+)?/)?.[0]
    if (studentEditForm.exp && (!/^\d+(?:\.\d+)?(?:\s*(?:years?|yrs?))?$/.test(studentEditForm.exp.trim()) || !editedExperience || Number(editedExperience) <= 0 || Number(editedExperience) > 70)) return
    setImportedCandidates((prev) => prev.map((student) => student.id === editingStudent.id ? { ...student, ...studentEditForm, name, email } : student))
    setEditingStudent(null)
  }

  const addSingleStudent = () => {
    const name = singleStudent.name.trim()
    const email = singleStudent.email.trim().toLowerCase()
    if (!name || !email) {
      setSingleStudentError('Student name and email are required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSingleStudentError('Enter a valid email address.')
      return
    }
    if (singleStudent.phone && !/^\d{10}$/.test(singleStudent.phone.trim())) {
      setSingleStudentError('Phone must contain exactly 10 digits.')
      return
    }
    const singleExperience = singleStudent.exp.trim().match(/^\d+(?:\.\d+)?/)?.[0]
    if (singleStudent.exp && (!/^\d+(?:\.\d+)?(?:\s*(?:years?|yrs?))?$/.test(singleStudent.exp.trim()) || !singleExperience || Number(singleExperience) <= 0 || Number(singleExperience) > 70)) {
      setSingleStudentError('Experience must be greater than 0 and no more than 70 years.')
      return
    }
    if (importedCandidates.some((student) => student.email.toLowerCase() === email)) {
      setSingleStudentError('This email is already in the student roster.')
      return
    }
    setImportedCandidates((prev) => [...prev, {
      id: `manual-${Date.now()}`,
      name,
      email,
      phone: singleStudent.phone.trim(),
      exp: singleStudent.exp.trim(),
      status: 'INVITED',
      aiScore: 0,
      malpracticeFlags: 0,
    }])
    setSingleStudent({ name: '', email: '', phone: '', exp: '' })
    setSingleStudentError('')
  }

  const handleNext = () => {
    setErrorMessage('')
    if (step === 1 && (!formData.title.trim() || !formData.roleCategory.trim() || !formData.department.trim() || !formData.roundType.trim() || !formData.startDate || !formData.expiryDate)) {
      setErrorMessage('Please complete the drive details, role, department, interview type, start date, and expiry date.')
      return
    }
    if (step === 1) {
      const start = new Date(`${formData.startDate}T00:00:00`)
      const expiry = new Date(`${formData.expiryDate}T00:00:00`)
      const today = new Date(`${todayInput}T00:00:00`)
      const days = (expiry - start) / 86400000
      if (start < today) {
        setErrorMessage('Start date cannot be earlier than today.')
        return
      }
      if (expiry < start || days > 50) {
        setErrorMessage('Please select a correct expiry date within 50 days of the start date.')
        return
      }
    }
    if (step === 1 && formData.expiryDate < formData.startDate) {
      setErrorMessage('Expiry date cannot be before the start date.')
      return
    }
    if (step === 2) {
      const totalWeight = skillWeightages.reduce((acc, s) => acc + s.weight, 0)
      if (totalWeight !== 100) {
        setErrorMessage(`Total skill criteria weightage must sum to 100% (currently ${totalWeight}%).`)
        return
      }
    }
    if (step === 5 && !communicationReady) {
      setErrorMessage(communicationError)
      return
    }
    setStep((prev) => Math.min(prev + 1, 6))
  }

  const handleBack = () => {
    setErrorMessage('')
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleTemplateInsert = (kind, token) => {
    const valueKey = `${kind}Text`
    setCommunication((prev) => ({
      ...prev,
      [valueKey]: `${prev[valueKey] || ''}${prev[valueKey] ? '\n' : ''}{{${token}}}`,
    }))
  }

  const replaceTemplateVariables = (text = '') => {
    const values = {
      candidate_name: 'Priya Sharma',
      organization_name: orgName,
      role: formData.title || 'Software Engineer',
      interview_date: '12 September 2026',
      interview_time: '11:00 AM',
      interview_link: 'https://workmateiq.com/interview/abc123',
    }

    return text.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, key) => values[key] ?? `{{${key}}}`)
  }

  const handleSubmit = async (e, saveAsDraft = false) => {
    e?.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    if (!saveAsDraft && (!formData.title.trim() || !formData.roleCategory.trim() || !formData.department.trim() || !formData.roundType.trim() || !formData.startDate || !formData.expiryDate)) {
      setErrorMessage('Please complete the required drive details and dates.')
      setSubmitting(false)
      return
    }

    if (!saveAsDraft) {
      const start = new Date(`${formData.startDate}T00:00:00`)
      const expiry = new Date(`${formData.expiryDate}T00:00:00`)
      const today = new Date(`${todayInput}T00:00:00`)
      const days = (expiry - start) / 86400000
      if (start < today || expiry < start || days > 50) {
        setErrorMessage('Please select dates from today with an expiry no more than 50 days after the start date.')
        setSubmitting(false)
        return
      }
    }

    if (!saveAsDraft && !communicationReady) {
      setErrorMessage(communicationError)
      setSubmitting(false)
      return
    }

    const totalWeight = skillWeightages.reduce((acc, s) => acc + s.weight, 0)
    if (!saveAsDraft && totalWeight !== 100) {
      setErrorMessage(`Total skill criteria weightage must sum to 100% (currently ${totalWeight}%).`)
      setSubmitting(false)
      return
    }

    const selectedBank = questionBanks.find((b) => (b._id || b.id) === formData.questionBankId)

    const payload = {
      title: formData.title.trim(),
      roleCategory: formData.roleCategory,
      department: formData.department,
      experienceLevel: formData.experienceLevel,
      totalRounds: Number(formData.totalRounds) || 2,
      roundType: formData.roundType,
      startDate: formData.startDate,
      expiryDate: formData.expiryDate,
      status: saveAsDraft ? 'DRAFT' : 'ACTIVE',
      questionMode: formData.questionMode,
      questionBankTitle: formData.questionMode === 'PREBUILT' ? (selectedBank ? selectedBank.title : 'Pre-built Question Set') : `Custom Question Set (${customQuestions.length} Qs)`,
      customQuestionsList: formData.questionMode === 'CUSTOM' ? customQuestions : [],
      skillRubrics: skillWeightages,
      passingThreshold: Number(formData.passingThreshold) || 70,
      candidatesCount: importedCandidates.length,
      importedCandidateList: importedCandidates,
      enablePublicLink: formData.enablePublicLink,
      communicationSettings: communication,
    }

    try {
      const response = isEditing
        ? await updateRound(editDrive._id || editDrive.id, 1, {
            ...payload,
            driveDetails: {
              title: payload.title,
              roleCategory: payload.roleCategory,
              department: payload.department,
              experienceLevel: payload.experienceLevel,
              roundType: payload.roundType,
              totalRounds: payload.totalRounds,
              startDate: payload.startDate,
              expiryDate: payload.expiryDate,
            },
          })
        : await createInterviewDrive(payload)
      onCreateDrive(response)
      onClose()
      setStep(1)
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isEditing ? 'Edit Interview Drive' : 'Create Interview Drive'}
        subtitle={isEditing ? 'Update the interview drive details and evaluation setup.' : 'Build your interview drive by adding candidates and evaluation steps.'}
        status={isEditing ? (editDrive?.status || 'Draft') : 'Draft'}
        headerAction={<Button type="button" variant="secondary" size="xs" onClick={() => handleSubmit(null, true)} disabled={submitting}><Check size={13} /> {submitting ? (isEditing ? 'Saving...' : 'Saving...') : (isEditing ? 'Save Draft' : 'Save as Draft')}</Button>}
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

            {step < 6 ? (
              <Button type="button" size="sm" onClick={handleNext} disabled={step === 1 && (!formData.title.trim() || !formData.roleCategory.trim() || !formData.department.trim() || !formData.roundType.trim() || !formData.startDate || !formData.expiryDate)}>
                Continue <ArrowRight size={14} />
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleSubmit} disabled={submitting || (!isEditing && !communicationReady)}>
                <Check size={14} /> {submitting ? (isEditing ? 'Updating...' : 'Scheduling...') : (isEditing ? 'Update Drive' : 'Schedule & Send')}
              </Button>
            )}
          </div>
        }
      >
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-[13.5px] font-medium flex items-center gap-2.5 max-w-4xl mx-auto">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mx-auto mb-5 w-full max-w-6xl overflow-x-auto rounded-2xl border border-line bg-card px-4 py-3 shadow-(--shadow-soft)">
          <div className="flex min-w-[760px] items-center justify-between">
          {[
            { num: 1, label: 'Interview / Drive Details' },
            { num: 2, label: 'Evaluation Criteria' },
            { num: 3, label: 'Question Screen' },
            { num: 4, label: 'Candidate Details' },
            { num: 5, label: 'Communication' },
            { num: 6, label: 'Review' },
          ].map((s) => (
            <div key={s.num} className="relative flex items-center gap-2.5 shrink-0 px-2">
              <div
                className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
                  step === s.num ? 'border-accent bg-accent text-white shadow-(--shadow-soft)' : step > s.num ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[#dbe2ef] bg-[#f2f5fa] text-text-secondary'
                }`}
              >
                {step > s.num ? <Check size={15} /> : s.num}
              </div>
              <span className={`text-[10.5px] font-semibold whitespace-nowrap ${step === s.num ? 'text-ink' : 'text-text-secondary'}`}>
                {s.label}
              </span>
            </div>
          ))}
          </div>
        </div>

        {step === 1 && (
          <div className="mx-auto max-w-5xl space-y-4 py-1">
            <div className="rounded-2xl border border-white/90 bg-white p-4 shadow-(--shadow-soft) sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><CalendarDays size={18} /></div>
                <div>
                  <h3 className="text-[18px] font-bold text-ink">Interview / Drive Details</h3>
                  <p className="mt-1 text-[12px] text-text-secondary">Provide the basic information for this interview drive.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input label="Interview name *" placeholder="e.g. Senior Product Manager Interview Drive" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} required />
                <div className="grid gap-4 sm:grid-cols-2">
              <EditableSelect label="Position / role *" placeholder="Select or add a role" options={ROLE_CATEGORIES} value={formData.roleCategory} onChange={(e) => handleChange('roleCategory', e.target.value)} />
              <EditableSelect label="Department *" placeholder="Select or add a department" options={DEPARTMENTS} value={formData.department} onChange={(e) => handleChange('department', e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
              <EditableSelect label="Experience" placeholder="Select or add experience" options={EXPERIENCE_LEVELS} value={formData.experienceLevel} onChange={(e) => handleChange('experienceLevel', e.target.value)} />
              <EditableSelect label="Interview type *" placeholder="Select or add interview type" options={INTERVIEW_TYPES} value={formData.roundType} onChange={(e) => handleChange('roundType', e.target.value)} />
              <Select label="Language" value={'English'} onChange={() => {}} options={[{ value: 'English', label: 'English' }, { value: 'Hindi', label: 'Hindi' }]} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
              <Select label="Number of rounds" value={formData.totalRounds} onChange={(e) => handleChange('totalRounds', e.target.value)} options={[{ value: '1', label: '1 round' }, { value: '2', label: '2 rounds' }, { value: '3', label: '3 rounds' }, { value: '4', label: '4 rounds' }]} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Start date *" type="date" min={todayInput} value={formData.startDate} onChange={(e) => handleChange('startDate', e.target.value)} />
              <Input label="Expiry date *" type="date" min={formData.startDate || todayInput} max={formData.startDate ? formatDateInput(new Date(new Date(`${formData.startDate}T00:00:00`).getTime() + 50 * 86400000)) : undefined} value={formData.expiryDate} onChange={(e) => handleChange('expiryDate', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 max-w-5xl mx-auto py-2">
            <CriteriaWeightageBuilder
              skillWeightages={skillWeightages}
              onCriteriaNameChange={handleCriteriaNameChange}
              onCriteriaWeightChange={handleCriteriaWeightChange}
              onAddCriteria={handleAddCriteria}
              onRemoveCriteria={handleRemoveCriteria}
            />
            <div className="grid sm:grid-cols-2 gap-6 p-6 rounded-2xl border border-line bg-card">
              <Input label="AI passing threshold (%)" type="number" value={formData.passingThreshold} onChange={(e) => handleChange('passingThreshold', e.target.value)} />
              <Select label="Default max time per answer" value={formData.timePerQuestion} onChange={(e) => handleChange('timePerQuestion', e.target.value)} options={[{ value: '60', label: '1 Minute' }, { value: '120', label: '2 Minutes' }, { value: '180', label: '3 Minutes' }]} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 max-w-5xl mx-auto py-2">
            {banksLoading && <p className="text-[13px] text-text-secondary">Loading question banks...</p>}
            <QuestionSetBuilder
              questionMode={formData.questionMode}
              onQuestionModeChange={(mode) => handleChange('questionMode', mode)}
              questionBanks={questionBanks.map((b) => ({ id: b._id || b.id, title: b.title, questions: b.questionCount ?? b.questions?.length ?? 0, questionList: Array.isArray(b.questions) ? b.questions : [], duration: b.durationMinutes ? `${b.durationMinutes} mins` : '' }))}
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

        {step === 4 && (
          <div className="mx-auto max-w-5xl space-y-5 py-2">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><Users size={20} /></div>
                <div><h3 className="text-[20px] font-bold text-ink">Candidate Details</h3><p className="mt-1 text-[12px] text-text-secondary">Add students and choose how they will access this interview drive.</p></div>
              </div>
              <div className="rounded-xl border border-accent/15 bg-accent/5 px-3 py-2 text-[11px] font-semibold text-accent"><Users size={14} className="mr-1.5 inline" />{importedCandidates.length} candidates added</div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-line bg-card p-5 shadow-(--shadow-soft) sm:p-6">
                <div><h4 className="text-[15px] font-bold text-ink">Upload candidate list</h4><p className="mt-1 text-[12px] text-text-secondary">Add multiple candidates at once using a CSV file.</p></div>
                <button type="button" onClick={() => setImportModalOpen(true)} className="mt-5 flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-accent/20 bg-accent/[0.025] px-5 text-center transition hover:border-accent/45 hover:bg-accent/[0.05]">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent"><FileSpreadsheet size={24} /></div>
                  <span className="text-[14px] font-bold text-ink">Drag & drop your CSV file here</span>
                  <span className="my-1 text-[12px] text-text-secondary">or <span className="font-semibold text-accent">click to upload</span></span>
                  <span className="text-[10px] text-text-secondary">Supported format: .csv (max 5MB)</span>
                </button>
              </div>

              <div className="rounded-2xl border border-line bg-card p-5 shadow-(--shadow-soft) sm:p-6">
                <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><Link2 size={17} /></div><div><h4 className="text-[15px] font-bold text-ink">Public candidate link</h4><p className="mt-1 text-[12px] text-text-secondary">Let candidates open this drive from a shareable URL.</p></div></div><button type="button" aria-pressed={formData.enablePublicLink} onClick={() => handleChange('enablePublicLink', !formData.enablePublicLink)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${formData.enablePublicLink ? 'bg-accent' : 'bg-black/10'}`}><span className={`inline-block h-4 w-4 rounded-full bg-white transition ${formData.enablePublicLink ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
                <div className={`mt-6 rounded-xl border p-4 text-[12px] ${formData.enablePublicLink ? 'border-accent/20 bg-accent/5 text-ink' : 'border-line bg-black/[0.02] text-text-secondary'}`}>{formData.enablePublicLink ? 'A unique public URL will be generated after you create the drive.' : 'Public access is off. Candidates must be invited through another channel.'}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5 shadow-(--shadow-soft) sm:p-6">
              <div className="mb-5 flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><UserPlus size={17} /></div><div><h4 className="text-[15px] font-bold text-ink">Add candidate manually</h4><p className="mt-1 text-[12px] text-text-secondary">Use this when a candidate was missed from the spreadsheet.</p></div></div>
              <div className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1.2fr_0.9fr_0.7fr_auto]">
                <Input label="Full name *" placeholder="e.g. Rahul Verma" value={singleStudent.name} onChange={(e) => setSingleStudent((prev) => ({ ...prev, name: e.target.value }))} />
                <Input label="Email address *" placeholder="e.g. rahul@gmail.com" type="email" value={singleStudent.email} onChange={(e) => setSingleStudent((prev) => ({ ...prev, email: e.target.value }))} />
                <Input label="Phone" placeholder="10 digit number" inputMode="numeric" maxLength={10} value={singleStudent.phone} onChange={(e) => setSingleStudent((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))} />
                <Input label="Experience" placeholder="Years" inputMode="decimal" min="0.01" value={singleStudent.exp} onChange={(e) => setSingleStudent((prev) => ({ ...prev, exp: sanitizePositiveExperience(e.target.value) }))} />
                <Button type="button" onClick={addSingleStudent} className="h-10 whitespace-nowrap"><Plus size={15} /> Add candidate</Button>
              </div>
              {singleStudentError && <p className="mt-3 text-[12px] text-red-600">{singleStudentError}</p>}
            </div>

            <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-(--shadow-soft)
            ">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><Users size={17} /></div><div><h4 className="text-[15px] font-bold text-ink">Student roster</h4><p className="mt-1 text-[12px] text-text-secondary">Review all candidates before continuing.</p></div></div><span className="rounded-full bg-bg px-3 py-1 text-[11px] font-bold text-text-secondary">{importedCandidates.length} candidates</span></div>
              {importedCandidates.length ? (
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-[12.5px]">
                    <thead className="sticky top-0 bg-card border-b border-line text-[11px] uppercase tracking-wider text-text-secondary">
                      <tr>
                        <th className="px-5 py-3">Student name</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3">Experience</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {importedCandidates.map((candidate) => (
                        <tr key={candidate.id} className="text-ink">
                          <td className="px-5 py-3 font-semibold">{candidate.name}</td>
                          <td className="px-5 py-3 text-text-secondary">{candidate.email}</td>
                          <td className="px-5 py-3 text-text-secondary">{candidate.phone || '—'}</td>
                          <td className="px-5 py-3 text-text-secondary">{candidate.exp || '—'}</td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <button type="button" onClick={() => openStudentEdit(candidate)} className="inline-flex p-2 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10" title="Edit student details" aria-label="Edit student details">
                              <Pencil size={14} />
                            </button>
                            <button type="button" onClick={() => setImportedCandidates((prev) => prev.filter((student) => student.id !== candidate.id))} className="inline-flex p-2 rounded-lg text-text-secondary hover:text-red-600 hover:bg-red-50" title="Remove student" aria-label="Remove student">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center"><div className="relative mb-4 flex h-16 w-20 items-end justify-center text-accent/40"><Users size={45} strokeWidth={1.3} /><Users size={29} className="absolute bottom-0 left-1" strokeWidth={1.5} /><Users size={29} className="absolute bottom-0 right-1" strokeWidth={1.5} /></div><p className="text-[14px] font-bold text-ink">No students added yet</p><p className="mt-1 max-w-sm text-[12px] text-text-secondary">Upload a CSV file or add candidates manually to see them listed here.</p></div>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 max-w-5xl mx-auto py-2">
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-card p-2">
              {[
                { id: 'email', label: 'Email', icon: Mail, enabled: communication.emailEnabled },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquareText, enabled: communication.whatsappEnabled },
                { id: 'call', label: 'Call', icon: Phone, enabled: communication.callEnabled },
              ].map(({ id, label, icon: Icon, enabled }) => (
                <button type="button" key={id} onClick={() => setCommunicationChannel(id)} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-colors ${communicationChannel === id ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'}`}>
                  <Icon size={16} /> {label}
                  <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-black/20 dark:bg-white/20'}`} />
                </button>
              ))}
            </div>
            <div className="grid xl:grid-cols-[1.3fr_0.9fr] gap-6">
              <div className="space-y-5">
                {communicationChannel === 'email' && <div className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center"><Mail size={18} /></div>
                      <div>
                        <h4 className="text-[15px] font-bold text-ink">Email</h4>
                        <p className="text-[12px] text-text-secondary">Invitation message</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setCommunication((prev) => ({ ...prev, emailEnabled: !prev.emailEnabled }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${communication.emailEnabled ? 'bg-accent' : 'bg-black/10'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${communication.emailEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <Select label="Template" value={communication.invitationTemplateId} onChange={(e) => setCommunication((prev) => ({ ...prev, invitationTemplateId: e.target.value, invitationCustom: false }))} options={templates.length ? templates.map((template) => ({ value: template.id, label: template.name })) : [{ value: '', label: 'No templates available' }]} />
                    <div className="rounded-2xl border border-line bg-[#f9f6f6] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Preview</p>
                          <p className="text-[13px] font-semibold text-ink">{invitationTemplate?.subject || 'Interview Invitation'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" size="xs" onClick={() => { setCommunication((prev) => ({ ...prev, invitationCustom: true })); setEmailEditorOpen(true) }} title="Edit email template">
                            <Edit3 size={13} />
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#f0e7e7] bg-white p-4 text-[13px] leading-relaxed text-ink whitespace-pre-wrap min-h-[160px]">
                        {replaceTemplateVariables(communication.invitationCustom ? communication.invitationText : invitationTemplate?.body || communication.invitationText)}
                      </div>
                    </div>
                  </div>
                </div>}

                <Modal open={emailEditorOpen} onClose={() => setEmailEditorOpen(false)} title="Edit email invitation" size="lg" footer={
                  <>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEmailEditorOpen(false)}>Cancel</Button>
                    <Button type="button" size="sm" onClick={() => setEmailEditorOpen(false)}><Check size={14} /> Save template</Button>
                  </>
                }>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[13px] font-semibold text-ink">Invitation message</p>
                      <p className="text-[12px] text-text-secondary mt-1">Use dynamic variables to personalize every candidate email.</p>
                    </div>
                    <Textarea label="Message content" rows={12} value={communication.invitationText} onChange={(e) => setCommunication((prev) => ({ ...prev, invitationText: e.target.value }))} />
                    <div>
                      <p className="text-[12px] font-medium text-text-secondary mb-2">Available variables</p>
                      <div className="flex flex-wrap gap-2">
                        {VARIABLE_TAGS.map((token) => (
                          <button key={token} type="button" onClick={() => handleTemplateInsert('invitation', token)} className="px-2.5 py-1.5 rounded-lg border border-line bg-card text-[11px] font-medium text-accent hover:bg-accent/5">+ {token}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Modal>

                {communicationChannel === 'email' && <div className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><BellRing size={18} /></div>
                      <div>
                        <h4 className="text-[15px] font-bold text-ink">Reminder Email</h4>
                        <p className="text-[12px] text-text-secondary">Before interview</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setCommunication((prev) => ({ ...prev, reminderEnabled: !prev.reminderEnabled }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${communication.reminderEnabled ? 'bg-accent' : 'bg-black/10'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${communication.reminderEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Select label="Send reminder" value={communication.reminderTiming} onChange={(e) => setCommunication((prev) => ({ ...prev, reminderTiming: e.target.value }))} options={[{ value: '24h', label: '24 hours before' }, { value: '1h', label: '1 hour before' }, { value: 'day', label: 'On the day' }]} />
                    <Select label="Template" value={communication.reminderTemplateId} onChange={(e) => setCommunication((prev) => ({ ...prev, reminderTemplateId: e.target.value }))} options={templates.length ? templates.filter((template) => /remind|follow/i.test(template.name || '')).map((template) => ({ value: template.id, label: template.name })) : [{ value: '', label: 'No reminder templates' }]} />
                  </div>
                </div>}

                {communicationChannel === 'whatsapp' && <div className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center"><MessageSquareText size={18} /></div>
                      <div>
                        <h4 className="text-[15px] font-bold text-ink">WhatsApp</h4>
                        <p className="text-[12px] text-text-secondary">Candidate message</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setCommunication((prev) => ({ ...prev, whatsappEnabled: !prev.whatsappEnabled }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${communication.whatsappEnabled ? 'bg-accent' : 'bg-black/10'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${communication.whatsappEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="space-y-3">
                      <div className="flex items-end gap-2">
                        <div className="flex-1"><Select label="Template" value={communication.whatsappTemplateId} onChange={(e) => setCommunication((prev) => ({ ...prev, whatsappTemplateId: e.target.value, whatsappCustom: false }))} options={templates.filter((template) => /whatsapp|sms/i.test(template.name || '')).map((template) => ({ value: template.id, label: template.name })).concat([{ value: '', label: 'Use message editor' }])} /></div>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setCommunication((prev) => ({ ...prev, whatsappCustom: !prev.whatsappCustom }))}>{communication.whatsappCustom ? 'Use template' : 'Edit'}</Button>
                      </div>
                      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{orgName}</span>
                            <span className="text-[10px] uppercase tracking-[0.12em] text-text-secondary">Now</span>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-[#f3f2f1] p-3 text-[13px] leading-relaxed text-ink whitespace-pre-wrap">
                          {replaceTemplateVariables(communication.whatsappCustom ? communication.whatsappText : whatsappTemplate?.body || communication.whatsappText)}
                        </div>
                      </div>
                      {communication.whatsappCustom && <Textarea label="WhatsApp message" rows={5} value={communication.whatsappText} onChange={(e) => setCommunication((prev) => ({ ...prev, whatsappText: e.target.value }))} />}
                      {!whatsappTemplate && !communication.whatsappCustom && <p className="text-[12px] text-text-secondary">No saved WhatsApp template is available. Select Edit to create this message for the drive.</p>}
                    </div>
                </div>}

                {communicationChannel === 'call' && <div className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center"><Phone size={18} /></div>
                      <div>
                        <h4 className="text-[15px] font-bold text-ink">Call</h4>
                        <p className="text-[12px] text-text-secondary">Automated call flow</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setCommunication((prev) => ({ ...prev, callEnabled: !prev.callEnabled }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${communication.callEnabled ? 'bg-accent' : 'bg-black/10'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${communication.callEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {communication.callEnabled ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Select label="Call type" value={communication.callType} onChange={(e) => setCommunication((prev) => ({ ...prev, callType: e.target.value }))} options={[{ value: 'automated', label: 'Automated Call' }, { value: 'live', label: 'Live Agent Call' }]} />
                      <Select label="Timing" value={communication.callTiming} onChange={(e) => setCommunication((prev) => ({ ...prev, callTiming: e.target.value }))} options={[{ value: '1d', label: '1 day before' }, { value: '3h', label: '3 hours before' }]} />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-line bg-neutral-50 p-4 text-[13px] text-text-secondary">CALL — Coming soon</div>
                  )}
                </div>}
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock3 size={16} className="text-accent" />
                    <h4 className="text-[14px] font-bold text-ink">Communication timeline</h4>
                  </div>
                  <div className="space-y-4">
                    {timelineItems.map((item, index) => (
                      <div key={item.title} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${item.active ? 'bg-accent' : 'bg-black/10'}`} />
                          {index < timelineItems.length - 1 && <div className="w-px h-10 bg-line mt-2" />}
                        </div>
                        <div className="flex-1 rounded-xl border border-line bg-[#faf7f7] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-[13px] text-ink">{item.title}</span>
                            <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">{item.time}</span>
                          </div>
                          <p className="mt-2 text-[12px] text-text-secondary">{item.channel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-accent" />
                    <h4 className="text-[14px] font-bold text-ink">Final review snapshot</h4>
                  </div>
                  <div className="space-y-3 text-[12.5px] text-text-secondary">
                    <div className="flex justify-between"><span>Role</span><span className="font-medium text-ink">{formData.title || 'Not set'}</span></div>
                    <div className="flex justify-between"><span>Start date</span><span className="font-medium text-ink">{formData.startDate || 'Not set'}</span></div>
                    <div className="flex justify-between"><span>Expiry date</span><span className="font-medium text-ink">{formData.expiryDate || 'Not set'}</span></div>
                    <div className="flex justify-between"><span>Email</span><span className="font-medium text-ink">{communication.emailEnabled ? 'Enabled' : 'Disabled'}</span></div>
                    <div className="flex justify-between"><span>WhatsApp</span><span className="font-medium text-ink">{communication.whatsappEnabled ? 'Enabled' : 'Disabled'}</span></div>
                    <div className="flex justify-between"><span>Reminder</span><span className="font-medium text-ink">{communication.reminderEnabled ? 'Enabled' : 'Disabled'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="max-w-5xl mx-auto py-2">
            <div className="mb-6">
              <h3 className="text-[22px] font-bold text-ink">Review & Schedule</h3>
              <p className="text-[13px] text-text-secondary mt-1">Confirm the interview details and delivery plan before sending.</p>
            </div>

            <div className="grid gap-5 mb-6 lg:grid-cols-4">
              <div className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Interview</p><button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent-dark"><Pencil size={12} /> Edit</button></div>
                <div className="space-y-2 text-[13px] text-text-secondary">
                  <div className="flex justify-between gap-4"><span>Role</span><span className="font-medium text-ink text-right">{formData.title || '—'}</span></div>
                  <div className="flex justify-between gap-4"><span>Type</span><span className="font-medium text-ink text-right">{formData.roundType}</span></div>
                  <div className="flex justify-between gap-4"><span>Start date</span><span className="font-medium text-ink text-right">{formData.startDate || '—'}</span></div>
                  <div className="flex justify-between gap-4"><span>Expiry date</span><span className="font-medium text-ink text-right">{formData.expiryDate || '—'}</span></div>
                  <div className="flex justify-between gap-4"><span>Time</span><span className="font-medium text-ink text-right">11:00 AM</span></div>
                  <div className="flex justify-between gap-4"><span>Duration</span><span className="font-medium text-ink text-right">{formData.timePerQuestion || '—'} min</span></div>
                  <div className="flex items-center justify-between gap-4"><span>Evaluation Criteria</span><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-1 font-bold text-accent hover:text-accent-dark"><span>{skillWeightages.length} criteria</span><Pencil size={11} /></button></div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Candidates</p><button type="button" onClick={() => setStep(4)} className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent-dark"><Pencil size={12} /> Edit</button></div>
                <div className="flex items-end gap-2"><span className="text-3xl font-bold text-ink">{importedCandidates.length}</span><span className="pb-1 text-[12px] text-text-secondary">added to roster</span></div>
                <p className="mt-3 text-[12px] text-text-secondary">{formData.enablePublicLink ? 'Public candidate link enabled' : 'Candidates will be invited directly'}</p>
              </div>

              <div className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Question Screen</p><button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent-dark"><Pencil size={12} /> Edit</button></div>
                <div className="space-y-2 text-[13px] text-text-secondary">
                  <div className="flex justify-between gap-4"><span>Mode</span><span className="font-medium text-ink">{formData.questionMode === 'PREBUILT' ? 'Pre-built Bank' : 'Custom Questions'}</span></div>
                  <div className="flex justify-between gap-4"><span>Custom Questions</span><span className="font-medium text-ink">{customQuestions.length}</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Communication</p><button type="button" onClick={() => setStep(5)} className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent-dark"><Pencil size={12} /> Edit</button></div>
                <div className="space-y-2 text-[13px] text-text-secondary">
                  <div className="flex justify-between gap-4"><span>Email</span><span className="font-medium text-ink">{communication.emailEnabled ? 'Enabled' : 'Disabled'}</span></div>
                  <div className="flex justify-between gap-4"><span>WhatsApp</span><span className="font-medium text-ink">{communication.whatsappEnabled ? 'Enabled' : 'Disabled'}</span></div>
                  <div className="flex justify-between gap-4"><span>Call</span><span className="font-medium text-ink">{communication.callEnabled ? 'Enabled' : 'Disabled'}</span></div>
                  <div className="flex justify-between gap-4"><span>Reminder</span><span className="font-medium text-ink">{communication.reminderEnabled ? 'Enabled' : 'Disabled'}</span></div>
                  <div className="flex justify-between gap-4"><span>Timing</span><span className="font-medium text-ink">{communication.reminderTiming === '24h' ? '24 hours before' : '1 hour before'}</span></div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5">
              <div className="mb-3 flex items-center justify-between gap-3 text-ink">
                <div className="flex items-center gap-2">
                <CalendarDays size={17} className="text-accent" />
                <h4 className="text-[15px] font-bold">Templates</h4>
                </div>
                <button type="button" onClick={() => setStep(5)} className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent-dark"><Pencil size={12} /> Edit</button>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-[13px] text-text-secondary">
                <div className="rounded-xl border border-line bg-[#faf7f7] p-3"><span className="block text-[11px] uppercase tracking-[0.12em] mb-1">Invitation</span><span className="font-medium text-ink">{invitationTemplate?.name || 'Standard'}</span></div>
                <div className="rounded-xl border border-line bg-[#faf7f7] p-3"><span className="block text-[11px] uppercase tracking-[0.12em] mb-1">WhatsApp</span><span className="font-medium text-ink">{whatsappTemplate?.name || 'Not configured'}</span></div>
                <div className="rounded-xl border border-line bg-[#faf7f7] p-3"><span className="block text-[11px] uppercase tracking-[0.12em] mb-1">Reminder</span><span className="font-medium text-ink">{reminderTemplate?.name || 'Interview Reminder'}</span></div>
              </div>
            </div>

          </div>
        )}
      </Modal>
      <CandidateImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={(candidates) => setImportedCandidates(candidates.map((candidate, index) => ({
          id: `csv-${Date.now()}-${index}`,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          exp: candidate.exp ? `${candidate.exp} yrs` : '',
          status: 'INVITED',
          aiScore: 0,
          malpracticeFlags: 0,
        })))}
      />
      <Modal open={Boolean(editingStudent)} onClose={() => setEditingStudent(null)} title="Edit student details" size="md" footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditingStudent(null)}>Cancel</Button>
          <Button type="button" size="sm" onClick={saveStudentEdit} disabled={!studentEditForm.name.trim() || !studentEditForm.email.trim()}>Save changes</Button>
        </>
      }>
        <div className="space-y-4">
          <Input label="Full name" value={studentEditForm.name} onChange={(e) => setStudentEditForm((prev) => ({ ...prev, name: e.target.value }))} />
          <Input label="Email address" type="email" value={studentEditForm.email} onChange={(e) => setStudentEditForm((prev) => ({ ...prev, email: e.target.value }))} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Phone" inputMode="numeric" maxLength={10} value={studentEditForm.phone} onChange={(e) => setStudentEditForm((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))} />
            <Input label="Experience" inputMode="decimal" min="0.01" value={studentEditForm.exp} onChange={(e) => setStudentEditForm((prev) => ({ ...prev, exp: sanitizePositiveExperience(e.target.value) }))} />
          </div>
        </div>
      </Modal>
    </>
  )
}

export default CreateDriveModal
