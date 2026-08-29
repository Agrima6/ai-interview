import React, { useState } from 'react'
import Modal from './Modal'
import Button from '../Button'

/**
 * Confirmation dialog for any destructive/consequential action (approve,
 * reject, block/unblock, delete field/section, publish). Composes Modal
 * instead of window.confirm() so the app never uses the browser's native
 * blocking dialog.
 *
 * `onConfirm` may return a promise - the confirm button shows a loading
 * state and stays disabled until it resolves/rejects, so a slow request
 * can't be double-submitted by an impatient extra click.
 */
function ConfirmModal({ open, onClose, title, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm }) {
    const [submitting, setSubmitting] = useState(false)

    const handleConfirm = async () => {
        setSubmitting(true)
        try {
            await onConfirm?.()
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={submitting ? undefined : onClose}
            title={title}
            size='sm'
            footer={
                <>
                    <Button variant='secondary' size='sm' onClick={onClose} disabled={submitting}>
                        {cancelLabel}
                    </Button>
                    <Button variant={danger ? 'danger' : 'primary'} size='sm' onClick={handleConfirm} disabled={submitting}>
                        {submitting ? 'Please wait...' : confirmLabel}
                    </Button>
                </>
            }
        >
            <div className='text-[14px] text-text-secondary leading-relaxed'>{children}</div>
        </Modal>
    )
}

export default ConfirmModal
