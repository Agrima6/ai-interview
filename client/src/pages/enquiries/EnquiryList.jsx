import React, { useEffect, useState } from 'react'
import { Phone } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import DataTable from '../../components/tables/DataTable'
import { Badge, Select, Button } from '../../components/ui'
import { usePermission } from '../../hooks/useAuth.jsx'
import { actionPermissions } from '../../permissions/actionPermissions'
import { listEnquiries, updateEnquiry, callEnquiry } from '../../api/enquiriesApi'

const STATUS_TONE = { NEW: 'brand', CONTACTED: 'warning', IN_PROGRESS: 'warning', PENDING: 'neutral', COMPLETED: 'success' }
const STATUSES = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'PENDING', 'COMPLETED']

function EnquiryList() {
    const hasPermission = usePermission()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [status, setStatus] = useState('')
    const [busyId, setBusyId] = useState(null)

    const load = () => {
        setLoading(true)
        listEnquiries({ status: status || undefined })
            .then(({ items }) => setRows(items))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [status])

    const changeStatus = async (id, newStatus) => {
        setBusyId(id)
        try {
            await updateEnquiry(id, { status: newStatus })
            load()
        } catch (err) {
            setError(err.message)
        } finally {
            setBusyId(null)
        }
    }

    const logCall = async (id) => {
        setBusyId(id)
        try {
            await callEnquiry(id)
            load()
        } catch (err) {
            setError(err.message)
        } finally {
            setBusyId(null)
        }
    }

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type', render: (r) => <Badge>{r.type}</Badge> },
        { key: 'email', label: 'Contact', render: (r) => <div><p>{r.email}</p>{r.phone && <p className='text-text-secondary'>{r.phone}</p>}</div> },
        { key: 'message', label: 'Message', render: (r) => <p className='max-w-[260px] truncate' title={r.message}>{r.message}</p> },
        {
            key: 'status', label: 'Status', render: (r) => (
                hasPermission(actionPermissions.retryCommunication) || hasPermission('ENQUIRY_UPDATE') ? (
                    <Select value={r.status} disabled={busyId === r.id} onChange={(e) => changeStatus(r.id, e.target.value)} className='!py-1.5 !text-[12.5px] w-[150px]'>
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </Select>
                ) : <Badge variant={STATUS_TONE[r.status]}>{r.status.replace(/_/g, ' ')}</Badge>
            ),
        },
        {
            key: 'actions', label: '', render: (r) => (
                hasPermission('ENQUIRY_CALL') && (
                    <Button size='xs' variant='secondary' disabled={busyId === r.id} onClick={() => logCall(r.id)}>
                        <Phone size={12} /> Log call
                    </Button>
                )
            ),
        },
    ]

    return (
        <AdminShell>
            <div className='flex items-center justify-between mb-6'>
                <div>
                    <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Enquiries</h1>
                    <p className='text-text-secondary text-[14px]'>Messages submitted through the public site and registration flow.</p>
                </div>
                <Select value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName='w-[180px]'>
                    <option value=''>All statuses</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </Select>
            </div>

            {error && <p className='text-[13.5px] text-red-500 mb-4'>{error}</p>}

            <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={load} emptyLabel='No enquiries match this filter.' />
        </AdminShell>
    )
}

export default EnquiryList
