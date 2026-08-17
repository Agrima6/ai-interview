import React, { useEffect, useState } from 'react'
import AdminShell from '../../components/layout/AdminShell'
import DataTable from '../../components/tables/DataTable'
import { Badge } from '../../components/ui'
import { listClients } from '../../api/clientsApi'

function ClientList() {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = () => {
        setLoading(true)
        listClients({}).then(({ items }) => setRows(items)).catch((err) => setError(err.message)).finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type', render: (r) => <Badge>{r.type}</Badge> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'}>{r.status}</Badge> },
        { key: 'email', label: 'Contact', render: (r) => r.primaryContact?.email },
        { key: 'createdAt', label: 'Onboarded', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    ]

    return (
        <AdminShell>
            <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Clients</h1>
            <p className='text-text-secondary text-[14px] mb-8'>Organizations and colleges approved through onboarding.</p>
            <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={load} emptyLabel='No clients yet - approve an onboarding to create one.' />
        </AdminShell>
    )
}

export default ClientList
