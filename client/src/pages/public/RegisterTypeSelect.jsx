import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, GraduationCap, User, Home, Sparkles, ChevronRight } from 'lucide-react'
import { Card } from '../../components/ui'
import { getRegistrationTypes } from '../../api/registrationsApi'
import AmbientBackground from '../workmate/AmbientBackground'
import logo from '../../assets/logo.png'

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
        <div className='min-h-screen bg-bg relative overflow-hidden flex items-center justify-center px-6 py-16'>
            <AmbientBackground />

            {/* Large faint logo watermark, decorative only */}
            <img
                src={logo}
                alt=''
                aria-hidden='true'
                className='pointer-events-none select-none absolute -right-24 -bottom-24 w-[520px] h-[520px] opacity-[0.05] rotate-[-8deg]'
            />

            <button
                onClick={() => navigate('/')}
                className='absolute top-6 left-6 flex items-center gap-1.5 text-[13.5px] font-medium text-text-secondary hover:text-ink transition-colors'
            >
                <Home size={16} /> Home
            </button>

            <div className='w-full max-w-[760px] relative'>
                <div className='flex flex-col items-center mb-6'>
                    <div className='relative mb-4'>
                        <div className='absolute inset-0 bg-accent/20 blur-xl rounded-full' />
                        <img src={logo} alt='' className='relative w-14 h-14 rounded-full shadow-[var(--shadow-soft)] border-2 border-card' />
                    </div>
                    <span className='font-display text-[15px] font-bold text-ink tracking-tight'>WorkmateIQ</span>
                </div>

                <div className='flex justify-center mb-4'>
                    <div className='inline-flex items-center gap-2 bg-accent/10 text-accent rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold'>
                        <Sparkles size={14} /> Get started in under 2 minutes
                    </div>
                </div>

                <h1 className='font-display text-[30px] sm:text-[34px] font-bold text-ink text-center mb-2'>Join WorkmateIQ</h1>
                <p className='text-text-secondary text-center mb-10'>Tell us who you are, and we'll set you up.</p>

                {error && (
                    <div className='mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center max-w-md mx-auto'>
                        <p className='text-[13.5px] text-red-500 font-medium'>{error}</p>
                    </div>
                )}

                <div className='grid sm:grid-cols-3 gap-5'>
                    {(types || [1, 2, 3]).map((t, i) => {
                        if (!types) return <Card key={i} className='p-6 h-[200px] animate-pulse' />
                        const Icon = ICONS[t.key] || User
                        return (
                            <Card
                                key={t.key}
                                hover
                                className='group p-6 cursor-pointer backdrop-blur-sm bg-card/90 border-line/80 hover:border-accent/40 relative overflow-hidden'
                                onClick={() => navigate(`/platform/register/${t.key.toLowerCase()}`)}
                            >
                                <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/0 via-accent to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity' />
                                <div className='w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-white transition-colors'>
                                    <Icon size={22} />
                                </div>
                                <h3 className='font-display text-[16px] font-bold text-ink mb-1.5'>{t.label}</h3>
                                <p className='text-text-secondary text-[13.5px] leading-relaxed mb-4'>{COPY[t.key]}</p>
                                <div className='flex items-center gap-1 text-accent text-[12.5px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity'>
                                    Continue <ChevronRight size={14} />
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default RegisterTypeSelect
