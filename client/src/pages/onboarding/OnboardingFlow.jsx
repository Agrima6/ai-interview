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
import { getOnboarding, autosaveOnboarding, uploadOnboardingFile, submitOnboarding } from '../../api/onboardingApi'
import { getCaptcha } from '../../api/registrationsApi'
import logo from '../../assets/logo.png'

// Helper to check if a field is of file/image type
const isFileType = (type) => ['FILE', 'IMAGE', 'MULTI_FILE'].includes(type)
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@workmateiq.com'
const fieldLabelParts = (field) => field.required
    ? <span className="text-red-500 ml-0.5">*</span>
    : <span className="text-text-secondary font-normal ml-1">(optional)</span>

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
                    logoUrl: `/api/v1/onboardings/${onboarding.id}/files/${result.fileId}/view`
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
                    <h1 className='font-display text-[22px] font-bold text-ink mb-2'>This onboarding link is invalid</h1>
                    <p className='text-text-secondary text-[14px] mb-8 leading-relaxed'>{error}</p>
                    <a href="/platform/login" className="w-full block">
                        <Button variant='secondary' className='w-full'>Return to Home Page</Button>
                    </a>
                </Card>
            </div>
        )
    }

    if (phase === 'submitted') {
        return (
            <div className='min-h-screen bg-bg flex items-center justify-center px-6 relative bg-noise'>
                <Card className='max-w-[540px] p-12 text-center shadow-[var(--shadow-lift)] border border-line bg-card rounded-2xl'>
                    <div className='w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center mx-auto mb-6'>
                        <CheckCircle2 size={36} className='text-green-600' />
                    </div>
                    <h1 className='font-display text-[26px] font-bold text-ink mb-3'>Thank You!</h1>
                    <p className='text-ink text-[15px] font-medium mb-2 leading-relaxed'>
                        We've received your onboarding form successfully.
                    </p>
                    <p className='text-text-secondary text-[14.5px] mb-6 leading-relaxed'>
                        Our team will review the information and send updates to your provided contact details.
                    </p>
                    <p className='text-[13px] text-text-secondary mb-8'>
                        Need help? Contact <a href={`mailto:${SUPPORT_EMAIL}`} className='text-accent font-semibold hover:underline'>{SUPPORT_EMAIL}</a>.
                    </p>
                    {type?.toLowerCase() === 'candidate' ? (
                        <a href='/platform/login' className='w-full block'>
                            <Button className='w-full bg-accent hover:bg-accent-dark'>Sign in to Candidate Dashboard</Button>
                        </a>
                    ) : (
                        <a href='/' className='w-full block border-t border-line pt-6'>
                            <Button variant='secondary' className='w-full'>Back to Home</Button>
                        </a>
                    )}
                </Card>
            </div>
        )
    }

    if (phase === 'welcome') {
        const totalSteps = (schema?.sections?.length || 0) + 1
        return (
            <div className='min-h-screen bg-bg flex items-center justify-center px-6 py-12 relative bg-noise'>
                <Card className='max-w-[560px] p-12 text-center shadow-[var(--shadow-lift)] border border-line bg-card rounded-2xl'>
                    <div className='w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center mx-auto mb-6'>
                        <img src={logo} alt='Workmate.IQ Logo' className='w-8 h-8 rounded-full' />
                    </div>
                    <h1 className='font-display text-[26px] font-bold text-ink mb-3'>
                        Onboarding Setup
                    </h1>
                    <p className='text-text-secondary text-[15px] mb-8 leading-relaxed'>
                        We need a few details to set up your account profile. This step-by-step flow will guide you through entering profile details and documents.
                    </p>

                    <div className='bg-bg border border-line rounded-2xl p-6 mb-8 text-left'>
                        <h4 className="text-[14px] font-semibold text-ink mb-3">Onboarding Overview</h4>
                        <div className='grid grid-cols-4 gap-2 mb-4'>
                            {Array.from({ length: totalSteps }).map((_, i) => (
                                <div key={i} className={`h-2 rounded-full ${i === 0 ? 'bg-accent' : 'bg-line'}`} />
                            ))}
                        </div>
                        <p className='text-[12px] text-text-secondary font-medium'>{totalSteps} steps in total</p>
                    </div>

                    <div className='flex items-center justify-center gap-2.5 text-[13px] text-text-secondary mb-8 bg-accent/5 rounded-xl px-4 py-3'>
                        <ShieldCheck size={16} className='text-accent flex-shrink-0' />
                        <span>Your information is encrypted and transmitted securely.</span>
                    </div>

                    <Button size='lg' className='w-full bg-accent hover:bg-accent-dark' onClick={() => setPhase('form')}>
                        Start Onboarding <ArrowRight size={16} className="ml-1" />
                    </Button>
                </Card>
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

    return (
        <div className="h-screen w-full bg-card flex flex-col relative bg-noise overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-line bg-card shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center border border-line overflow-hidden shrink-0">
                        <img src={logo} alt="Workmate.IQ Logo" className="w-6 h-6 rounded-full" />
                    </div>
                    <div className="text-left">
                        <span className="font-display text-[16px] font-bold text-ink block">
                            {type?.toUpperCase() === 'ORGANIZATION' ? 'Company Onboarding'
                                : type?.toUpperCase() === 'COLLEGE' ? 'Institution Onboarding'
                                    : 'Candidate Onboarding'}
                        </span>
                        <span className="text-[11.5px] text-text-secondary font-semibold tracking-wide uppercase">
                            {onboarding?.data?.company_name || onboarding?.data?.college_name || onboarding?.data?.full_name || 'Workmate.IQ'}
                        </span>
                    </div>
                </div>

                {/* Autosave status indicator */}
                <div className="flex items-center gap-2">
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
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[13px] border transition-all ${isActive ? 'bg-accent border-accent text-white shadow-sm'
                                            : isCompleted ? 'bg-accent border-accent text-white'
                                                : 'bg-card border-line text-text-secondary'
                                            }`}
                                    >
                                        {isCompleted ? <Check size={14} className="stroke-[3]" /> : idx + 1}
                                    </div>
                                    <span
                                        className={`text-[13.5px] font-semibold leading-none hidden sm:inline ${isActive ? 'text-ink font-bold'
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
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[13px] border transition-all ${isReviewStep ? 'bg-accent border-accent text-white shadow-sm'
                                : 'bg-card border-line text-text-secondary'
                                }`}
                        >
                            {totalSteps}
                        </div>
                        <span className={`text-[13.5px] font-semibold leading-none hidden sm:inline ${isReviewStep ? 'text-ink font-bold' : 'text-text-secondary'}`}>
                            Review & Submit
                        </span>
                    </div>
                </div>
            </div>

            {/* Scrollable body content */}
            <div className="flex-1 overflow-y-auto bg-card">
                <div className="max-w-4xl mx-auto w-full px-8 py-10">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl px-6 py-4 mb-6 flex items-start gap-3">
                            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                            <p className="text-red-700 dark:text-red-400 text-[13.5px] font-medium">{error}</p>
                        </div>
                    )}

                    {/* Show review feedback if present */}
                    {reviewItems.length > 0 && !isReviewStep && (
                        <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-5 mb-6">
                            <div className="flex items-start gap-3 mb-2.5">
                                <AlertTriangle size={17} className="text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-amber-800 dark:text-amber-400 text-[14px]">Verification Feedback</h4>
                                    <p className="text-[12.5px] text-amber-700 dark:text-amber-500 mt-0.5">Please update the requested fields before resubmitting.</p>
                                </div>
                            </div>
                            <ul className="space-y-1.5 ml-6">
                                {reviewItems.map((item, i) => (
                                    <li key={i} className="text-[12.5px] text-amber-800 dark:text-amber-500 list-disc">
                                        {item.fieldKey ? <span className="font-semibold">{item.fieldKey.replace('_', ' ')}: </span> : null}
                                        {item.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Step Form Rendering */}
                    {!isReviewStep ? (
                        <div className="space-y-6">
                            <div>
                                <h2 className="font-display text-[24px] font-bold text-ink mb-1.5">{activeSection.title}</h2>
                                {activeSection.description && (
                                    <p className="text-[15px] text-text-secondary">{activeSection.description}</p>
                                )}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-6 pt-4">
                                {activeSection.fields.map((field) => {
                                    const hasError = validationErrors[field.key]
                                    const isFullWidth = ['TEXTAREA', 'ADDRESS', 'RADIO', 'MULTI_SELECT', 'CHECKBOX', 'FILE', 'IMAGE'].includes(field.type)
                                    const limitMb = field.maxFileSizeMb || 10

                                    return (
                                        <div key={field.key} className={isFullWidth ? 'sm:col-span-2' : ''}>
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
                                                                    onClick={() => setPreviewFile({
                                                                        name: files[field.key].originalName,
                                                                        url: `/api/v1/onboardings/${onboarding.id}/files/${files[field.key].fileId}/view`,
                                                                        type: files[field.key].mimeType
                                                                    })}
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
                                                                <span className="font-semibold">{uploadProgress[field.key] || 0}%</span>
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
                                                            <span className="text-[13.5px] font-semibold text-ink">Choose a file or drag here</span>
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
                                                            className="w-12 h-10 rounded-xl border border-line cursor-pointer p-0.5 bg-card shrink-0"
                                                        />
                                                        <Input
                                                            type="text"
                                                            value={formData[field.key] || ''}
                                                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                            placeholder={field.placeholder || '#4F46E5'}
                                                            error={hasError}
                                                            className="focus:ring-accent focus:border-accent font-mono flex-1"
                                                        />
                                                    </div>
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
                                <h2 className="font-display text-[24px] font-bold text-ink mb-1">Review & Submit</h2>
                                <p className="text-[15px] text-text-secondary">Please review all your details carefully before submitting.</p>
                            </div>

                            {schema.sections.map((sec, idx) => (
                                <div key={sec.key} className="border border-line rounded-2xl bg-bg/40 overflow-hidden shadow-sm">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-bg/70">
                                        <h3 className="font-semibold text-[14.5px] text-ink">{sec.title}</h3>
                                        <button
                                            onClick={() => handleJumpToStep(idx)}
                                            className="text-[13px] font-bold text-accent hover:underline"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <div className="px-6 py-5 grid sm:grid-cols-2 gap-x-8 gap-y-4">
                                        {sec.fields.map(field => {
                                            const isFile = isFileType(field.type)
                                            const value = isFile ? files[field.key] : formData[field.key]
                                            return (
                                                <div key={field.key} className={['TEXTAREA', 'ADDRESS', 'FILE', 'IMAGE'].includes(field.type) ? 'sm:col-span-2' : ''}>
                                                    <p className="text-[11.5px] text-text-secondary font-medium tracking-wide uppercase">{field.label}</p>
                                                    <div className="mt-1">
                                                        {isFile ? (
                                                            value ? (
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[13px] font-semibold text-ink truncate">{value.originalName}</span>
                                                                    <button
                                                                        onClick={() => setPreviewFile({
                                                                            name: value.originalName,
                                                                            url: `/api/v1/onboardings/${onboarding.id}/files/${value.fileId}/view`,
                                                                            type: value.mimeType
                                                                        })}
                                                                        className="text-[12px] font-semibold text-accent hover:underline flex items-center gap-1"
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
                                                                    <span className="text-[13px] font-mono text-ink font-semibold">{value}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[13px] text-text-secondary italic">Not specified</span>
                                                            )
                                                        ) : field.type === 'MULTI_SELECT' ? (
                                                            Array.isArray(value) && value.length > 0 ? (
                                                                <span className="text-[13px] text-ink font-semibold leading-relaxed">
                                                                    {value.map(v => field.options?.find(o => o.value === v)?.label || v).join(', ')}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[13px] text-text-secondary italic">Not specified</span>
                                                            )
                                                        ) : (
                                                            <span className="text-[13px] text-ink font-semibold leading-relaxed">
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
                                <h3 className="font-semibold text-[15px] text-ink">Declaration & Consent</h3>

                                {captcha && (
                                    <div className="border-b border-line pb-4 mb-4">
                                        <label className='block text-[13px] font-semibold text-ink mb-2.5'>
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
            </div>

            {/* Bottom navigation bar */}
            <div className="px-8 py-5 border-t border-line bg-bg shrink-0 z-10">
                <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
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
                                <h3 className="text-[14.5px] font-semibold text-ink truncate max-w-md md:max-w-lg">{previewFile.name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewFile.url}
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
                            {previewFile.type.startsWith('image/') ? (
                                <img
                                    src={previewFile.url}
                                    alt={previewFile.name}
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg border border-line bg-white shadow-sm"
                                />
                            ) : previewFile.type === 'application/pdf' ? (
                                <iframe
                                    src={`${previewFile.url}#toolbar=0`}
                                    title={previewFile.name}
                                    className="w-full h-[70vh] rounded-lg border border-line bg-white"
                                />
                            ) : (
                                <div className="text-center py-12 space-y-4">
                                    <FileText size={48} className="text-text-secondary mx-auto" />
                                    <p className="text-[14px] text-text-secondary font-medium">Preview not available for this file type</p>
                                    <a href={previewFile.url} download={previewFile.name}>
                                        <Button size="sm">Download File</Button>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default OnboardingFlow
