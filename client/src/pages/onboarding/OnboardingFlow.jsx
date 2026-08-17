import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShieldCheck, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react'
import { Card, Button } from '../../components/ui'
import DynamicForm from '../../components/forms/DynamicForm'
import { getOnboarding, autosaveOnboarding, uploadOnboardingFile, submitOnboarding } from '../../api/onboardingApi'
import logo from '../../assets/logo.png'

// The raw token lives only in this component's state - never localStorage,
// never a persistent global store, never logged. It came from the URL and
// dies with the page.
function OnboardingFlow() {
    const { type, token } = useParams()
    const [phase, setPhase] = useState('loading') // loading | error | welcome | form | submitted
    const [error, setError] = useState('')
    const [onboarding, setOnboarding] = useState(null)
    const [schema, setSchema] = useState(null)
    const [prefill, setPrefill] = useState({})
    const [files, setFiles] = useState({})
    const [uploadingField, setUploadingField] = useState(null)
    const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
    const [consent, setConsent] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [reviewItems, setReviewItems] = useState([])
    const saveTimer = useRef(null)

    useEffect(() => {
        getOnboarding(type, token)
            .then((res) => {
                setOnboarding(res.onboarding)
                setSchema(res.form)
                setPrefill(res.data || {})
                setReviewItems(res.reviewItems || [])
                const fileMap = {}
                for (const f of res.files || []) fileMap[f.fieldKey] = f
                setFiles(fileMap)
                setPhase(res.onboarding.status === 'NOT_STARTED' ? 'welcome' : 'form')
            })
            .catch((err) => { setError(err.message); setPhase('error') })
    }, [type, token])

    const debouncedSave = useCallback((values) => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setSaveState('saving')
        saveTimer.current = setTimeout(async () => {
            try {
                await autosaveOnboarding(onboarding.id, token, { type: type.toUpperCase(), data: values })
                setSaveState('saved')
            } catch {
                setSaveState('error')
            }
        }, 700)
    }, [onboarding, token, type])

    const handleFileUpload = async (fieldKey, file) => {
        setUploadingField(fieldKey)
        try {
            const result = await uploadOnboardingFile(onboarding.id, token, { type: type.toUpperCase(), fieldKey, file })
            setFiles((f) => ({ ...f, [fieldKey]: result }))
        } catch (err) {
            setError(err.message)
        } finally {
            setUploadingField(null)
        }
    }

    const handleSubmit = async (values) => {
        setError('')
        setSubmitting(true)
        try {
            await autosaveOnboarding(onboarding.id, token, { type: type.toUpperCase(), data: values })
            await submitOnboarding(onboarding.id, token, { type: type.toUpperCase(), consent })
            setPhase('submitted')
        } catch (err) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (phase === 'loading') {
        return <div className='min-h-screen bg-bg flex items-center justify-center'><p className='text-text-secondary'>Loading your onboarding...</p></div>
    }

    if (phase === 'error') {
        return (
            <div className='min-h-screen bg-bg flex items-center justify-center px-6'>
                <Card className='max-w-[420px] p-8 text-center'>
                    <h1 className='font-display text-[20px] font-bold text-ink mb-2'>This link isn't valid</h1>
                    <p className='text-text-secondary text-[14px]'>{error}</p>
                </Card>
            </div>
        )
    }

    if (phase === 'submitted') {
        return (
            <div className='min-h-screen bg-bg flex items-center justify-center px-6'>
                <Card className='max-w-[420px] p-8 text-center'>
                    <CheckCircle2 size={40} className='text-green-600 mx-auto mb-4' />
                    <h1 className='font-display text-[22px] font-bold text-ink mb-2'>Onboarding submitted</h1>
                    <p className='text-text-secondary text-[14px] mb-6'>Thanks — our team will review your submission and get back to you shortly.</p>
                    {type?.toLowerCase() === 'candidate' && (
                        <a href='/login'>
                            <Button className='w-full'>Sign in to get started</Button>
                        </a>
                    )}
                </Card>
            </div>
        )
    }

    if (phase === 'welcome') {
        const totalSteps = schema?.sections?.length || 1
        return (
            <div className='min-h-screen bg-bg flex items-center justify-center px-6'>
                <Card className='max-w-[480px] p-8 text-center'>
                    <img src={logo} alt='' className='w-12 h-12 rounded-full mx-auto mb-5' />
                    <h1 className='font-display text-[22px] font-bold text-ink mb-2'>Welcome to WorkmateIQ</h1>
                    <p className='text-text-secondary text-[14px] mb-6'>
                        Let's finish setting up your {type} profile. This takes about {totalSteps * 2} minutes and you can save and come back anytime.
                    </p>
                    <div className='flex items-center justify-center gap-1.5 mb-6'>
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <span key={i} className='w-8 h-1.5 rounded-full bg-line' />
                        ))}
                    </div>
                    <div className='flex items-center justify-center gap-2 text-[12.5px] text-text-secondary mb-6'>
                        <ShieldCheck size={14} className='text-accent' /> Your information is encrypted and only shared with your organization.
                    </div>
                    <Button size='lg' className='w-full' onClick={() => setPhase('form')}>
                        Continue <ArrowRight size={16} />
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-bg px-6 py-12'>
            <div className='max-w-[760px] mx-auto'>
                <div className='flex items-center justify-between mb-8'>
                    <div className='flex items-center gap-2.5'>
                        <img src={logo} alt='' className='w-8 h-8 rounded-full' />
                        <span className='font-display text-[15px] font-bold text-ink'>WorkmateIQ Onboarding</span>
                    </div>
                    <span className='text-[12.5px] text-text-secondary'>
                        {saveState === 'saving' && 'Saving...'}
                        {saveState === 'saved' && 'Saved'}
                        {saveState === 'error' && <span className='text-red-500'>Save failed - retrying...</span>}
                    </span>
                </div>

                {error && <p className='text-[13.5px] text-red-500 mb-4'>{error}</p>}

                {reviewItems.length > 0 && (
                    <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6'>
                        <div className='flex items-center gap-2 text-amber-800 font-medium text-[13.5px] mb-2'>
                            <AlertTriangle size={15} /> Changes requested — please review before resubmitting
                        </div>
                        <ul className='space-y-1'>
                            {reviewItems.map((item, i) => (
                                <li key={i} className='text-[13px] text-amber-700'>
                                    {item.fieldKey ? <span className='font-medium'>{item.fieldKey}: </span> : null}{item.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <Card className='p-8'>
                    <DynamicForm
                        schema={schema}
                        defaultValues={prefill}
                        onSubmit={handleSubmit}
                        onValuesChange={debouncedSave}
                        onFileUpload={handleFileUpload}
                        uploadingField={uploadingField}
                        files={files}
                        submitting={submitting}
                        submitLabel='Submit for review'
                        extraFooter={
                            <label className='flex items-start gap-2 text-[13.5px] text-text-secondary border-t border-line pt-6'>
                                <input type='checkbox' checked={consent} onChange={(e) => setConsent(e.target.checked)} className='mt-0.5' />
                                I confirm the information provided is accurate and consent to WorkmateIQ processing it for onboarding review.
                            </label>
                        }
                    />
                </Card>
            </div>
        </div>
    )
}

export default OnboardingFlow
