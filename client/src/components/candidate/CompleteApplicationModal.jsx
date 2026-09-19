import React, { useState, useRef } from 'react'
import {
    X, UploadCloud, FileText, CheckCircle2, AlertCircle, Calendar, Clock,
    GraduationCap, Phone, User, Globe, Briefcase, Sparkles, Loader2, Trash2
} from 'lucide-react'
import { Modal, Button, Badge } from '../ui'
import { submitCandidateApplication } from '../../api/organization/organizationApi'

export default function CompleteApplicationModal({ open, onClose, interview, onSuccess }) {
    if (!interview) return null

    const [submitting, setSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    // Form states
    const [name, setName] = useState(interview.candidateName || '')
    const [phone, setPhone] = useState(interview.candidatePhone || '')
    const [degree, setDegree] = useState('')
    const [college, setCollege] = useState('')
    const [exp, setExp] = useState(interview.candidateExp || '')
    const [preferredLanguage, setPreferredLanguage] = useState('en')
    const [selectedSlot, setSelectedSlot] = useState('')
    const [resumeFile, setResumeFile] = useState(null)
    const [dragActive, setDragActive] = useState(false)

    const fileInputRef = useRef(null)

    // Generate upcoming dates within drive validity for student slot selection
    const generateAvailableSlots = () => {
        const slots = []
        const now = new Date()
        const startDay = new Date(now.getTime() + 60 * 60 * 1000) // 1 hr from now
        const expiry = interview.expiryDate ? new Date(interview.expiryDate) : new Date(now.getTime() + 14 * 86400000)

        // Generate 3 sample days
        for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
            const date = new Date(startDay.getTime() + dayOffset * 86400000)
            if (date > expiry) break

            const dateLabel = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
            const isoBase = date.toISOString().slice(0, 10)

            const times = ['10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '06:00 PM']
            slots.push({
                dateLabel,
                isoBase,
                times: times.map((t) => {
                    const [timePart, modifier] = t.split(' ')
                    let [hours, minutes] = timePart.split(':')
                    if (modifier === 'PM' && hours !== '12') hours = String(parseInt(hours, 10) + 12)
                    if (modifier === 'AM' && hours === '12') hours = '00'
                    return {
                        label: t,
                        iso: `${isoBase}T${hours.padStart(2, '0')}:${minutes}:00`,
                    }
                }),
            })
        }
        return slots
    }

    const availableSlots = generateAvailableSlots()

    const handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
        else if (e.type === 'dragleave') setDragActive(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0])
        }
    }

    const handleFile = (file) => {
        setErrorMessage('')
        if (!file.type.includes('pdf') && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
            setErrorMessage('Please upload a PDF or DOCX file.')
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage('File size exceeds 10MB limit.')
            return
        }
        setResumeFile(file)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMessage('')

        if (!selectedSlot) {
            setErrorMessage('Please select an interview time slot.')
            return
        }
        if (!resumeFile && !interview.resumeFilename && !interview.resumeOptional) {
            setErrorMessage('Please upload your resume to continue.')
            return
        }

        setSubmitting(true)
        try {
            const formData = new FormData()
            if (resumeFile) formData.append('resume', resumeFile)
            formData.append('interviewSlot', selectedSlot)
            if (phone) formData.append('phone', phone.trim())
            if (exp) formData.append('exp', exp.trim())
            if (degree) formData.append('degree', degree.trim())
            if (college) formData.append('college', college.trim())
            formData.append('preferredLanguage', preferredLanguage)

            const response = await submitCandidateApplication(
                interview.driveId,
                interview.roundNumber || 1,
                formData
            )
            onSuccess(response)
            onClose()
        } catch (err) {
            setErrorMessage(err.message || 'Failed to submit your application. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title='Complete Your Application'
            subtitle={`${interview.driveTitle} · ${interview.department || 'Technical Evaluation'}`}
            size='lg'
        >
            <form onSubmit={handleSubmit} className='space-y-6 pt-2 pb-4'>
                {errorMessage && (
                    <div className='p-3.5 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-600 flex items-center gap-2.5'>
                        <AlertCircle size={16} className='shrink-0' />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Role Brief Banner */}
                <div className='p-4 rounded-xl border border-line bg-card/60 flex items-start justify-between gap-3'>
                    <div>
                        <div className='flex items-center gap-2 mb-1'>
                            <h3 className='font-semibold text-[14.5px] text-ink'>{interview.driveTitle}</h3>
                            <Badge variant='neutral'>{interview.roundTitle}</Badge>
                        </div>
                        <p className='text-[12.5px] text-text-secondary flex items-center gap-1.5'>
                            <Briefcase size={12} /> {interview.department} &bull; {interview.roleCategory || 'General'}
                        </p>
                    </div>
                    {interview.passingThreshold && (
                        <div className='text-right shrink-0'>
                            <p className='text-[11px] font-semibold text-text-secondary uppercase tracking-wider'>Benchmark</p>
                            <p className='text-[13.5px] font-bold text-ink'>{interview.passingThreshold}% Passing</p>
                        </div>
                    )}
                </div>

                {/* Section 1: Candidate Academic & Contact Details */}
                <div>
                    <h4 className='font-display text-[13.5px] font-bold text-ink mb-3 flex items-center gap-1.5'>
                        <User size={15} className='text-accent' /> Candidate & Academic Details
                    </h4>
                    <div className='grid sm:grid-cols-2 gap-3.5'>
                        <div>
                            <label className='block text-[12px] font-semibold text-text-secondary mb-1'>Full Name</label>
                            <input
                                type='text'
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className='w-full px-3 py-2 text-[13px] rounded-lg border border-line bg-card focus:outline-none focus:ring-1 focus:ring-accent text-ink'
                                placeholder='Your name'
                            />
                        </div>
                        <div>
                            <label className='block text-[12px] font-semibold text-text-secondary mb-1'>Phone Number</label>
                            <div className='relative'>
                                <Phone size={13} className='absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary' />
                                <input
                                    type='tel'
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className='w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-line bg-card focus:outline-none focus:ring-1 focus:ring-accent text-ink'
                                    placeholder='10-digit mobile'
                                />
                            </div>
                        </div>
                        <div>
                            <label className='block text-[12px] font-semibold text-text-secondary mb-1'>Degree / Program</label>
                            <div className='relative'>
                                <GraduationCap size={13} className='absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary' />
                                <input
                                    type='text'
                                    value={degree}
                                    onChange={(e) => setDegree(e.target.value)}
                                    className='w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-line bg-card focus:outline-none focus:ring-1 focus:ring-accent text-ink'
                                    placeholder='e.g. B.Tech Computer Science'
                                />
                            </div>
                        </div>
                        <div>
                            <label className='block text-[12px] font-semibold text-text-secondary mb-1'>College / Institution</label>
                            <input
                                type='text'
                                value={college}
                                onChange={(e) => setCollege(e.target.value)}
                                className='w-full px-3 py-2 text-[13px] rounded-lg border border-line bg-card focus:outline-none focus:ring-1 focus:ring-accent text-ink'
                                placeholder='e.g. Delhi Technological University'
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Resume Upload Dropzone */}
                <div>
                    <div className='flex items-center justify-between mb-2'>
                        <h4 className='font-display text-[13.5px] font-bold text-ink flex items-center gap-1.5'>
                            <FileText size={15} className='text-accent' /> Upload Resume / CV
                        </h4>
                        {interview.resumeOptional && (
                            <span className='text-[11.5px] text-text-secondary font-medium'>(Optional for this role)</span>
                        )}
                    </div>

                    {resumeFile ? (
                        <div className='p-4 rounded-xl border border-success/30 bg-success/5 flex items-center justify-between gap-3'>
                            <div className='flex items-center gap-2.5 min-w-0'>
                                <div className='w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center text-success shrink-0'>
                                    <FileText size={18} />
                                </div>
                                <div className='min-w-0'>
                                    <p className='text-[13px] font-semibold text-ink truncate'>{resumeFile.name}</p>
                                    <p className='text-[11.5px] text-text-secondary'>{(resumeFile.size / 1024).toFixed(0)} KB &bull; Attached</p>
                                </div>
                            </div>
                            <button
                                type='button'
                                onClick={() => setResumeFile(null)}
                                className='text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors'
                                title='Remove file'
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ) : (
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragActive ? 'border-accent bg-accent/5' : 'border-line hover:border-accent/60 bg-black/[0.01]'}`}
                        >
                            <input
                                ref={fileInputRef}
                                type='file'
                                accept='.pdf,.docx,application/pdf'
                                onChange={handleFileChange}
                                className='hidden'
                            />
                            <div className='w-11 h-11 mx-auto rounded-full bg-accent/10 text-accent flex items-center justify-center mb-2'>
                                <UploadCloud size={20} />
                            </div>
                            <p className='text-[13px] font-semibold text-ink mb-0.5'>
                                Click to browse or drag & drop your resume
                            </p>
                            <p className='text-[11.5px] text-text-secondary'>
                                PDF or DOCX up to 10MB
                            </p>
                        </div>
                    )}
                </div>

                {/* Section 3: Interactive Interview Time Slot Selection */}
                <div>
                    <h4 className='font-display text-[13.5px] font-bold text-ink mb-1 flex items-center gap-1.5'>
                        <Calendar size={15} className='text-accent' /> Select Preferred Interview Slot
                    </h4>
                    <p className='text-[12px] text-text-secondary mb-3'>
                        Choose a convenient time slot before the round deadline ({new Date(interview.expiryDate).toLocaleDateString()}).
                    </p>

                    <div className='space-y-3.5'>
                        {availableSlots.map((day) => (
                            <div key={day.isoBase} className='p-3 rounded-xl border border-line bg-card/40'>
                                <p className='text-[12px] font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5'>
                                    <Clock size={11} className='text-text-secondary' /> {day.dateLabel}
                                </p>
                                <div className='flex flex-wrap gap-2'>
                                    {day.times.map((timeSlot) => {
                                        const isSelected = selectedSlot === timeSlot.iso
                                        return (
                                            <button
                                                type='button'
                                                key={timeSlot.iso}
                                                onClick={() => setSelectedSlot(timeSlot.iso)}
                                                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${isSelected ? 'bg-accent text-white shadow-sm' : 'bg-black/[0.03] dark:bg-white/[0.05] text-ink hover:bg-black/[0.07]'}`}
                                            >
                                                {timeSlot.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 4: Preferred Spoken Language */}
                <div>
                    <label className='block text-[12px] font-bold text-ink mb-1.5 flex items-center gap-1.5'>
                        <Globe size={14} className='text-accent' /> Preferred Spoken Language
                    </label>
                    <div className='grid grid-cols-3 gap-2.5'>
                        {[
                            { id: 'en', label: 'English', desc: 'Global technical standard' },
                            { id: 'hinglish', label: 'Hinglish', desc: 'Natural Hindi + English mix' },
                            { id: 'hi', label: 'Hindi (हिंदी)', desc: 'Full Hindi conversation' },
                        ].map((lang) => (
                            <button
                                key={lang.id}
                                type='button'
                                onClick={() => setPreferredLanguage(lang.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${preferredLanguage === lang.id ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-line hover:border-accent/40 bg-card'}`}
                            >
                                <p className='text-[13px] font-bold text-ink leading-tight'>{lang.label}</p>
                                <p className='text-[11px] text-text-secondary mt-0.5'>{lang.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className='pt-3 border-t border-line flex items-center justify-end gap-3'>
                    <Button type='button' variant='secondary' size='sm' onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type='submit' size='sm' disabled={submitting || !selectedSlot}>
                        {submitting ? (
                            <>
                                <Loader2 size={14} className='animate-spin mr-1.5' /> Confirming Slot...
                            </>
                        ) : (
                            <>
                                Confirm Slot & Complete Application →
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
