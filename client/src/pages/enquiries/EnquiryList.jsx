import React, { useEffect, useState } from 'react'
import { Phone } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import DataTable from '../../components/tables/DataTable'
import { Badge, Select, Button, SearchInput, Modal, Input, Textarea, useToast } from '../../components/ui'
import { usePermission } from '../../hooks/useAuth.jsx'
import { actionPermissions } from '../../permissions/actionPermissions'
import { listEnquiries, updateEnquiry, callEnquiry } from '../../api/enquiriesApi'

const STATUS_TONE = { NEW: 'brand', CONTACTED: 'warning', IN_PROGRESS: 'warning', PENDING: 'neutral', COMPLETED: 'success' }
const STATUSES = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'PENDING', 'COMPLETED']

const blankCallForm = () => ({ status: 'CONTACTED', durationSec: '', notes: '', nextFollowUpAt: '' })

function EnquiryList() {
    const hasPermission = usePermission()
    const canCall = hasPermission('ENQUIRY_CALL')
    const canUpdate = hasPermission(actionPermissions.retryCommunication) || hasPermission('ENQUIRY_UPDATE')
    const toast = useToast()

    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [status, setStatus] = useState('')
    const [search, setSearch] = useState('')
    const [cursor, setCursor] = useState(null)
    const [hasNext, setHasNext] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [busyId, setBusyId] = useState(null)

    const [callTarget, setCallTarget] = useState(null)
    const [callForm, setCallForm] = useState(blankCallForm())
    const [callSubmitting, setCallSubmitting] = useState(false)

    const load = (append = false) => {
        const setter = append ? setLoadingMore : setLoading
        setter(true)
        setError('')
        listEnquiries({ status: status || undefined, search: search || undefined, cursor: append ? cursor : undefined })
            .then(({ items, cursor: nextCursor, hasNext: more }) => {
                setRows((prev) => (append ? [...prev, ...items] : items))
                setCursor(nextCursor)
                setHasNext(more)
            })
            .catch((err) => setError(err.message))
            .finally(() => setter(false))
    }
    useEffect(() => { load(false) }, [status, search])

    const changeStatus = async (id, newStatus) => {
        setBusyId(id)
        try {
            await updateEnquiry(id, { status: newStatus })
            toast.success('Status updated.')
            load(false)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setBusyId(null)
        }
    }

    const openCallModal = (enquiry) => {
        setCallTarget(enquiry)
        setCallForm(blankCallForm())
    }

    const submitCall = async () => {
        if (!callTarget) return
        setCallSubmitting(true)
        try {
            await callEnquiry(callTarget.id, {
                status: callForm.status,
                durationSec: callForm.durationSec ? Number(callForm.durationSec) : undefined,
                notes: callForm.notes || undefined,
                nextFollowUpAt: callForm.nextFollowUpAt || undefined,
            })
            toast.success('Call logged.')
            setCallTarget(null)
            load(false)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setCallSubmitting(false)
        }
    }

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type', render: (r) => <Badge>{r.type}</Badge> },
        { key: 'email', label: 'Contact', render: (r) => <div><p>{r.email}</p>{r.phone && <p className='text-text-secondary'>{r.phone}</p>}</div> },
        { key: 'message', label: 'Message', render: (r) => <p className='max-w-[260px] truncate' title={r.message}>{r.message}</p> },
        {
            key: 'status', label: 'Status', render: (r) => (
                canUpdate ? (
                    <Select value={r.status} disabled={busyId === r.id} onChange={(e) => changeStatus(r.id, e.target.value)} className='!py-1.5 !text-[12.5px] w-[150px]'>
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </Select>
                ) : <Badge variant={STATUS_TONE[r.status]}>{r.status.replace(/_/g, ' ')}</Badge>
            ),
        },
        {
            key: 'actions', label: '', render: (r) => (
                canCall && (
                    <Button size='xs' variant='secondary' disabled={busyId === r.id} onClick={() => openCallModal(r)}>
                        <Phone size={12} /> Log call
                    </Button>
                )
            ),
        },
    ]

    return (
        <AdminShell>
            <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
                <div>
                    <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Enquiries</h1>
                    <p className='text-text-secondary text-[14px]'>Messages submitted through the public site and registration flow.</p>
                </div>
                <div className='flex items-center gap-3 flex-wrap'>
                    <SearchInput value={search} onChange={setSearch} placeholder='Search by name or email' className='w-[240px]' />
                    <Select value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName='w-[180px]'>
                        <option value=''>All statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </Select>
                </div>
            </div>

            {error && <p className='text-[13.5px] text-red-500 mb-4'>{error}</p>}

            <DataTable
                columns={columns}
                rows={rows}
                loading={loading}
                error={error}
                onRetry={() => load(false)}
                emptyLabel='No enquiries match this filter.'
                hasNext={hasNext}
                loadingMore={loadingMore}
                onLoadMore={() => load(true)}
            />

            <Modal
                open={!!callTarget}
                onClose={() => (callSubmitting ? undefined : setCallTarget(null))}
                title={callTarget ? `Log call - ${callTarget.name}` : 'Log call'}
                footer={
                    <>
                        <Button variant='secondary' onClick={() => setCallTarget(null)} disabled={callSubmitting}>Cancel</Button>
                        <Button onClick={submitCall} disabled={callSubmitting}>{callSubmitting ? 'Saving...' : 'Save Call'}</Button>
                    </>
                }
            >
                <div className='space-y-4'>
                    <Select
                        label='Call status'
                        value={callForm.status}
                        onChange={(e) => setCallForm((f) => ({ ...f, status: e.target.value }))}
                    >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </Select>
                    <Input
                        label='Duration (seconds)'
                        type='number'
                        min='0'
                        value={callForm.durationSec}
                        onChange={(e) => setCallForm((f) => ({ ...f, durationSec: e.target.value }))}
                        placeholder='e.g. 180'
                    />
                    <Textarea
                        label='Notes'
                        value={callForm.notes}
                        onChange={(e) => setCallForm((f) => ({ ...f, notes: e.target.value }))}
                        rows={3}
                        placeholder='What was discussed on the call?'
                    />
                    <Input
                        label='Next follow-up'
                        type='date'
                        value={callForm.nextFollowUpAt}
                        onChange={(e) => setCallForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))}
                    />
                </div>
            </Modal>
        </AdminShell>
    )
}

export default EnquiryList
