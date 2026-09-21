import React, { useState } from 'react'
import { AlertCircle, CalendarClock, Loader2 } from 'lucide-react'
import { Modal, Button } from '../ui'
import { rescheduleCandidateSlot } from '../../api/organization/organizationApi'
import CandidateCalendarPicker from './CandidateCalendarPicker'
import { getSlotGate } from '../../utils/slotRules'

/**
 * Lets a candidate move their interview slot. Allowed until 30 minutes before the CURRENT slot (the
 * server enforces this; the UI check just avoids offering an action that will be refused).
 */
export default function RescheduleSlotModal({ open, onClose, interview, onRescheduled }) {
    const [newSlot, setNewSlot] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    if (!interview) return null
    const gate = getSlotGate(interview.interviewSlot)
    const currentLabel = interview.interviewSlot
        ? new Date(interview.interviewSlot).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        : 'Not scheduled'

    const handleSubmit = async () => {
        if (submitting) return
        if (!newSlot) {
            setErrorMessage('Please pick a new date and time.')
            return
        }
        setSubmitting(true)
        setErrorMessage('')
        try {
            const result = await rescheduleCandidateSlot(interview.driveId, interview.roundNumber || 1, newSlot)
            onRescheduled?.(result)
            onClose()
        } catch (err) {
            setErrorMessage(err.message || 'Could not reschedule your slot. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title='Reschedule Interview Slot'
            subtitle={`${interview.driveTitle} · currently ${currentLabel}`}
            size='lg'
            footer={(
                <>
                    <Button type='button' variant='secondary' size='sm' onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button type='button' size='sm' onClick={handleSubmit} disabled={submitting || !newSlot || !gate.canReschedule}>
                        {submitting ? <><Loader2 size={14} className='animate-spin mr-1.5' /> Saving...</> : 'Confirm New Slot'}
                    </Button>
                </>
            )}
        >
            <div className='space-y-4 pt-1 pb-2'>
                {!gate.canReschedule && (
                    <div className='p-3.5 rounded-xl border border-amber-300 bg-amber-50/60 text-[13px] text-amber-800 flex items-start gap-2.5'>
                        <AlertCircle size={16} className='shrink-0 mt-0.5' />
                        <span>Rescheduling closes 30 minutes before your scheduled interview.</span>
                    </div>
                )}
                {errorMessage && (
                    <div className='p-3.5 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-600 flex items-start gap-2.5'>
                        <AlertCircle size={16} className='shrink-0 mt-0.5' />
                        <span>{errorMessage}</span>
                    </div>
                )}
                <p className='text-[12.5px] text-text-secondary flex items-center gap-1.5'>
                    <CalendarClock size={14} className='text-accent shrink-0' />
                    Choose a new time within the drive window. You can reschedule until 30 minutes before your slot.
                </p>
                <CandidateCalendarPicker
                    value={newSlot}
                    onChange={setNewSlot}
                    startDate={interview.startDate}
                    expiryDate={interview.expiryDate}
                />
            </div>
        </Modal>
    )
}
