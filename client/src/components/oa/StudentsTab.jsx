import React, { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Download, FileUp, Mail, Send, Trash2, UserPlus, Users } from 'lucide-react'
import { oaApi } from '../../api/oaApi'
import { parseCsv } from '../../utils/csvRows'
import Badge from '../ui/Badge'
import Button from '../Button'
import ConfirmModal from '../ui/ConfirmModal'
import EmptyState from '../ui/EmptyState'
import Modal from '../ui/Modal'
import Pagination from '../ui/Pagination'
import SearchInput from '../ui/SearchInput'
import { useToast } from '../ui/Toast'
import { AttemptStatus, ErrorState, TableSkeleton } from './oaUi'
import { downloadText, formatDateTime, formatDay, formatTime } from './oaFormat'
import { PhoneField, TextField } from './oaFields'
import { LIMITS, emailError, lengthError, nameError, normalizePhone, phoneError } from './oaRules'

const TEMPLATE = 'name,email,phone,rollNumber,branch,batch\nAsha Verma,asha@college.edu,9876543210,CS21001,CSE,2026\nRahul Mehta,rahul@college.edu,,CS21002,CSE,2026\n'
const KNOWN = ['name', 'email', 'phone', 'rollnumber']

// Reads a name/email list. Extra columns (branch, batch, college...) ride along as details the admin can see later.
const parseStudents = (text) => {
    const { rows } = parseCsv(text)
    if (rows.length < 2) return []
    const header = rows[0].map((h) => h.trim())
    const key = (h) => h.replace(/[\s_-]+/g, '').toLowerCase()
    const index = (name) => header.findIndex((h) => key(h) === name)
    const [n, e, p, r] = ['name', 'email', 'phone', 'rollnumber'].map(index)
    return rows.slice(1).map((cells) => ({
        name: cells[n] || '', email: cells[e] || '', phone: p >= 0 ? cells[p] || '' : '', rollNumber: r >= 0 ? cells[r] || '' : '',
        details: Object.fromEntries(header.map((h, i) => [h, cells[i]]).filter(([h, v]) => v && !KNOWN.includes(key(h)))),
    }))
}

// One rule set for a row, whether it came from a file or the single-add form: the first problem found, or ''.
const rowProblem = (r) => nameError(r.name, { ...LIMITS.studentName, label: 'Name' }) || emailError(r.email) || phoneError(r.phone)
    || lengthError(r.rollNumber, { max: LIMITS.rollNumber.max, label: 'Roll number' })

function ImportModal({ open, onClose, assessmentId, onDone }) {
    const toast = useToast()
    const input = useRef(null)
    const [rows, setRows] = useState([])
    const [fileName, setFileName] = useState('')
    const [single, setSingle] = useState({ name: '', email: '', phone: '', rollNumber: '' })
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const checked = rows.map((r, i) => {
        const dup = rows.findIndex((x) => x.email.trim().toLowerCase() === r.email.trim().toLowerCase()) !== i
        const problem = rowProblem(r) || (dup ? 'Repeated in this file' : '')
        return { ...r, problem }
    })
    const valid = checked.filter((r) => !r.problem)
    const invalid = checked.length - valid.length

    const send = useMutation({
        mutationFn: (list) => oaApi.addStudents(assessmentId, list),
        onSuccess: (r) => { setResult(r); onDone(); if (!r.skipped.length) { toast.success(`${r.added} student${r.added === 1 ? '' : 's'} added.`); onClose() } },
        onError: (err) => setError(err.message),
    })

    const pick = async (file) => {
        if (!file) return
        setError(''); setResult(null)
        try { setRows(parseStudents(await file.text())); setFileName(file.name) } catch { setError('That file could not be read. Use the template (CSV).') }
    }

    return (
        <Modal open={open} onClose={onClose} title='Add students' size='lg'
            footer={<><Button variant='secondary' size='sm' onClick={onClose}>Close</Button>
                {rows.length > 0 ? <Button size='sm' disabled={!valid.length || send.isPending} onClick={() => send.mutate(valid.map(({ name, email, phone, rollNumber, details }) => ({ name, email, phone: normalizePhone(phone) || '', rollNumber, details })))}>{send.isPending ? 'Adding…' : `Add ${valid.length} student${valid.length === 1 ? '' : 's'}`}</Button>
                    : <Button size='sm' disabled={Boolean(rowProblem(single)) || send.isPending} onClick={() => send.mutate([{ ...single, phone: normalizePhone(single.phone) || '' }])}>Add student</Button>}</>}>
            <div className='space-y-5'>
                <p className='text-[13.5px] text-text-secondary'>Names and emails are enough. Each student gets a personal access code, and extra columns (branch, batch, college) are kept as details.</p>
                {error && <div role='alert' className='text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5'>{error}</div>}
                <div className='flex flex-wrap gap-2'>
                    <Button size='sm' variant='secondary' onClick={() => downloadText('students-template.csv', TEMPLATE)}><Download size={14} /> Download template</Button>
                    <Button size='sm' variant='secondary' onClick={() => input.current?.click()}><FileUp size={14} /> Choose CSV file</Button>
                    <input ref={input} type='file' accept='.csv,text/csv' className='sr-only' aria-label='Choose a students file' onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
                </div>

                {rows.length === 0 && (
                    <fieldset className='border border-line rounded-xl p-4'>
                        <legend className='px-1 text-[12.5px] font-semibold text-ink'>Or add one student</legend>
                        <div className='grid sm:grid-cols-2 gap-x-3 gap-y-4'>
                            <TextField label='Name' value={single.name} onChange={(v) => setSingle({ ...single, name: v })} max={LIMITS.studentName.max} error={nameError(single.name, { ...LIMITS.studentName, label: 'Name' })} placeholder='Full name' autoComplete='off' />
                            <TextField label='Email' type='email' value={single.email} onChange={(v) => setSingle({ ...single, email: v })} max={200} error={emailError(single.email)} placeholder='name@college.edu' autoComplete='off' />
                            <PhoneField label='Mobile (optional)' value={single.phone} onChange={(v) => setSingle({ ...single, phone: v })} error={phoneError(single.phone)} />
                            <TextField label='Roll number (optional)' value={single.rollNumber} onChange={(v) => setSingle({ ...single, rollNumber: v })} max={LIMITS.rollNumber.max} error={lengthError(single.rollNumber, { max: LIMITS.rollNumber.max, label: 'Roll number' })} />
                        </div>
                    </fieldset>
                )}

                {rows.length > 0 && (
                    <div className='border border-line rounded-xl overflow-hidden'>
                        <div className='px-4 py-2.5 bg-surface-muted text-[13px] font-semibold flex flex-wrap gap-x-4'>
                            <span>{fileName}</span><span className='text-[var(--color-success)]'>✓ {valid.length} ready</span>{invalid > 0 && <span className='text-[var(--color-danger)]'>✕ {invalid} to fix (skipped)</span>}
                        </div>
                        <div className='max-h-56 overflow-auto'>
                            <table className='w-full text-[12.5px]'><thead className='text-left text-text-secondary sticky top-0 bg-card'><tr><th className='px-4 py-2'>Name</th><th className='px-4 py-2'>Email</th><th className='px-4 py-2'>Mobile</th><th className='px-4 py-2'>Roll</th><th className='px-4 py-2'>Check</th></tr></thead>
                                <tbody className='divide-y divide-line'>{checked.slice(0, 200).map((r, i) => (
                                    <tr key={i}><td className='px-4 py-1.5'>{r.name}</td><td className='px-4 py-1.5'>{r.email}</td><td className='px-4 py-1.5 tabular-nums'>{r.phone}</td><td className='px-4 py-1.5'>{r.rollNumber}</td>
                                        <td className='px-4 py-1.5'>{r.problem ? <span className='text-[var(--color-danger)] font-medium'>{r.problem}</span> : <span className='text-[var(--color-success)]'>OK</span>}</td></tr>))}</tbody></table>
                        </div>
                    </div>
                )}

                {result?.skipped.length > 0 && (
                    <div role='status' className='border border-[var(--color-warning)]/30 rounded-xl overflow-hidden'>
                        <div className='px-4 py-2.5 bg-[var(--color-warning-soft)] text-[13px] font-semibold text-[var(--color-warning)]'>{result.added} added, {result.skipped.length} skipped</div>
                        <ul className='max-h-32 overflow-y-auto divide-y divide-line text-[13px]'>{result.skipped.map((s) => <li key={`${s.row}-${s.email}`} className='px-4 py-2'>Row {s.row} {s.email && `(${s.email})`}: {s.reason}</li>)}</ul>
                    </div>
                )}
            </div>
        </Modal>
    )
}

const INVITE = { NOT_SENT: ['neutral', 'Not sent'], SENT: ['success', 'Sent'], FAILED: ['danger', 'Failed'] }

export default function StudentsTab({ assessment: a }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [q, setQ] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [adding, setAdding] = useState(false)
    const [removing, setRemoving] = useState(null)
    useEffect(() => { const id = setTimeout(() => { setQ(search); setPage(1) }, 350); return () => clearTimeout(id) }, [search])

    const list = useQuery({ queryKey: ['oa', 'assessment', a.id, 'students', { q, page, pageSize }], queryFn: () => oaApi.listStudents(a.id, { search: q, page, pageSize }), placeholderData: (p) => p })
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['oa'] })
    const published = a.status === 'PUBLISHED' && a.phase !== 'ENDED'
    const slotted = a.schedule?.mode === 'SLOTS'

    const invite = useMutation({
        mutationFn: (body) => oaApi.invite(a.id, body),
        onSuccess: (r) => {
            refresh()
            if (!r.attempted) toast.info('Everyone on the list has already been emailed.')
            else if (r.failed.length) toast.warning(`${r.sent} sent, ${r.failed.length} could not be emailed. Copy their access codes from the table.`)
            else toast.success(`${r.sent} invitation${r.sent === 1 ? '' : 's'} sent.`)
        },
        onError: (err) => toast.error(err.message),
    })
    const remove = useMutation({
        mutationFn: (id) => oaApi.removeStudent(a.id, id),
        onSuccess: () => { refresh(); setRemoving(null); toast.success('Student removed.') },
        onError: (err) => { setRemoving(null); toast.error(err.message) },
    })

    const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); toast.success(`${what} copied.`) } catch { toast.error('Could not copy. Select it and copy by hand.') } }
    const items = list.data?.items || []

    return (
        <>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4'>
                <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search name, email or roll number' className='lg:w-80' />
                <div className='flex flex-wrap gap-2'>
                    <Button size='sm' variant='secondary' onClick={() => setAdding(true)}><UserPlus size={14} /> Add students</Button>
                    <Button size='sm' disabled={!published || invite.isPending || !list.data?.total} title={published ? undefined : 'Publish the test first'} onClick={() => invite.mutate({})}><Send size={14} /> {invite.isPending ? 'Sending…' : 'Email invitations'}</Button>
                </div>
            </div>
            {!published && <p className='text-[12.5px] text-text-secondary mb-3'>{a.status === 'PUBLISHED' ? 'This test has closed, so invitations can no longer be sent.' : 'Publish the test to email invitations. You can add students any time.'}</p>}

            <div className='bg-card border border-line rounded-2xl overflow-hidden'>
                {list.isError ? <ErrorState title='Could not load students' message={list.error.message} onRetry={list.refetch} /> : list.isLoading ? <TableSkeleton cols={5} /> : items.length === 0 ? (
                    <EmptyState icon={Users} title={q ? 'No students match' : 'No students yet'} description={q ? 'Try a different search.' : 'Upload a CSV with names and emails, or add students one at a time. They sign in with their email and a personal access code.'} actionLabel={q ? undefined : 'Add students'} onAction={() => setAdding(true)} />
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-[13.5px] min-w-[900px]'>
                            <thead className='bg-surface-muted text-left text-[12px] font-semibold text-text-secondary'><tr><th className='px-4 py-3'>Student</th><th className='px-4 py-3'>Roll no.</th>{slotted && <th className='px-4 py-3'>Time slot</th>}<th className='px-4 py-3'>Invitation</th><th className='px-4 py-3'>Access code</th><th className='px-4 py-3'>Test</th><th className='px-4 py-3'><span className='sr-only'>Actions</span></th></tr></thead>
                            <tbody className='divide-y divide-line'>
                                {items.map((s) => (
                                    <tr key={s.id} className='ui-row'>
                                        <td className='px-4 py-3'><div className='font-semibold text-ink'>{s.name}</div><div className='text-[12px] text-text-secondary'>{s.email}</div></td>
                                        <td className='px-4 py-3'>{s.rollNumber || '—'}</td>
                                        {slotted && <td className='px-4 py-3 whitespace-nowrap'>{s.slot ? <><div className='font-medium text-ink'>{formatTime(s.slot.startAt, a.schedule.timezone)}</div><div className='text-[12px] text-text-secondary'>{formatDay(s.slot.startAt, a.schedule.timezone)}</div></> : <Badge variant='warning'>Not chosen</Badge>}</td>}
                                        <td className='px-4 py-3'><Badge variant={INVITE[s.invite.status][0]}>{INVITE[s.invite.status][1]}</Badge>{s.invite.sentAt && <div className='text-[11.5px] text-text-secondary mt-0.5'>{formatDateTime(s.invite.sentAt)}</div>}</td>
                                        <td className='px-4 py-3'><button onClick={() => copy(s.accessCode, 'Access code')} className='font-mono text-[13px] tracking-wider inline-flex items-center gap-1.5 text-ink hover:text-accent' aria-label={`Copy access code for ${s.name}`}>{s.accessCode}<Copy size={12} /></button></td>
                                        <td className='px-4 py-3'><AttemptStatus status={s.attempt?.status || 'NOT_STARTED'} /></td>
                                        <td className='px-4 py-3 whitespace-nowrap text-right'>
                                            {published && <button aria-label={`Email ${s.name}`} title='Send or resend the invitation' className='p-2 text-text-secondary hover:text-accent' onClick={() => invite.mutate({ studentIds: [s.id], resend: true })}><Mail size={15} /></button>}
                                            {!s.attempt && <button aria-label={`Remove ${s.name}`} className='p-2 text-text-secondary hover:text-[var(--color-danger)]' onClick={() => setRemoving(s)}><Trash2 size={15} /></button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {list.data?.total > 0 && <Pagination page={page} pageSize={pageSize} total={list.data.total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} />}

            {adding && <ImportModal open assessmentId={a.id} onClose={() => setAdding(false)} onDone={refresh} />}
            <ConfirmModal open={Boolean(removing)} onClose={() => setRemoving(null)} danger title='Remove this student?' confirmLabel='Remove' onConfirm={() => remove.mutateAsync(removing.id)}>
                {removing?.name} ({removing?.email}) will no longer be able to sit this test.
            </ConfirmModal>
        </>
    )
}
