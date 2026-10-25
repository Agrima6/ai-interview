import React, { useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button, Textarea } from '../ui'
import { parseStudents } from '../../utils/parseStudents'

function AddStudentsModal({ open, onClose, onSubmit, submitting = false }) {
    const [text, setText] = useState('')
    const rows = useMemo(() => parseStudents(text), [text])
    const valid = rows.filter((r) => !r.problems.length)
    const invalid = rows.filter((r) => r.problems.length)

    const onFile = async (e) => {
        const file = e.target.files?.[0]
        if (file) setText(await file.text())
        e.target.value = ''
    }
    const close = () => { setText(''); onClose() }

    return (
        <Modal
            open={open}
            onClose={close}
            title="Add students"
            subtitle="Paste rows or upload a CSV. Columns: name, email, phone (optional), roll number, branch, batch."
            size="lg"
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-[12.5px] text-text-secondary" aria-live="polite">
                        {rows.length ? `${valid.length} ready${invalid.length ? ` · ${invalid.length} need fixing` : ''}` : 'Nothing added yet'}
                    </span>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={close} disabled={submitting}>Cancel</Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={submitting || valid.length === 0 || invalid.length > 0}
                            onClick={async () => { await onSubmit(valid.map((r) => ({ name: r.name, email: r.email, phone: r.phone, rollNumber: r.rollNumber, branch: r.branch, batch: r.batch }))); setText('') }}
                        >
                            {submitting ? 'Adding...' : `Add ${valid.length || ''} student${valid.length === 1 ? '' : 's'}`}
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                <label className="flex items-center gap-2 text-[13.5px] font-medium text-accent cursor-pointer w-fit min-h-[44px]">
                    <Upload size={16} aria-hidden="true" /> Upload CSV
                    <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={onFile} />
                </label>
                <Textarea
                    id="students-paste"
                    label="Students"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={'name,email,phone,roll number,branch,batch\nAsha Verma,asha@college.edu,9876543210,21CS001,Computer Science & Engineering,2025'}
                    className="min-h-[160px] font-mono text-[12.5px]"
                />
                {invalid.length > 0 && (
                    <ul className="text-[12.5px] text-red-600 space-y-1 max-h-32 overflow-auto" role="alert">
                        {invalid.slice(0, 8).map((r) => <li key={r.line}>Row {r.line}: {r.problems.join(', ')}</li>)}
                        {invalid.length > 8 && <li>...and {invalid.length - 8} more</li>}
                    </ul>
                )}
            </div>
        </Modal>
    )
}

export default AddStudentsModal
