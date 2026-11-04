import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
    ShieldCheck,
    CheckCircle2,
    ArrowRight,
    AlertTriangle,
    Loader2,
    Eye,
    Upload,
    X,
    ChevronLeft,
    ChevronRight,
    Check,
    FileText,
    Download,
    AlertCircle
} from 'lucide-react'
import { Card, Button, Input, Select, Textarea } from '../../components/ui'
import { getOnboardingFileLink, getOnboarding, autosaveOnboarding, uploadOnboardingFile, submitOnboarding } from '../../api/onboardingApi'
import { getCaptcha } from '../../api/registrationsApi'
import logo from '../../assets/logo.png'

// Helper to check if a field is of file/image type
const isFileType = (type) => ['FILE', 'IMAGE', 'MULTI_FILE'].includes(type)
// A conditional field (visibility: { field, equals }) only appears, and is only validated, when its condition holds.
const isFieldVisible = (field, data) => !field.visibility?.field || String(data?.[field.visibility.field] ?? '') === String(field.visibility.equals)
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@workmateiq.com'
const fieldLabelParts = (field) => field.required
    ? <span className="text-red-500 ml-0.5">*</span>
    : <span className="text-text-secondary font-normal ml-1">(optional)</span>

// Loads the file once (so a failure can be reported) and shows it as an image or a PDF. A missing file, a storage
// outage or a non-PDF response becomes a visible message with a retry instead of a blank frame.
function FilePreviewBody({ file }) {
    const [state, setState] = useState({ status: 'loading', objectUrl: '', message: '' })
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let cancelled = false
        let objectUrl = ''
        if (file.pending) { setState({ status: 'loading', objectUrl: '', message: '' }); return undefined }
        if (!file.url) { setState({ status: 'error', objectUrl: '', message: 'The file could not be opened right now.' }); return undefined }
        setState({ status: 'loading', objectUrl: '', message: '' })
        ;(async () => {
            try {
                const res = await fetch(file.url, { credentials: 'include' })
                if (!res.ok) {
                    const msg = res.status === 404 ? 'This file could not be found.'
                        : res.status === 401 || res.status === 403 ? 'You do not have access to this file.'
                            : 'The file could not be loaded right now.'
                    throw new Error(msg)
                }
                const blob = await res.blob()
                const wantsPdf = file.type === 'application/pdf'
                if (wantsPdf && !/pdf/i.test(blob.type)) throw new Error('The server did not return a valid PDF.')
                objectUrl = URL.createObjectURL(blob)
                if (!cancelled) setState({ status: 'ready', objectUrl, message: '' })
            } catch (err) {
                if (!cancelled) setState({ status: 'error', objectUrl: '', message: err?.message || 'The file could not be loaded.' })
            }
        })()
        return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
    }, [file.url, file.type, file.pending, attempt])

    const downloadHref = `${file.url}${file.url.includes('?') ? '&' : '?'}download=1`
    if (state.status === 'loading') {
        return <p role="status" className="text-[13.5px] text-text-secondary py-16">Loading preview...</p>
    }
    if (state.status === 'error') {
        return (
            <div role="alert" className="text-center py-12 space-y-3">
                <FileText size={44} className="text-text-secondary mx-auto" />
                <p className="text-[14px] text-ink font-medium">{state.message}</p>
                <Button size="sm" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
            </div>
        )
    }
    if (file.type?.startsWith('image/')) {
        return <img src={state.objectUrl} alt={file.name} className="max-w-full max-h-[70vh] object-contain rounded-lg border border-line bg-white shadow-sm" />
    }
    if (file.type === 'application/pdf') {
        return <iframe src={state.objectUrl} title={file.name} className="w-full h-[70vh] rounded-lg border border-line bg-white" />
    }
    return (
        <div className="text-center py-12 space-y-4">
            <FileText size={48} className="text-text-secondary mx-auto" />
            <p className="text-[14px] text-text-secondary font-medium">Preview not available for this file type</p>
            <a href={downloadHref}><Button size="sm">Download File</Button></a>
        </div>
    )
}

function OnboardingFlow() {
    const { type, token } = useParams()
    const [phase, setPhase] = useState('loading') // loading | error | welcome | form | submitted
    const [error, setError] = useState('')
    const [validationErrors, setValidationErrors] = useState({})

    const [onboarding, setOnboarding] = useState(null)
    const [schema, setSchema] = useState(null)
    const [formData, setFormData] = useState({})
    const [files, setFiles] = useState({})
    const [uploadingField, setUploadingField] = useState(null)
    const [uploadProgress, setUploadProgress] = useState({})

    const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
    const [consent, setConsent] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [reviewItems, setReviewItems] = useState([])
    const [currentStep, setCurrentStep] = useState(0) // 0-based index of sections
    const [branding, setBranding] = useState({ logoUrl: null, primaryColor: null, secondaryColor: null })

    // For file preview modal
    const [previewFile, setPreviewFile] = useState(null) // { name, url, type }
    // The link is requested at click time: private files open only through a short-lived signed URL.
    const openPreview = async (file) => {
        const base = { name: file.originalName, type: file.mimeType }
        setPreviewFile({ ...base, url: '', pending: true })
        try {
            const url = await getOnboardingFileLink(onboarding.id, file.fileId, token, type.toUpperCase())
            setPreviewFile({ ...base, url })
        } catch {
            setPreviewFile({ ...base, url: '' })
        }
    }

    // Captcha challenge states
    const [captcha, setCaptcha] = useState(null)
    const [captchaAnswer, setCaptchaAnswer] = useState('')

    const saveTimer = useRef(null)

    // Fetch onboarding details on load
    useEffect(() => {
        getOnboarding(type, token)
            .then((res) => {
                setOnboarding(res.onboarding)
                setSchema(res.form)
                setFormData(res.data || {})
                setReviewItems(res.reviewItems || [])
                setBranding(res.branding || { logoUrl: null, primaryColor: null, secondaryColor: null })

                const fileMap = {}
                for (const f of res.files || []) fileMap[f.fieldKey] = f
                setFiles(fileMap)

                // Restore progress step
                const backendStep = res.onboarding.currentStep ? res.onboarding.currentStep - 1 : 0
                setCurrentStep(Math.max(0, Math.min(backendStep, (res.form?.sections?.length || 1) - 1)))

                setPhase(res.onboarding.status === 'NOT_STARTED' ? 'welcome' : 'form')
            })
            .catch((err) => {
                setError(err.message || 'Failed to load onboarding session.')
                setPhase('error')
            })
    }, [type, token])

    // Fetch captcha when currentStep becomes the review step (Step 4)
    useEffect(() => {
        if (schema && currentStep === schema.sections.length) {
            getCaptcha()
                .then((res) => {
                    setCaptcha(res)
                    setCaptchaAnswer('')
                })
                .catch((err) => console.error('Failed to load captcha', err))
        }
    }, [currentStep, schema])

    // Debounced autosave
    const triggerAutosave = useCallback((values, stepIndex) => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setSaveState('saving')
        saveTimer.current = setTimeout(async () => {
            try {
                await autosaveOnboarding(onboarding.id, token, {
                    type: type.toUpperCase(),
                    data: values,
                    currentStep: stepIndex + 1
                })
                setSaveState('saved')
                setTimeout(() => setSaveState('idle'), 2000)
            } catch {
                setSaveState('error')
            }
        }, 700)
    }, [onboarding, token, type])

    // Handle value change for dynamic fields
    const handleFieldChange = (key, value) => {
        setFormData(prev => {
            const next = { ...prev, [key]: value }

            // Update branding colors state to be stored in the DB (kept in memory, but not injected onto the current page styling)
            if (key === 'primary_color') {
                setBranding(b => ({ ...b, primaryColor: value }))
            }
            if (key === 'secondary_color') {
                setBranding(b => ({ ...b, secondaryColor: value }))
            }

            // Clear validation error when user types
            if (validationErrors[key]) {
                setValidationErrors(errs => {
                    const nextErrs = { ...errs }
                    delete nextErrs[key]
                    return nextErrs
                })
            }

            triggerAutosave(next, currentStep)
            return next
        })
    }

    // Handle file uploads
    const handleFileUpload = async (fieldKey, file) => {
        const activeSection = schema.sections[currentStep]
        const field = activeSection.fields.find(f => f.key === fieldKey)
        const limitMb = field?.maxFileSizeMb || 10

        if (file.size > limitMb * 1024 * 1024) {
            alert(`File size exceeds the limit of ${limitMb}MB`)
            return
        }

        setUploadingField(fieldKey)
        setUploadProgress(prev => ({ ...prev, [fieldKey]: 0 }))

        try {
            const result = await uploadOnboardingFile(
                onboarding.id,
                token,
                { type: type.toUpperCase(), fieldKey, file },
                (percent) => {
                    setUploadProgress(prev => ({ ...prev, [fieldKey]: percent }))
                }
            )

            setFiles(prev => ({ ...prev, [fieldKey]: result }))

            // Update branding logo URL in memory so it stores correctly
            if (fieldKey === 'logo') {
                setBranding(b => ({
                    ...b,
                    logoUrl: ''
                }))
            }

            // Save form state to register file association
            triggerAutosave(formData, currentStep)
        } catch (err) {
            setError(err.message || 'File upload failed.')
        } finally {
            setUploadingField(null)
            setUploadProgress(prev => {
                const next = { ...prev }
                delete next[fieldKey]
                return next
            })
        }
    }

    // Section validation before proceeding
    const validateSection = (sectionIndex) => {
        const section = schema.sections[sectionIndex]
        const errors = {}

        for (const field of section.fields) {
            if (!isFieldVisible(field, formData)) continue
            const val = formData[field.key]
            const file = files[field.key]
            const isFile = isFileType(field.type)

            if (field.required) {
                const isMissing = isFile
                    ? !file
                    : Array.isArray(val)
                        ? val.length === 0
                        : (val === undefined || val === null || String(val).trim() === '')
                if (isMissing) {
                    errors[field.key] = `${field.label} is required.`
                    continue
                }
            }

            if (!isFile && val !== undefined && val !== null && val !== '') {
                if (field.type === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                    errors[field.key] = 'Please enter a valid email address.'
                }
                if (field.type === 'PHONE' && !/^[6-9][0-9]{9}$/.test(val)) {
                    errors[field.key] = 'Please enter a valid 10-digit mobile number.'
                }
                if (field.type === 'NUMBER') {
                    const num = Number(val)
                    const min = field.validation?.min ?? 0
                    const max = field.validation?.max
                    if (!Number.isInteger(num)) {
                        errors[field.key] = `${field.label} must be a whole number.`
                    } else if (num < min) {
                        errors[field.key] = `${field.label} must be at least ${min}.`
                    } else if (max !== undefined && num > max) {
                        errors[field.key] = `${field.label} must be at most ${max}.`
                    }
                }
                if (field.type === 'URL' && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(val)) {
                    errors[field.key] = 'Enter a valid URL.'
                }
                if (field.validation?.minLength && String(val).length < field.validation.minLength) {
                    errors[field.key] = `${field.label} must be at least ${field.validation.minLength} characters.`
                }
                if (field.validation?.maxLength && String(val).length > field.validation.maxLength) {
                    errors[field.key] = `${field.label} must be no more than ${field.validation.maxLength} characters.`
                }
                if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(val)) {
                    errors[field.key] = field.validation.patternMessage || `${field.label} is invalid.`
                }
            }
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Navigation handlers
    const handleNext = async () => {
        if (!validateSection(currentStep)) return

        // Save final step values
        await autosaveOnboarding(onboarding.id, token, {
            type: type.toUpperCase(),
            data: formData,
            currentStep: currentStep + 2 // 1-based index for next step
        })

        setCurrentStep(prev => prev + 1)
    }

    const handleBack = () => {
        setValidationErrors({})
        setCurrentStep(prev => prev - 1)
    }

    const handleJumpToStep = (stepIdx) => {
        setValidationErrors({})
        setCurrentStep(stepIdx)
    }

    // Submit final flow
    const handleFinalSubmit = async () => {
        setError('')
        setSubmitting(true)
        try {
            // Validate all sections first
            let allValid = true
            for (let i = 0; i < schema.sections.length; i++) {
                if (!validateSection(i)) {
                    setCurrentStep(i)
                    allValid = false
                    break
                }
            }

            if (!allValid) {
                setError('Please resolve all validation errors before submitting.')
                return
            }

            await submitOnboarding(onboarding.id, token, {
                type: type.toUpperCase(),
                consent,
                captchaToken: captcha?.challengeToken,
                captchaAnswer: Number(captchaAnswer)
            })
            setPhase('submitted')
        } catch (err) {
            setError(err.message || 'Submission failed.')
            // Refresh captcha on failure
            if (err.code?.startsWith('CAPTCHA') || err.message?.includes('CAPTCHA') || err.message?.includes('captcha')) {
                getCaptcha().then(setCaptcha)
            }
        } finally {
            setSubmitting(false)
        }
    }

    // Render helpers
    if (phase === 'loading') {
        return (
            <div className='min-h-screen bg-bg flex items-center justify-center'>
                <div className='text-center space-y-4'>
                    <Loader2 size={40} className='animate-spin text-accent mx-auto' />
                    <p className='text-text-secondary text-[15px] font-medium'>Loading onboarding configuration...</p>
                </div>
            </div>
        )
    }

    if (phase === 'error') {
        return (
            <div className='min-h-screen bg-bg flex items-center justify-center px-6'>
                <Card className='max-w-[480px] p-10 text-center shadow-[var(--shadow-lift)] border border-line'>
                    <div className='w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mx-auto mb-5'>
                        <AlertCircle size={28} className='text-red-600' />
                    </div>
                    <h1 className='font-display text-[22px] font-medium text-ink mb-2'>This onboarding link is invalid</h1>
                    <p className='text-text-secondary text-[14px] mb-8 leading-relaxed'>{error}</p>
                    <a href="/login" className="w-full block">
                        <Button variant='secondary' className='w-full'>Return to Home Page</Button>
                    </a>
                </Card>
            </div>
        )
    }

    if (phase === 'submitted') {
        const nextSteps = [
            { title: 'Onboarding form submitted', done: true },
            { title: 'Verification by our team', sub: 'Usually within 1–2 business days', active: true },
            { title: 'Login details and temporary password by email' },
        ]
        return (
            <div className='min-h-screen bg-[#FBF7F6] flex items-center justify-center px-6 py-12'>
                <div className='w-full max-w-[560px] bg-white border border-[#F1E6E9] rounded-[30px] p-8 sm:p-11 text-center shadow-[0_40px_80px_-50px_rgba(90,20,40,0.45)]'>
                    <span className='mx-auto w-24 h-24 rounded-full bg-[#E3F6EE] flex items-center justify-center' aria-hidden='true'>
                        <CheckCircle2 size={44} strokeWidth={2} className='text-[#0F8A6B]' />
                    </span>
                    <h1 className='font-display text-[30px] font-medium tracking-tight text-ink mt-6'>Thank you!</h1>
                    <p className='text-[15px] font-medium text-ink mt-2'>We&apos;ve received your onboarding form.</p>
                    <p className='text-[14.5px] text-text-secondary mt-1.5'>Our team will review it and send updates to your contact details.</p>

                    <ol className='mt-6 space-y-2.5 text-left'>
                        {nextSteps.map((step, i) => (
                            <li key={step.title} className={`flex gap-3 items-center px-3.5 py-3 rounded-[14px] ${step.done ? 'bg-[#F3FBF7]' : step.active ? 'bg-[#FFF7F5]' : 'bg-[#FBF8F8]'}`}>
                                <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-[13px] font-medium shrink-0 ${
                                    step.done ? 'bg-[#0F8A6B] text-white' : step.active ? 'border-2 border-accent text-accent' : 'border-2 border-[#D9C6CC] text-[#8A7880]'
                                }`}>{step.done ? '✓' : i + 1}</span>
                                <span>
                                    <span className={`block text-[14.5px] font-medium ${step.done || step.active ? 'text-ink' : 'text-text-secondary'}`}>{step.title}</span>
                                    {step.sub && <span className='block text-[12.5px] text-text-secondary'>{step.sub}</span>}
                                </span>
                            </li>
                        ))}
                    </ol>

                    <p className='text-[14px] text-text-secondary mt-5'>
                        Need help? Contact <a href={`mailto:${SUPPORT_EMAIL}`} className='text-accent font-medium hover:underline'>{SUPPORT_EMAIL}</a>
                    </p>
                    <div className='mt-5 space-y-2.5'>
                        {type?.toLowerCase() === 'candidate' ? (
                            <a href='/login' className='block'>
                                <Button className='w-full bg-accent hover:bg-accent-dark !rounded-[14px] !font-medium'>Sign in to Candidate Dashboard</Button>
                            </a>
                        ) : (
                            <a href='/' className='block'>
                                <Button variant='secondary' className='w-full !rounded-[14px] !font-medium'>Back to home</Button>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (phase === 'welcome') {
        return (
            <div className='min-h-screen bg-[#FBF7F6] flex items-center justify-center px-6 py-12'>
                <div className='w-full max-w-[640px] bg-white border border-[#F1E6E9] rounded-[30px] p-8 sm:p-10 shadow-[0_30px_70px_-50px_rgba(90,20,40,0.4)]'>
                    <div className='flex items-center gap-3'>
                        <span className='w-[46px] h-[46px] rounded-[14px] bg-[#FFF4F5] border border-[#F3DDE3] inline-flex items-center justify-center'>
                            <img src={logo} alt='Workmate.IQ' className='w-8 h-8 rounded-full' />
                        </span>
                        <span className='text-[12px] text-text-secondary tracking-[0.08em]'>WORKMATEIQ</span>
                    </div>
                    <h1 className='font-display text-[32px] sm:text-[36px] font-medium tracking-tight leading-[1.15] text-ink mt-5'>
                        Let&apos;s set up your account profile
                    </h1>
                    <p className='text-[15px] font-normal text-text-secondary leading-relaxed mt-3'>
                        This step-by-step flow guides you through your profile details and documents. You can save and come back anytime.
                    </p>

                    <ol className='grid sm:grid-cols-2 gap-3 mt-6'>
                        {[...(schema?.sections || []).map((sec) => sec.title), 'Review & Submit'].map((title, i) => (
                            <li key={title} className='border border-[#F1E6E9] rounded-[18px] p-4 bg-[#FFFCFB]'>
                                <span className='w-[34px] h-[34px] rounded-[11px] bg-[#FFF1F3] text-accent inline-flex items-center justify-center text-[14px] font-medium'>{i + 1}</span>
                                <p className='mt-2.5 text-[15px] font-medium text-ink'>{title}</p>
                            </li>
                        ))}
                    </ol>

                    <div className='flex items-center gap-2.5 text-[13.5px] text-text-secondary mt-5 bg-[#FFF7F5] rounded-[14px] px-4 py-3'>
                        <ShieldCheck size={18} className='text-accent shrink-0' aria-hidden='true' />
                        <span>Your information is encrypted and transmitted securely.</span>
                    </div>

                    <Button size='lg' className='w-full mt-5 bg-accent hover:bg-accent-dark !rounded-[14px] !font-medium' onClick={() => setPhase('form')}>
                        Start onboarding <ArrowRight size={16} className='ml-1' />
                    </Button>
                </div>
            </div>
        )
    }

    // Active step rendering details
    const isReviewStep = currentStep === schema.sections.length
    const activeSection = !isReviewStep ? schema.sections[currentStep] : null
    const totalSteps = schema.sections.length + 1

    // Real-time client-side captcha validation check
    const checkCaptchaAnswer = () => {
        if (!captcha || !captchaAnswer) return false
        try {
            const [encoded] = captcha.challengeToken.split('.')
            const payload = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))
            return Number(captchaAnswer) === (payload.a + payload.b)
        } catch (e) {
            return false
        }
    }
    const isCaptchaCorrect = checkCaptchaAnswer()

    // Sidebar progress: how many of the required (and currently visible) fields have a value.
    const requiredFields = (schema?.sections || []).flatMap((sec) => sec.fields).filter((f) => f.required && isFieldVisible(f, formData))
    const filledRequired = requiredFields.filter((f) => {
        if (isFileType(f.type)) return Boolean(files[f.key])
        const v = formData[f.key]
        return Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== ''
    })
    const completionPct = requiredFields.length ? Math.round((filledRequired.length / requiredFields.length) * 100) : 0

    return (
        <div className="h-screen w-full bg-card flex flex-col relative bg-noise overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-line bg-card shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center border border-line overflow-hidden shrink-0">
                        <img src={logo} alt="Workmate.IQ Logo" className="w-6 h-6 rounded-full" />
                    </div>
                    <div className="text-left">
                        <span className="font-display text-[16px] font-medium text-ink block">
                            {type?.toUpperCase() === 'ORGANIZATION' ? 'Company Onboarding'
                                : type?.toUpperCase() === 'COLLEGE' ? 'Institution Onboarding'
                                    : 'Candidate Onboarding'}
                        </span>
                        <span className="text-[11.5px] text-text-secondary font-medium tracking-wide uppercase">
                            {onboarding?.data?.company_name || onboarding?.data?.college_name || onboarding?.data?.full_name || 'Workmate.IQ'}
                        </span>
                    </div>
                </div>

                {/* Autosave status indicator */}
                <div className="flex items-center gap-4">
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[14px] font-medium text-accent hover:text-accent-dark hidden sm:inline">Need help?</a>
                    {saveState === 'saving' && (
                        <span className="flex items-center gap-1.5 text-[12px] text-text-secondary bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1 rounded-full border border-line animate-pulse">
                            <Loader2 size={13} className="animate-spin text-accent" />
                            Autosaving...
                        </span>
                    )}
                    {saveState === 'saved' && (
                        <span className="flex items-center gap-1 text-[12px] text-green-600 bg-green-50 dark:bg-green-950/20 px-3 py-1 rounded-full border border-green-200 dark:border-green-900/30 font-medium">
                            <Check size={12} />
                            Draft Saved
                        </span>
                    )}
                    {saveState === 'error' && (
                        <span className="flex items-center gap-1 text-[12px] text-red-600 bg-red-50 dark:bg-red-950/20 px-3 py-1 rounded-full border border-red-200 dark:border-red-900/30 font-medium animate-pulse">
                            Save Failed
                        </span>
                    )}
                </div>
            </div>

            {/* Stepper progress indicator */}
            <div className="px-8 py-4 border-b border-line bg-bg shrink-0 z-10">
                <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
                    {schema.sections.map((sec, idx) => {
                        const isActive = idx === currentStep
                        const isCompleted = idx < currentStep
                        return (
                            <React.Fragment key={sec.key}>
                                {/* Step bubble */}
                                <button
                                    onClick={() => isCompleted && handleJumpToStep(idx)}
                                    disabled={!isCompleted}
                                    className={`flex items-center gap-2.5 group transition-all text-left ${isCompleted ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-[13px] border transition-all ${isActive ? 'bg-accent border-accent text-white shadow-sm'
                                            : isCompleted ? 'bg-accent border-accent text-white'
                                                : 'bg-card border-line text-text-secondary'
                                            }`}
                                    >
                                        {isCompleted ? <Check size={14} className="stroke-[3]" /> : idx + 1}
                                    </div>
                                    <span
                                        className={`text-[13.5px] font-medium leading-none hidden sm:inline ${isActive ? 'text-ink font-medium'
                                            : isCompleted ? 'text-accent'
                                                : 'text-text-secondary'
                                            }`}
                                    >
                                        {sec.title}
                                    </span>
                                </button>

                                {/* Step Connector */}
                                <div
                                    className={`h-0.5 flex-1 mx-4 rounded-full transition-all duration-300 ${idx < currentStep ? 'bg-accent' : 'bg-line'
                                        }`}
                                />
                            </React.Fragment>
                        )
                    })}

                    {/* Review Step bubble */}
                    <div className="flex items-center gap-2.5">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-[13px] border transition-all ${isReviewStep ? 'bg-accent border-accent text-white shadow-sm'
                                : 'bg-card border-line text-text-secondary'
                                }`}
                        >
                            {totalSteps}
                        </div>
                        <span className={`text-[13.5px] font-medium leading-none hidden sm:inline ${isReviewStep ? 'text-ink font-medium' : 'text-text-secondary'}`}>
                            Review & Submit
                        </span>
                    </div>
                </div>
            </div>

            {/* Scrollable body content */}
            <div className="flex-1 overflow-y-auto bg-[#FBF7F6]">
                <div className="max-w-[1180px] mx-auto w-full px-6 sm:px-10 py-8 flex flex-wrap gap-7 items-start">
                  <div className="flex-[2_1_560px] min-w-0">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl px-6 py-4 mb-6 flex items-start gap-3">
                            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                            <p className="text-red-700 dark:text-red-400 text-[13.5px] font-medium">{error}</p>
                        </div>
                    )}

                    {/* Show review feedback if present - field-specific items are also
                        flagged inline against the matching field below; this banner
                        covers the summary plus any general (non-field) notes. */}
                    {reviewItems.length > 0 && !isReviewStep && (
                        <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-5 mb-6">
                            <div className="flex items-start gap-3 mb-2.5">
                                <AlertTriangle size={17} className="text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-amber-800 dark:text-amber-400 text-[14px]">Verification Feedback</h4>
                                    <p className="text-[12.5px] text-amber-700 dark:text-amber-500 mt-0.5">
                                        {reviewItems.some((i) => i.fieldKey)
                                            ? 'Fields that need updating are highlighted below.'
                                            : 'Please review the notes below before resubmitting.'}
                                    </p>
                                </div>
                            </div>
                            {reviewItems.some((i) => !i.fieldKey) && (
                                <ul className="space-y-1.5 ml-6">
                                    {reviewItems.filter((i) => !i.fieldKey).map((item, i) => (
                                        <li key={i} className="text-[12.5px] text-amber-800 dark:text-amber-500 list-disc">
                                            {item.message}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Step Form Rendering */}
                    {!isReviewStep ? (
                        <div className="space-y-6">
                            <div>
                                <p className="text-[13px] font-medium text-accent">Step {currentStep + 1} of {totalSteps}</p>
                                <h2 className="font-display text-[28px] font-medium tracking-tight text-ink mt-1 mb-1.5">{activeSection.title}</h2>
                                {activeSection.description && (
                                    <p className="text-[15px] text-text-secondary">{activeSection.description}</p>
                                )}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-6 bg-white border border-[#F1E6E9] rounded-[22px] p-6 mt-5">
                                {activeSection.fields.map((field) => {
                                    if (!isFieldVisible(field, formData)) return null
                                    const locked = Boolean(field.readOnly && onboarding?.data?.[field.key])
                                    const hasError = validationErrors[field.key]
                                    const isFullWidth = ['TEXTAREA', 'ADDRESS', 'RADIO', 'MULTI_SELECT', 'CHECKBOX', 'FILE', 'IMAGE'].includes(field.type)
                                    const limitMb = field.maxFileSizeMb || 10
                                    const flaggedItem = reviewItems.find((item) => item.fieldKey === field.key)

                                    return (
                                        <div
                                            key={field.key}
                                            className={`${isFullWidth ? 'sm:col-span-2' : ''} ${flaggedItem ? 'ring-1 ring-amber-300 bg-amber-50/50 rounded-2xl p-3 -m-3' : ''}`}
                                        >
                                            {flaggedItem && (
                                                <p className="flex items-start gap-1.5 text-[12px] font-medium text-amber-700 mb-2">
                                                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                                    {flaggedItem.message}
                                                </p>
                                            )}
                                            {/* File/Image Field */}
                                            {isFileType(field.type) ? (
                                                <div className="w-full">
                                                    <label className="block text-[13px] font-medium text-ink mb-1.5">
                                                        {field.label}{fieldLabelParts(field)}
                                                    </label>

                                                    {files[field.key] ? (
                                                        // Uploaded File Card
                                                        <div className="flex items-center justify-between border border-line rounded-xl px-4 py-3 bg-bg">
                                                            <div className="flex items-center gap-3 truncate">
                                                                <div className="w-10 h-10 rounded-lg bg-accent/5 flex items-center justify-center shrink-0 border border-line">
                                                                    <FileText className="text-accent" size={20} />
                                                                </div>
                                                                <div className="text-left truncate">
                                                                    <p className="text-[13px] font-medium text-ink truncate">{files[field.key].originalName}</p>
                                                                    <p className="text-[11px] text-text-secondary">
                                                                        {(files[field.key].size / 1024).toFixed(0)} KB · Uploaded
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-4">
                                                                <button
                                                                    onClick={() => openPreview(files[field.key])}
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] text-text-secondary transition-colors"
                                                                    title="Preview document"
                                                                >
                                                                    <Eye size={15} />
                                                                </button>

                                                                <label className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] text-text-secondary cursor-pointer transition-colors" title="Replace file">
                                                                    <Upload size={14} />
                                                                    <input
                                                                        type="file"
                                                                        accept={field.accept || undefined}
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0]
                                                                            if (file) handleFileUpload(field.key, file)
                                                                        }}
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ) : uploadingField === field.key ? (
                                                        // Progress bar
                                                        <div className="border border-dashed border-line rounded-xl p-4 bg-bg space-y-2">
                                                            <div className="flex justify-between items-center text-[12px]">
                                                                <span className="flex items-center gap-2 font-medium text-ink">
                                                                    <Loader2 size={13} className="animate-spin text-accent" />
                                                                    Uploading file...
                                                                </span>
                                                                <span className="font-medium">{uploadProgress[field.key] || 0}%</span>
                                                            </div>
                                                            <div className="w-full bg-line h-1.5 rounded-full overflow-hidden">
                                                                <div
                                                                    className="bg-accent h-full rounded-full transition-all duration-150"
                                                                    style={{ width: `${uploadProgress[field.key] || 0}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Drag and drop zone
                                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-line hover:border-accent/40 rounded-xl px-6 py-6 cursor-pointer bg-bg/50 transition-colors group">
                                                            <Upload size={22} className="text-text-secondary group-hover:scale-110 transition-transform mb-2" />
                                                            <span className="text-[13.5px] font-medium text-ink">Choose a file or drag here</span>
                                                            <span className="text-[11.5px] text-text-secondary mt-1">
                                                                {field.accept?.toUpperCase() || 'All formats'} up to {limitMb}MB
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept={field.accept || undefined}
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0]
                                                                    if (file) handleFileUpload(field.key, file)
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                    {hasError && <p className="text-[11.5px] text-red-500 mt-1.5">{hasError}</p>}
                                                </div>
                                            ) : field.type === 'TEXTAREA' || field.type === 'ADDRESS' ? (
                                                <Textarea
                                                    id={field.key}
                                                    label={<>{field.label}{fieldLabelParts(field)}</>}
                                                    placeholder={field.placeholder || undefined}
                                                    value={formData[field.key] || ''}
                                                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                    error={hasError}
                                                    className="focus:ring-accent focus:border-accent min-h-[100px]"
                                                />
                                            ) : field.type === 'SELECT' ? (
                                                <Select
                                                    id={field.key}
                                                    label={<>{field.label}{fieldLabelParts(field)}</>}
                                                    value={formData[field.key] || ''}
                                                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                    error={hasError}
                                                    className="focus:ring-accent focus:border-accent"
                                                >
                                                    <option value="">Select option...</option>
                                                    {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </Select>
                                            ) : field.type === 'COLOR' ? (
                                                <div className="w-full">
                                                    <label className="block text-[13px] font-medium text-ink mb-1.5">
                                                        {field.label}{fieldLabelParts(field)}
                                                    </label>
                                                    <div className="flex gap-3">
                                                        <input
                                                            type="color"
                                                            value={formData[field.key] || field.placeholder || '#4F46E5'}
                                                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                            aria-label={`${field.label} picker`}
                                                            className={`w-12 h-10 rounded-xl border border-line cursor-pointer p-0.5 bg-card shrink-0 ${formData[field.key] ? '' : 'opacity-40 grayscale'}`}
                                                        />
                                                        <Input
                                                            type="text"
                                                            value={formData[field.key] || ''}
                                                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                            placeholder="Pick a colour or type a hex code"
                                                            error={hasError}
                                                            className="focus:ring-accent focus:border-accent font-mono flex-1"
                                                        />
                                                    </div>
                                                    {!formData[field.key] && (
                                                        <p className="text-[12px] text-text-secondary mt-1.5">
                                                            Not set yet. Choose a colour above, or the platform default will be used.
                                                        </p>
                                                    )}
                                                </div>
                                            ) : field.type === 'RADIO' ? (
                                                <div className="space-y-2">
                                                    <label className="block text-[13px] font-medium text-ink">{field.label}{fieldLabelParts(field)}</label>
                                                    <div className="flex flex-wrap gap-4 pt-1">
                                                        {field.options?.map(o => (
                                                            <label key={o.value} className="flex items-center gap-2.5 text-[13.5px] text-ink cursor-pointer group">
                                                                <input
                                                                    type="radio"
                                                                    name={field.key}
                                                                    value={o.value}
                                                                    checked={formData[field.key] === o.value}
                                                                    onChange={() => handleFieldChange(field.key, o.value)}
                                                                    className="w-4 h-4 border-line accent-accent"
                                                                />
                                                                {o.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {hasError && <p className="text-[11.5px] text-red-500 mt-1">{hasError}</p>}
                                                </div>
                                            ) : field.type === 'MULTI_SELECT' ? (
                                                <div className="space-y-2">
                                                    <label className="block text-[13px] font-medium text-ink">{field.label}{fieldLabelParts(field)}</label>
                                                    <div className="flex flex-wrap gap-2.5 pt-1">
                                                        {field.options?.map(o => {
                                                            const selected = Array.isArray(formData[field.key]) && formData[field.key].includes(o.value)
                                                            return (
                                                                <label
                                                                    key={o.value}
                                                                    className={`flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-full border cursor-pointer transition-colors ${selected ? 'bg-accent/10 border-accent text-accent' : 'border-line text-ink hover:border-accent/40'}`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selected}
                                                                        onChange={() => {
                                                                            const current = Array.isArray(formData[field.key]) ? formData[field.key] : []
                                                                            const next = selected ? current.filter(v => v !== o.value) : [...current, o.value]
                                                                            handleFieldChange(field.key, next)
                                                                        }}
                                                                        className="w-3.5 h-3.5 accent-accent"
                                                                    />
                                                                    {o.label}
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                    {hasError && <p className="text-[11.5px] text-red-500 mt-1">{hasError}</p>}
                                                </div>
                                            ) : field.type === 'CHECKBOX' ? (
                                                <div className="pt-2">
                                                    <label className="flex items-center gap-2.5 text-[13.5px] text-ink cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!formData[field.key]}
                                                            onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                                                            className="w-4.5 h-4.5 rounded border-line accent-accent"
                                                        />
                                                        {field.label}{fieldLabelParts(field)}
                                                    </label>
                                                    {hasError && <p className="text-[11.5px] text-red-500 mt-1.5">{hasError}</p>}
                                                </div>
                                            ) : field.type === 'NUMBER' ? (
                                                <Input
                                                    id={field.key}
                                                    type="number"
                                                    min={0}
                                                    onKeyDown={(e) => {
                                                        if (['e', 'E', '+', '-'].includes(e.key)) {
                                                            e.preventDefault()
                                                        }
                                                    }}
                                                    label={<>{field.label}{fieldLabelParts(field)}</>}
                                                    placeholder={field.placeholder || undefined}
                                                    value={formData[field.key] || ''}
                                                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                    error={hasError}
                                                    className="focus:ring-accent focus:border-accent"
                                                />
                                            ) : field.type === 'PHONE' ? (
                                                <div className="relative">
                                                    <Input
                                                        id={field.key}
                                                        type="tel"
                                                        inputMode="numeric"
                                                        maxLength={10}
                                                        onKeyDown={(e) => {
                                                            const isDigit = /[0-9]/.test(e.key)
                                                            const isControl = [
                                                                'Backspace',
                                                                'Delete',
                                                                'Tab',
                                                                'ArrowLeft',
                                                                'ArrowRight',
                                                                'Home',
                                                                'End'
                                                            ].includes(e.key)
                                                            const isMeta = e.metaKey || e.ctrlKey

                                                            if (!isDigit && !isControl && !isMeta) {
                                                                e.preventDefault()
                                                            }
                                                        }}
                                                        label={<>{field.label}{fieldLabelParts(field)}</>}
                                                        placeholder={field.placeholder || undefined}
                                                        value={formData[field.key] || ''}
                                                        onChange={(e) => handleFieldChange(field.key, e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                        error={hasError}
                                                        className="focus:ring-accent focus:border-accent"
                                                    />
                                                    <span className="absolute right-3 top-[38px] text-[11.5px] text-text-secondary">
                                                        {(formData[field.key] || '').length}/10
                                                    </span>
                                                </div>
                                            ) : (
                                                // Text / Email / URL inputs
                                                <Input
                                                    id={field.key}
                                                    type={field.type === 'EMAIL' ? 'email' : 'text'}
                                                    label={<>{field.label}{fieldLabelParts(field)}</>}
                                                    placeholder={field.placeholder || undefined}
                                                    value={formData[field.key] || ''}
                                                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                    error={hasError}
                                                    readOnly={locked}
                                                    disabled={locked}
                                                    className="focus:ring-accent focus:border-accent"
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        // Step 4: Custom Read-Only Review Screen
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div>
                                <h2 className="font-display text-[24px] font-medium text-ink mb-1">Review & Submit</h2>
                                <p className="text-[15px] text-text-secondary">Please review all your details carefully before submitting.</p>
                            </div>

                            {schema.sections.map((sec, idx) => (
                                <div key={sec.key} className="border border-line rounded-2xl bg-bg/40 overflow-hidden shadow-sm">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-bg/70">
                                        <h3 className="font-medium text-[14.5px] text-ink">{sec.title}</h3>
                                        <button
                                            onClick={() => handleJumpToStep(idx)}
                                            className="text-[13px] font-medium text-accent hover:underline"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <div className="px-6 py-5 grid sm:grid-cols-2 gap-x-8 gap-y-4">
                                        {sec.fields.filter((field) => isFieldVisible(field, formData)).map(field => {
                                            const isFile = isFileType(field.type)
                                            const value = isFile ? files[field.key] : formData[field.key]
                                            return (
                                                <div key={field.key} className={['TEXTAREA', 'ADDRESS', 'FILE', 'IMAGE'].includes(field.type) ? 'sm:col-span-2' : ''}>
                                                    <p className="text-[11.5px] text-text-secondary font-medium tracking-wide uppercase">{field.label}</p>
                                                    <div className="mt-1">
                                                        {isFile ? (
                                                            value ? (
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[13px] font-medium text-ink truncate">{value.originalName}</span>
                                                                    <button
                                                                        onClick={() => openPreview(value)}
                                                                        className="text-[12px] font-medium text-accent hover:underline flex items-center gap-1"
                                                                    >
                                                                        <Eye size={12} /> Preview
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[13px] text-text-secondary italic">Not uploaded</span>
                                                            )
                                                        ) : field.type === 'COLOR' ? (
                                                            value ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 rounded border border-line" style={{ backgroundColor: value }} />
                                                                    <span className="text-[13px] font-mono text-ink font-medium">{value}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[13px] text-text-secondary italic">Not specified</span>
                                                            )
                                                        ) : field.type === 'MULTI_SELECT' ? (
                                                            Array.isArray(value) && value.length > 0 ? (
                                                                <span className="text-[13px] text-ink font-medium leading-relaxed">
                                                                    {value.map(v => field.options?.find(o => o.value === v)?.label || v).join(', ')}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[13px] text-text-secondary italic">Not specified</span>
                                                            )
                                                        ) : (
                                                            <span className="text-[13px] text-ink font-medium leading-relaxed">
                                                                {value === true ? 'Yes' : value === false ? 'No' : value || <span className="text-text-secondary italic font-normal">Not specified</span>}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Consent and Submit Section */}
                            <div className="border border-line rounded-2xl p-6 space-y-5 bg-card">
                                <h3 className="font-medium text-[15px] text-ink">Declaration & Consent</h3>

                                {captcha && (
                                    <div className="border-b border-line pb-4 mb-4">
                                        <label className='block text-[13px] font-medium text-ink mb-2.5'>
                                            {captcha.question} <span className='text-red-500'>*</span>
                                        </label>
                                        <div className="relative w-full max-w-[280px]">
                                            <input
                                                type='number'
                                                value={captchaAnswer}
                                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                                className={`w-full bg-bg border rounded-xl px-4 py-3 text-[14px] text-ink outline-none transition-all ${
                                                    isCaptchaCorrect
                                                        ? '!border-green-500 focus:!ring-2 focus:!ring-green-500/15'
                                                        : captchaAnswer
                                                        ? '!border-red-500 focus:!ring-2 focus:!ring-red-500/15'
                                                        : 'border-line focus:ring-2 focus:ring-accent/15 focus:border-accent'
                                                }`}
                                                placeholder='Enter your answer'
                                            />
                                            {isCaptchaCorrect && (
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 font-medium text-[12px] flex items-center gap-1">
                                                    <CheckCircle2 size={16} /> Verified
                                                </span>
                                            )}
                                        </div>
                                        {captchaAnswer && !isCaptchaCorrect && (
                                            <p className="text-[12.5px] text-red-600 font-medium mt-2">
                                                That's not the right answer. Please try again.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <label className="flex items-start gap-3.5 text-[13.5px] text-text-secondary cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={consent}
                                        onChange={(e) => setConsent(e.target.checked)}
                                        className="mt-0.5 w-4.5 h-4.5 rounded border-line accent-accent cursor-pointer"
                                    />
                                    <span>
                                        I confirm that the information provided in this onboarding form is accurate and true to the best of my knowledge, and I consent to Workmate.IQ processing this data for verification.
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}
                  </div>

                  {/* Sidebar: progress, why we ask, support */}
                  <aside className="flex-[1_1_280px] min-w-0 lg:sticky lg:top-6 space-y-3.5">
                      <div className="bg-white border border-[#F1E6E9] rounded-[22px] p-5 flex gap-4 items-center">
                          <div
                              className="w-[76px] h-[76px] rounded-full flex items-center justify-center shrink-0"
                              style={{ background: `conic-gradient(var(--color-accent, #A3123A) ${completionPct * 3.6}deg, #F5E9EC 0)` }}
                              role="img"
                              aria-label={`${completionPct}% of required details completed`}
                          >
                              <div className="w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center text-[15px] font-medium text-ink">{completionPct}%</div>
                          </div>
                          <div>
                              <p className="text-[15px] font-medium text-ink">Profile completion</p>
                              <p className="text-[13px] text-text-secondary">
                                  {requiredFields.length - filledRequired.length > 0
                                      ? `${requiredFields.length - filledRequired.length} required ${requiredFields.length - filledRequired.length === 1 ? 'field' : 'fields'} left`
                                      : 'All required details added'}
                              </p>
                          </div>
                      </div>
                      <div className="rounded-[22px] border border-[#F8E0DE] p-5 bg-gradient-to-br from-[#FFF1F3] to-[#FFF6EE]">
                          <p className="text-[12px] font-medium tracking-[0.08em] text-accent">WHY WE ASK</p>
                          <p className="text-[14px] text-[#4A3A41] mt-2">Registration and tax details are used only to verify your organization. They are never shown to candidates.</p>
                      </div>
                      <div className="bg-white border border-[#F1E6E9] rounded-[22px] p-4 text-[13.5px]">
                          <p className="font-medium text-ink">Stuck on something?</p>
                          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">{SUPPORT_EMAIL}</a>
                      </div>
                  </aside>
                </div>
            </div>

            {/* Bottom navigation bar */}
            <div className="px-6 sm:px-10 py-3.5 border-t border-[#F1E6E9] bg-white/95 backdrop-blur-sm shrink-0 z-10">
                <div className="max-w-[1180px] mx-auto w-full flex items-center justify-between">
                    <Button
                        variant="secondary"
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className={`${currentStep === 0 ? 'invisible' : ''}`}
                    >
                        <ChevronLeft size={16} className="mr-1" /> Back
                    </Button>

                    {isReviewStep ? (
                        !isCaptchaCorrect ? (
                            <span className="text-[13px] text-text-secondary font-medium italic animate-in fade-in duration-200">
                                Solve the security challenge above to submit
                            </span>
                        ) : (
                            <Button
                                onClick={handleFinalSubmit}
                                disabled={!consent || submitting}
                                className="bg-accent hover:bg-accent-dark flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Submit Onboarding <Check size={16} />
                                    </>
                                )}
                            </Button>
                        )
                    ) : (
                        <Button
                            onClick={handleNext}
                            className="bg-accent hover:bg-accent-dark flex items-center gap-1"
                        >
                            Continue <ChevronRight size={16} />
                        </Button>
                    )}
                </div>
            </div>

            {/* Embedded High-Fidelity Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-8 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setPreviewFile(null)} />
                    <div className="relative w-full max-w-4xl bg-card border border-line rounded-2xl shadow-[var(--shadow-lift)] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-card shrink-0">
                            <div className="flex items-center gap-2">
                                <FileText className="text-accent" size={18} />
                                <h3 className="text-[14.5px] font-medium text-ink truncate max-w-md md:max-w-lg">{previewFile.name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewFile.url ? `${previewFile.url}${previewFile.url.includes('?') ? '&' : '?'}download=1` : undefined}
                                    aria-disabled={!previewFile.url}
                                    download={previewFile.name}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                                    title="Download file"
                                >
                                    <Download size={15} />
                                </a>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                                    aria-label="Close preview"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-4 bg-bg overflow-auto flex items-center justify-center">
                            <FilePreviewBody file={previewFile} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default OnboardingFlow
