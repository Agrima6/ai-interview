import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Card, Button } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth.jsx'
import logo from '../../assets/logo.png'

function ClientDashboard() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()

    useEffect(() => {
        if (user?.mustChangePassword) navigate('/platform/client/change-password', { replace: true })
    }, [user, navigate])

    const handleLogout = async () => {
        await logout()
        navigate('/platform/client/login')
    }

    return (
        <div className='min-h-screen bg-bg'>
            <div className='max-w-[900px] mx-auto px-6 py-10'>
                <div className='flex items-center justify-between mb-10'>
                    <div className='flex items-center gap-2.5'>
                        <img src={logo} alt='' className='w-9 h-9 rounded-full' />
                        <span className='font-display text-[16px] font-bold text-ink'>WorkmateIQ</span>
                    </div>
                    <Button variant='ghost' size='sm' onClick={handleLogout}>Sign out</Button>
                </div>

                <Card className='p-8 text-center'>
                    <CheckCircle2 size={40} className='text-green-600 mx-auto mb-4' />
                    <h1 className='font-display text-[24px] font-bold text-ink mb-2'>Welcome, {user?.name || 'there'}</h1>
                    <p className='text-text-secondary text-[14px]'>
                        Your organization is approved and active on WorkmateIQ. Signed in as {user?.email}.
                    </p>
                </Card>
            </div>
        </div>
    )
}

export default ClientDashboard
