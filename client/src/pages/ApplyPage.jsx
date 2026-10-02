import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Building2, Briefcase, Clock, AlertCircle, CheckCircle2, UploadCloud, FileText, CalendarClock, Languages, Lock } from 'lucide-react'
import { Card, Skeleton } from '../components/ui'
import Input from '../components/ui/Input'
import { Field } from '../components/ui/Input'
import logo from '../assets/logo.png'
import { getPublicDrive, applyToDrive, getApplicationPrefill } from '../api/organization/organizationApi'
import { CANDIDATE_FIELDS } from '../constants/candidateSchema'

const ALREADY_APPLIED_KEY = (link) => `hirepro_applied_${link}`

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish (mix of Hindi & English)' },
]

// A few minutes of buffer so the slot picker's min value never lands in
// the past relative to "now" (the backend rejects a slot that isn't
// strictly in the future) - kept small rather than rounded up to the next
// half-hour mark, since a candidate should be able to pick "right now" and
// actually start immediately, not be forced to wait out a rounding gap.
const minutesFromNow = (date, minutes) => {
  const result = new Date(date)
  result.setSeconds(0, 0)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function ApplyPage() {
  const { link } = useParams()
  const [searchParams] = useSearchParams()
  const emailFromInvite = searchParams.get('email') || ''
  const tokenFromInvite = searchParams.get('token') || searchParams.get('prefillToken') || ''

  const [drive, setDrive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lockedFields, setLockedFields] = useState(null) // { name, phone, exp } already on file from HR, or null

  const [form, setForm] = useState({ name: '', email: emailFromInvite, phone: '', exp: '', interviewSlot: '', preferredLanguage: 'en' })
  const [resumeFile, setResumeFile] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getPublicDrive(link)
      .then(setDrive)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    if (localStorage.getItem(ALREADY_APPLIED_KEY(link))) {
      setSubmitted(true)
    }
  }, [link])

  useEffect(() => {
    if (!emailFromInvite) return
    getApplicationPrefill(link, emailFromInvite, tokenFromInvite)
      .then((result) => {
        if (!result.prefilled) return
        setLockedFields({ name: result.name, phone: result.phone, exp: result.exp })
        setForm((prev) => ({ ...prev, name: result.name, email: emailFromInvite, phone: result.phone, exp: result.exp }))
      })
      .catch(() => {}) // best-effort - a failed lookup just means the form starts blank, same as opening the link without ?email
  }, [link, emailFromInvite, tokenFromInvite])

  const isBlueCollar = drive?.roleCategory === 'BLUE_COLLAR'

  const slotBounds = useMemo(() => {
    if (!drive) return null
    const now = minutesFromNow(new Date(), 5)
    const start = drive.startDate ? new Date(drive.startDate) : now
    const min = start > now ? start : now
    const max = new Date(drive.expiryDate)
    return { min: toLocalInputValue(min), max: toLocalInputValue(max) }
  }, [drive])

  const handleChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null
    setResumeFile(file)
    setFieldErrors((prev) => ({ ...prev, resume: undefined }))
  }

  const validate = () => {
    const errors = {}
    for (const field of CANDIDATE_FIELDS) {
      const value = form[field.key]
      if (field.required && !value?.trim()) {
        errors[field.key] = `${field.label} is required.`
      } else if (field.validate && value && !field.validate(value)) {
        errors[field.key] = field.invalidMessage || `Invalid ${field.label}.`
      }
    }
    if (!resumeFile && !isBlueCollar) errors.resume = 'Please upload your resume.'
    if (!form.interviewSlot) errors.interviewSlot = 'Please choose an interview slot.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('email', form.email)
      formData.append('phone', form.phone)
      formData.append('exp', form.exp)
      formData.append('interviewSlot', new Date(form.interviewSlot).toISOString())
      formData.append('preferredLanguage', form.preferredLanguage)
      if (resumeFile) formData.append('resume', resumeFile)

      await applyToDrive(link, formData)
      localStorage.setItem(ALREADY_APPLIED_KEY(link), '1')
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center p-6'>
        <Card className='w-full max-w-lg p-8'>
          <Skeleton className='h-8 w-2/3 mb-4' />
          <Skeleton className='h-4 w-full mb-2' />
          <Skeleton className='h-4 w-5/6 mb-6' />
          <Skeleton className='h-40 w-full' />
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center p-6'>
        <Card className='w-full max-w-md p-8 text-center'>
          <AlertCircle size={40} className='mx-auto mb-4 text-red-500' />
          <h1 className='text-lg font-bold text-ink mb-2'>Unable to load this invitation</h1>
          <p className='text-[14px] text-text-secondary'>{error}</p>
        </Card>
      </div>
    )
  }

  if (drive?.expired) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center p-6'>
        <Card className='w-full max-w-md p-8 text-center'>
          <Clock size={40} className='mx-auto mb-4 text-warning' />
          <h1 className='text-lg font-bold text-ink mb-2'>This invitation has expired</h1>
          <p className='text-[14px] text-text-secondary'>
            The application window for {drive.title} at {drive.companyName || 'this company'} has closed.
          </p>
        </Card>
      </div>
    )
  }

  if (!drive?.roundOpen && !submitted) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center p-6'>
        <Card className='w-full max-w-md p-8 text-center'>
          <Clock size={40} className='mx-auto mb-4 text-warning' />
          <h1 className='text-lg font-bold text-ink mb-2'>Not accepting applications right now</h1>
          <p className='text-[14px] text-text-secondary'>This interview drive isn't currently open for applications.</p>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center p-6'>
        <Card className='w-full max-w-lg p-8 text-center'>
          <CheckCircle2 size={44} className='mx-auto mb-4 text-success' />
          <h1 className='text-xl font-bold text-ink mb-2'>Application received!</h1>
          <p className='text-[14px] text-text-secondary mb-1'>
            Thanks for applying to {drive?.title} at {drive?.companyName || 'this company'}.
          </p>
          <p className='text-[14px] text-text-secondary'>
            A confirmation email is on its way with your interview details. Please check your inbox (and spam folder).
          </p>
        </Card>
      </div>
    )
  }

  // Blue-collar keeps a compact, essentials-only card (resume optional, a
  // language choice since corporate English/formal Hindi isn't always the
  // safe default for these roles - see workmate-iq-agent's
  // PLAIN_LANGUAGE_ROLE_TYPES). Every other profile gets a wider, fuller
  // card - there's more supporting context worth showing and no reason to
  // cram it into a narrow column.
  return (
    <div className='min-h-screen bg-bg flex items-center justify-center p-6'>
      <Card className={`w-full p-8 ${isBlueCollar ? 'max-w-lg' : 'max-w-2xl'}`}>
        <div className='flex items-center gap-3 mb-6'>
          <img src={logo} alt='' className='w-9 h-9 rounded-lg' />
          <div>
            <p className='text-[12px] font-semibold uppercase tracking-wide text-accent'>You're invited to interview</p>
            <h1 className='text-lg font-bold text-ink'>{drive.title}</h1>
          </div>
        </div>

        <div className='flex flex-wrap gap-4 mb-6 text-[13px] text-text-secondary'>
          {drive.companyName && (
            <span className='inline-flex items-center gap-1.5'>
              <Building2 size={14} /> {drive.companyName}
            </span>
          )}
          <span className='inline-flex items-center gap-1.5'>
            <Briefcase size={14} /> {drive.department}
          </span>
          <span className='inline-flex items-center gap-1.5'>
            <Clock size={14} /> Apply by {new Date(drive.expiryDate).toLocaleDateString()}
          </span>
        </div>

        <form onSubmit={handleSubmit} className={isBlueCollar ? 'space-y-4' : 'grid sm:grid-cols-2 gap-4'}>
          {CANDIDATE_FIELDS.map((field) => {
            const isLocked = lockedFields && field.key in lockedFields
            return (
              <Input
                key={field.key}
                id={field.key}
                label={`${field.label}${field.required ? ' *' : ''}`}
                type={field.type === 'email' ? 'email' : 'text'}
                value={form[field.key]}
                onChange={handleChange(field.key)}
                error={fieldErrors[field.key]}
                placeholder={field.sample}
                disabled={isLocked}
                hint={isLocked ? 'Already on file with the hiring team' : undefined}
                icon={isLocked ? Lock : undefined}
                wrapperClassName={!isBlueCollar && field.key !== 'name' ? '' : 'sm:col-span-2'}
              />
            )
          })}

          <Field label={isBlueCollar ? 'Resume (optional)' : 'Resume *'} error={fieldErrors.resume} id='resume' className={!isBlueCollar ? 'sm:col-span-2' : ''}>
            <label
              htmlFor='resume'
              className='flex items-center gap-3 w-full bg-card border border-dashed border-line rounded-xl px-4 py-3.5 text-[14px] text-text-secondary cursor-pointer hover:border-accent/50 transition-colors'
            >
              {resumeFile ? <FileText size={18} className='text-accent shrink-0' /> : <UploadCloud size={18} className='shrink-0' />}
              <span className='truncate'>{resumeFile ? resumeFile.name : 'Upload PDF or Word document (max 8MB)'}</span>
            </label>
            <input
              id='resume'
              type='file'
              accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              className='hidden'
              onChange={handleFileChange}
            />
          </Field>

          <Input
            id='interviewSlot'
            label='Choose your interview slot *'
            type='datetime-local'
            icon={CalendarClock}
            value={form.interviewSlot}
            onChange={handleChange('interviewSlot')}
            min={slotBounds?.min}
            max={slotBounds?.max}
            error={fieldErrors.interviewSlot}
          />

          {isBlueCollar && (
            <div>
              <label className='block text-[13.5px] font-semibold text-ink mb-2' htmlFor='preferredLanguage'>
                Interview language
              </label>
              <div className='relative'>
                <Languages size={16} className='absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none' />
                <select
                  id='preferredLanguage'
                  value={form.preferredLanguage}
                  onChange={handleChange('preferredLanguage')}
                  className='w-full bg-card border border-line rounded-xl pl-12 pr-4 py-3 text-[14px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 appearance-none'
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <p className='text-[12px] text-text-secondary mt-2'>Your AI interviewer will speak with you in this language.</p>
            </div>
          )}

          {submitError && (
            <p className={`text-[13px] text-red-500 flex items-center gap-1.5 ${!isBlueCollar ? 'sm:col-span-2' : ''}`}>
              <AlertCircle size={14} /> {submitError}
            </p>
          )}

          <button
            type='submit'
            disabled={submitting}
            className={`w-full bg-accent text-white font-semibold text-[14.5px] rounded-xl py-3.5 mt-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${!isBlueCollar ? 'sm:col-span-2' : ''}`}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </Card>
    </div>
  )
}

export default ApplyPage
