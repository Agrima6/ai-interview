import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Button, Card } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as authApi from '../../api/authApi'

// Forced first-login step for client accounts, which are created with a
// system-generated temporary password (see the approval email).
function ChangePassword() {
    const navigate = useNavigate()
    const { user, refresh } = useAuth()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        if (newPassword !== confirmPassword) {
            setError("New passwords don't match.")
            return
        }
        setLoading(true)
        try {
            await authApi.changePassword(currentPassword, newPassword)
            await refresh()
            navigate('/platform/client/dashboard')
        } catch (err) {
            setError(err.message || 'Could not change password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='min-h-screen bg-bg flex items-center justify-center px-6 py-16'>
            <Card className='w-full max-w-[420px] p-8 sm:p-10'>
                <h1 className='font-display text-[24px] font-bold text-ink mb-2'>Set a new password</h1>
                <p className='text-text-secondary text-[14px] mb-8'>
                    {user?.email ? `Signed in as ${user.email}. ` : ''}
                    You're using a temporary password - set your own before continuing.
                </p>

                <form onSubmit={submit} className='space-y-4'>
                    <Input label='Temporary password' type='password' value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                    <Input label='New password' type='password' value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
                    <Input label='Confirm new password' type='password' value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
                    {error && <p className='text-[13px] text-red-500'>{error}</p>}
                    <Button type='submit' size='lg' disabled={loading} className='w-full'>{loading ? 'Saving...' : 'Set password & continue'}</Button>
                </form>
            </Card>
        </div>
    )
}

export default ChangePassword
