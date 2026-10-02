import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { ShieldOff, ShieldCheck, Pencil, History, X } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import DataTable from '../../components/tables/DataTable'
import { Badge, Select, SearchInput, Button, ConfirmModal, useToast } from '../../components/ui'
import RegistrationTypeFilter from '../../components/filters/RegistrationTypeFilter'
import DateRangeFilter from '../../components/filters/DateRangeFilter'
import ClientEditModal from './ClientEditModal'
import ClientHistoryModal from './ClientHistoryModal'
import { usePermission } from '../../hooks/useAuth.jsx'
import { actionPermissions } from '../../permissions/actionPermissions'
import { listClients, suspendClient, reactivateClient } from '../../api/clientsApi'

// Client.type in the data model is only ORGANIZATION/COLLEGE - candidates
// are never onboarded into the Client collection (see
// onboarding.service.js#approve), so there's no real "Candidate" filter
// option to offer here despite candidates being one of the three
// registration types elsewhere in the product.
const TYPE_OPTIONS = [{ key: 'ORGANIZATION', label: 'Organization' }, { key: 'COLLEGE', label: 'College' }]
const STATUS_TONE = { ACTIVE: 'success', SUSPENDED: 'warning', REJECTED: 'danger', PENDING: 'neutral' }
const DEFAULT_PAGE_SIZE = 25

function useClientFilters() {
    const [params, setParams] = useSearchParams()
    const filters = {
        search: params.get('search') || '',
        type: params.get('type') || '',
        status: params.get('status') || '',
        preset: params.get('preset') || '',
        dateFrom: params.get('dateFrom') || null,
        dateTo: params.get('dateTo') || null,
        sortBy: params.get('sortBy') || 'createdAt',
        sortOrder: params.get('sortOrder') || 'desc',
        page: Number(params.get('page')) || 1,
        pageSize: Number(params.get('pageSize')) || DEFAULT_PAGE_SIZE,
    }

    // Any filter/sort/search change resets to page 1 - only an explicit
    // page-number change is allowed to move off it.
    const update = (patch, { resetPage = true } = {}) => {
        const next = { ...filters, ...patch, ...(resetPage && !('page' in patch) ? { page: 1 } : {}) }
        const nextParams = new URLSearchParams()
        Object.entries(next).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined) return
            if (key === 'page' && value === 1) return
            if (key === 'pageSize' && value === DEFAULT_PAGE_SIZE) return
            if (key === 'sortBy' && value === 'createdAt') return
            if (key === 'sortOrder' && value === 'desc') return
            nextParams.set(key, String(value))
        })
        setParams(nextParams, { replace: true })
    }

    return { filters, update }
}

function ClientList() {
    const hasPermission = usePermission()
    const canUpdateStatus = hasPermission(actionPermissions.updateClientStatus)
    const canEdit = hasPermission(actionPermissions.editClient)
    const toast = useToast()
    const queryClient = useQueryClient()

    const { filters, update } = useClientFilters()
    const [confirmTarget, setConfirmTarget] = useState(null) // { client, action: 'suspend' | 'reactivate' }
    const [editTarget, setEditTarget] = useState(null)
    const [historyTarget, setHistoryTarget] = useState(null)
    const [busyId, setBusyId] = useState(null)

    const queryKey = ['clients', filters]
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: () => listClients({
            search: filters.search || undefined,
            type: filters.type || undefined,
            approvalStatus: filters.status || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            page: filters.page,
            limit: filters.pageSize,
        }),
        placeholderData: keepPreviousData,
    })

    const rows = data?.items || []
    const hasActiveFilters = Boolean(filters.search || filters.type || filters.status || filters.dateFrom || filters.dateTo)

    const clearFilters = () => update({
        search: '', type: '', status: '', preset: '', dateFrom: null, dateTo: null,
        sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: DEFAULT_PAGE_SIZE,
    }, { resetPage: false })

    const runStatusChange = async () => {
        if (!confirmTarget) return
        const { client, action } = confirmTarget
        setBusyId(client.id)
        try {
            if (action === 'suspend') await suspendClient(client.id)
            else await reactivateClient(client.id)
            toast.success(action === 'suspend' ? `${client.name} has been blocked.` : `${client.name} has been unblocked.`)
            setConfirmTarget(null)
            queryClient.invalidateQueries({ queryKey: ['clients'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        } catch (err) {
            toast.error(err.message)
        } finally {
            setBusyId(null)
        }
    }

    const columns = [
        { key: 'name', label: 'Client', sortable: true },
        { key: 'type', label: 'Registration Type', render: (r) => <Badge>{r.type}</Badge> },
        { key: 'createdAt', label: 'Registration Date', sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
        { key: 'status', label: 'Registration Status', sortable: true, render: (r) => <Badge variant={STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge> },
        { key: 'email', label: 'Primary Contact', render: (r) => r.primaryContact?.email || '—' },
        { key: 'updatedAt', label: 'Last Updated', sortable: true, render: (r) => new Date(r.updatedAt).toLocaleDateString() },
        {
            key: 'actions', label: '', render: (r) => (
                <div className='flex items-center gap-1.5' onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                        <Button size='xs' variant='secondary' onClick={() => setEditTarget(r)} aria-label={`Edit ${r.name}`}>
                            <Pencil size={12} />
                        </Button>
                    )}
                    <Button size='xs' variant='secondary' onClick={() => setHistoryTarget(r)} aria-label={`View history for ${r.name}`}>
                        <History size={12} />
                    </Button>
                    {canUpdateStatus && ['ACTIVE', 'SUSPENDED'].includes(r.status) && (
                        <Button
                            size='xs'
                            variant={r.status === 'ACTIVE' ? 'danger' : 'secondary'}
                            disabled={busyId === r.id}
                            onClick={() => setConfirmTarget({ client: r, action: r.status === 'ACTIVE' ? 'suspend' : 'reactivate' })}
                        >
                            {r.status === 'ACTIVE' ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                            {r.status === 'ACTIVE' ? 'Block' : 'Unblock'}
                        </Button>
                    )}
                </div>
            ),
        },
    ]

    return (
        <AdminShell>
            <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
                <div>
                    <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Clients</h1>
                    <p className='text-text-secondary text-[14px]'>Organizations and colleges approved through onboarding.</p>
                </div>
            </div>

            <div className='flex items-center gap-3 flex-wrap mb-6'>
                <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder='Search by name, email or phone' className='w-[240px]' />
                <RegistrationTypeFilter
                    value={filters.type}
                    onChange={(type) => update({ type })}
                    options={TYPE_OPTIONS}
                    allLabel='All types'
                    wrapperClassName='w-[170px]'
                />
                <Select value={filters.status} onChange={(e) => update({ status: e.target.value })} wrapperClassName='w-[170px]'>
                    <option value=''>All statuses</option>
                    <option value='ACTIVE'>Active</option>
                    <option value='SUSPENDED'>Blocked</option>
                    <option value='PENDING'>Pending</option>
                    <option value='REJECTED'>Rejected</option>
                </Select>
                <DateRangeFilter
                    value={{ preset: filters.preset, from: filters.dateFrom, to: filters.dateTo }}
                    onChange={({ preset, from, to }) => update({ preset, dateFrom: from, dateTo: to })}
                />
                {hasActiveFilters && (
                    <Button variant='ghost' size='sm' onClick={clearFilters}>
                        <X size={13} /> Clear Filters
                    </Button>
                )}
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                loading={isLoading}
                error={isError ? error.message : ''}
                onRetry={refetch}
                emptyLabel='No clients match your filters.'
                sort={{ sortBy: filters.sortBy, sortOrder: filters.sortOrder, onChange: (key) => update({ sortBy: key, sortOrder: filters.sortBy === key && filters.sortOrder === 'desc' ? 'asc' : 'desc' }) }}
                pagination={{
                    page: filters.page,
                    pageSize: filters.pageSize,
                    total: data?.total || 0,
                    onPageChange: (page) => update({ page }, { resetPage: false }),
                    onPageSizeChange: (pageSize) => update({ pageSize, page: 1 }, { resetPage: false }),
                }}
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

            {editTarget && <ClientEditModal client={editTarget} onClose={() => setEditTarget(null)} />}
            {historyTarget && <ClientHistoryModal client={historyTarget} onClose={() => setHistoryTarget(null)} />}
        </AdminShell>
    )
}

export default ClientList
