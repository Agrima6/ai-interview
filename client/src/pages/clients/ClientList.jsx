import React, { useEffect, useState } from 'react'
import { ShieldOff, ShieldCheck } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import DataTable from '../../components/tables/DataTable'
import { Badge, Select, SearchInput, Button, ConfirmModal, useToast } from '../../components/ui'
import { usePermission } from '../../hooks/useAuth.jsx'
import { actionPermissions } from '../../permissions/actionPermissions'
import { listClients, suspendClient, reactivateClient } from '../../api/clientsApi'

// Client.type in the data model is only ORGANIZATION/COLLEGE - candidates
// are never onboarded into the Client collection (see
// onboarding.service.js#approve), so there's no real "Candidate" filter
// option to offer here despite candidates being one of the three
// registration types elsewhere in the product.
const TYPES = ['ORGANIZATION', 'COLLEGE']
const STATUS_TONE = { ACTIVE: 'success', SUSPENDED: 'warning', REJECTED: 'danger', PENDING: 'neutral' }

function ClientList() {
    const hasPermission = usePermission()
    const canUpdateStatus = hasPermission(actionPermissions.updateClientStatus)
    const toast = useToast()

    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [type, setType] = useState('')
    const [status, setStatus] = useState('')
    const [cursor, setCursor] = useState(null)
    const [hasNext, setHasNext] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [busyId, setBusyId] = useState(null)
    const [confirmTarget, setConfirmTarget] = useState(null) // { client, action: 'suspend' | 'reactivate' }

    const load = (append = false) => {
        const setter = append ? setLoadingMore : setLoading
        setter(true)
        setError('')
        listClients({
            search: search || undefined,
            type: type || undefined,
            approvalStatus: status || undefined,
            cursor: append ? cursor : undefined,
        })
            .then(({ items, cursor: nextCursor, hasNext: more }) => {
                setRows((prev) => (append ? [...prev, ...items] : items))
                setCursor(nextCursor)
                setHasNext(more)
            })
            .catch((err) => setError(err.message))
            .finally(() => setter(false))
    }

    useEffect(() => { load(false) }, [search, type, status])

    const runStatusChange = async () => {
        if (!confirmTarget) return
        const { client, action } = confirmTarget
        setBusyId(client.id)
        try {
            if (action === 'suspend') await suspendClient(client.id)
            else await reactivateClient(client.id)
            toast.success(action === 'suspend' ? `${client.name} has been blocked.` : `${client.name} has been unblocked.`)
            setConfirmTarget(null)
            load(false)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setBusyId(null)
        }
    }

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type', render: (r) => <Badge>{r.type}</Badge> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge> },
        { key: 'email', label: 'Primary Contact', render: (r) => r.primaryContact?.email || '—' },
        { key: 'createdAt', label: 'Onboarded', render: (r) => new Date(r.createdAt).toLocaleDateString() },
        {
            key: 'actions', label: '', render: (r) => {
                if (!canUpdateStatus || !['ACTIVE', 'SUSPENDED'].includes(r.status)) return null
                const isActive = r.status === 'ACTIVE'
                return (
                    <Button
                        size='xs'
                        variant={isActive ? 'danger' : 'secondary'}
                        disabled={busyId === r.id}
                        onClick={(e) => { e.stopPropagation(); setConfirmTarget({ client: r, action: isActive ? 'suspend' : 'reactivate' }) }}
                    >
                        {isActive ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                        {isActive ? 'Block' : 'Unblock'}
                    </Button>
                )
            },
        },
    ]

    return (
        <AdminShell>
            <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
                <div>
                    <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Clients</h1>
                    <p className='text-text-secondary text-[14px]'>Organizations and colleges approved through onboarding.</p>
                </div>
                <div className='flex items-center gap-3 flex-wrap'>
                    <SearchInput value={search} onChange={setSearch} placeholder='Search by name' className='w-[220px]' />
                    <Select value={type} onChange={(e) => setType(e.target.value)} wrapperClassName='w-[170px]'>
                        <option value=''>All types</option>
                        {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0)}{t.slice(1).toLowerCase()}</option>)}
                    </Select>
                    <Select value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName='w-[170px]'>
                        <option value=''>All statuses</option>
                        <option value='ACTIVE'>Active</option>
                        <option value='SUSPENDED'>Blocked</option>
                        <option value='PENDING'>Pending</option>
                        <option value='REJECTED'>Rejected</option>
                    </Select>
                </div>
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                loading={loading}
                error={error}
                onRetry={() => load(false)}
                emptyLabel='No clients match your filters.'
                hasNext={hasNext}
                loadingMore={loadingMore}
                onLoadMore={() => load(true)}
            />

            <ConfirmModal
                open={!!confirmTarget}
                onClose={() => setConfirmTarget(null)}
                title={confirmTarget?.action === 'suspend' ? `Block ${confirmTarget.client.name}?` : `Unblock ${confirmTarget?.client.name}?`}
                confirmLabel={confirmTarget?.action === 'suspend' ? 'Block client' : 'Unblock'}
                danger={confirmTarget?.action === 'suspend'}
                onConfirm={runStatusChange}
            >
                {confirmTarget?.action === 'suspend'
                    ? 'Blocking this client will prevent access to the current application.'
                    : 'The client will regain access to the application.'}
            </ConfirmModal>
        </AdminShell>
    )
}

export default ClientList
