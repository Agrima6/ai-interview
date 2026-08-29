import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminShell from '../../components/layout/AdminShell'
import DataTable from '../../components/tables/DataTable'
import { Badge, Select, SearchInput } from '../../components/ui'
import { listOnboardings } from '../../api/onboardingApi'

const STATUS_TONE = {
    SUBMITTED: 'warning', RESUBMITTED: 'warning', UNDER_REVIEW: 'brand',
    CHANGES_REQUESTED: 'warning', APPROVED: 'success', REJECTED: 'danger',
    IN_PROGRESS: 'neutral', NOT_STARTED: 'neutral',
}

function OnboardingReviewList() {
    const navigate = useNavigate()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [status, setStatus] = useState('SUBMITTED')
    const [search, setSearch] = useState('')
    const [cursor, setCursor] = useState(null)
    const [hasNext, setHasNext] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)

    const load = (append = false) => {
        const setter = append ? setLoadingMore : setLoading
        setter(true)
        setError('')
        listOnboardings({ status: status || undefined, search: search || undefined, cursor: append ? cursor : undefined })
            .then(({ items, cursor: nextCursor, hasNext: more }) => {
                setRows((prev) => (append ? [...prev, ...items] : items))
                setCursor(nextCursor)
                setHasNext(more)
            })
            .catch((err) => setError(err.message))
            .finally(() => setter(false))
    }

    useEffect(() => { load(false) }, [status, search])

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type', render: (r) => <Badge>{r.type}</Badge> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={STATUS_TONE[r.status] || 'neutral'}>{r.status.replace(/_/g, ' ')}</Badge> },
        { key: 'contact', label: 'Contact', render: (r) => r.contact?.email || '—' },
        { key: 'submittedAt', label: 'Submitted', render: (r) => r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—' },
    ]

    return (
        <AdminShell>
            <div className='flex items-center justify-between mb-6'>
                <div>
                    <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Onboarding Review</h1>
                    <p className='text-text-secondary text-[14px]'>Review submitted onboarding applications.</p>
                </div>
                <div className='flex items-center gap-3'>
                    <SearchInput value={search} onChange={setSearch} placeholder='Search by name or email' className='w-[240px]' />
                    <Select value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName='w-[200px]'>
                        <option value=''>All statuses</option>
                        <option value='SUBMITTED'>Submitted</option>
                        <option value='RESUBMITTED'>Resubmitted</option>
                        <option value='CHANGES_REQUESTED'>Changes requested</option>
                        <option value='APPROVED'>Approved</option>
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
                onRowClick={(row) => navigate(`/platform/admin/onboarding/${row.id}`)}
                emptyLabel='No onboarding applications match this filter.'
                hasNext={hasNext}
                loadingMore={loadingMore}
                onLoadMore={() => load(true)}
            />
        </AdminShell>
    )
}

export default OnboardingReviewList
