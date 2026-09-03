import React from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Input, Button, useToast } from '../../components/ui'
import { updateClient } from '../../api/clientsApi'

/**
 * Only operationally-safe fields are editable here - name and primary
 * contact details. Registration type, status, subdomain and every
 * system-managed field (id/createdAt/updatedAt) are intentionally absent:
 * type changes are a separate business operation (see client.service.js on
 * the server), and status already has its own approve/reject/suspend flow
 * with its own audit trail.
 */
function ClientEditModal({ client, onClose }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
        defaultValues: {
            name: client?.name || '',
            contactName: client?.primaryContact?.name || '',
            contactEmail: client?.primaryContact?.email || '',
            contactPhone: client?.primaryContact?.phone || '',
        },
    })

    const mutation = useMutation({
        mutationFn: (values) => updateClient(client.id, {
            name: values.name,
            primaryContact: { name: values.contactName, email: values.contactEmail, phone: values.contactPhone },
        }, client.updatedAt),
        onSuccess: () => {
            toast.success('Client details updated.')
            queryClient.invalidateQueries({ queryKey: ['clients'] })
            queryClient.invalidateQueries({ queryKey: ['client', client.id] })
            queryClient.invalidateQueries({ queryKey: ['client-audit', client.id] })
            // Active clients / KPI cards on the dashboard can be affected by
            // client edits in principle (e.g. a corrected type would be),
            // so this stays consistent going forward even though today's
            // editable fields (name/contact) don't move any KPI.
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            onClose()
        },
        onError: (err) => {
            if (err.code === 'CLIENT_UPDATE_CONFLICT') {
                toast.error('This client was updated by another user. Please reload the latest data before saving.')
                queryClient.invalidateQueries({ queryKey: ['clients'] })
            } else {
                toast.error(err.message)
            }
        },
    })

    if (!client) return null

    return (
        <Modal open={!!client} onClose={mutation.isPending ? undefined : onClose} title={`Edit ${client.name}`} size='md'
            footer={
                <>
                    <Button variant='secondary' size='sm' onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
                    <Button size='sm' onClick={handleSubmit((v) => mutation.mutate(v))} disabled={mutation.isPending || !isDirty}>
                        {mutation.isPending ? 'Saving...' : 'Save changes'}
                    </Button>
                </>
            }
        >
            <form className='space-y-4' onSubmit={handleSubmit((v) => mutation.mutate(v))}>
                <Input
                    label='Name'
                    error={errors.name?.message}
                    {...register('name', { required: 'Name is required' })}
                />
                <Input
                    label='Primary contact name'
                    error={errors.contactName?.message}
                    {...register('contactName', { required: 'Contact name is required' })}
                />
                <Input
                    label='Primary contact email'
                    type='email'
                    error={errors.contactEmail?.message}
                    {...register('contactEmail', {
                        required: 'Contact email is required',
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                    })}
                />
                <Input
                    label='Primary contact phone'
                    error={errors.contactPhone?.message}
                    {...register('contactPhone', { required: 'Contact phone is required' })}
                />
            </form>
        </Modal>
    )
}

export default ClientEditModal
