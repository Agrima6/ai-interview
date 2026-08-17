import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, GraduationCap, User } from 'lucide-react'
import { Card } from '../../components/ui'
import { getRegistrationTypes } from '../../api/registrationsApi'

const ICONS = { ORGANIZATION: Building2, COLLEGE: GraduationCap, CANDIDATE: User }
const COPY = {
    ORGANIZATION: 'Hire smarter and build stronger teams.',
    COLLEGE: 'Connect your students with real opportunities.',
    CANDIDATE: 'Present your potential and get discovered.',
}

// Registration types come from the backend rather than being hard-coded, so
// an admin can enable/disable a type without a frontend deploy.
function RegisterTypeSelect() {
    const navigate = useNavigate()
    const [types, setTypes] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        getRegistrationTypes().then((res) => setTypes(res.types)).catch((err) => setError(err.message))
    }, [])

    return (
        <div className='min-h-screen bg-bg flex items-center justify-center px-6 py-16'>
            <div className='w-full max-w-[720px]'>
                <h1 className='font-display text-[30px] font-bold text-ink text-center mb-2'>Join WorkmateIQ</h1>
                <p className='text-text-secondary text-center mb-10'>Tell us who you are, and we'll set you up.</p>

                {error && <p className='text-center text-red-500 text-[14px] mb-6'>{error}</p>}

                <div className='grid sm:grid-cols-3 gap-5'>
                    {(types || [1, 2, 3]).map((t, i) => {
                        if (!types) return <Card key={i} className='p-6 h-[180px] animate-pulse' />
                        const Icon = ICONS[t.key] || User
                        return (
                            <Card
                                key={t.key}
                                hover
                                className='p-6 cursor-pointer'
                                onClick={() => navigate(`/platform/register/${t.key.toLowerCase()}`)}
                            >
                                <div className='w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4'>
                                    <Icon size={20} />
                                </div>
                                <h3 className='font-display text-[16px] font-bold text-ink mb-1.5'>{t.label}</h3>
                                <p className='text-text-secondary text-[13.5px] leading-relaxed'>{COPY[t.key]}</p>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default RegisterTypeSelect
