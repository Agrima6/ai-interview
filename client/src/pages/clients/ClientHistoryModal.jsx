import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { Modal, SkeletonText, EmptyState } from '../../components/ui'
import { getClientAuditHistory } from '../../api/clientsApi'

const FIELD_LABELS = {
    name: 'Name',
    'primaryContact.name': 'Contact name',
    'primaryContact.email': 'Contact email',
    'primaryContact.phone': 'Contact phone',
    'branding.primaryColor': 'Primary color',
    'branding.secondaryColor': 'Secondary color',
}

function ClientHistoryModal({ client, onClose }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['client-audit', client?.id],
        queryFn: () => getClientAuditHistory(client.id),
        enabled: !!client,
    })

    if (!client) return null

    return (
        <Modal open={!!client} onClose={onClose} title={`${client.name} — History`} size='md'>
            {isLoading ? (
                <SkeletonText lines={4} />
            ) : error ? (
                <p className='text-[13.5px] text-red-500'>{error.message}</p>
            ) : !data?.length ? (
                <EmptyState title='No updates recorded yet.' />
            ) : (
                <div className='space-y-4'>
                    {data.map((entry) => (
                        <div key={entry.id} className='flex gap-3'>
                            <History size={16} className='text-text-secondary mt-0.5 shrink-0' />
                            <div>
                                <p className='text-[13.5px] text-ink'>
                                    Admin updated client details
                                </p>
                                <p className='text-[12px] text-text-secondary mt-0.5'>
                                    {new Date(entry.createdAt).toLocaleString()}
                                </p>
                                <p className='text-[12.5px] text-text-secondary mt-1'>
                                    Changed: {entry.changedFields.map((f) => FIELD_LABELS[f] || f).join(', ')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    )
}

export default ClientHistoryModal
