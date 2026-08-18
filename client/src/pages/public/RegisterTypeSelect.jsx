import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, GraduationCap, User, ArrowRight } from 'lucide-react'
import { Card } from '../../components/ui'
import { getRegistrationTypes } from '../../api/registrationsApi'
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
    const [hoveredType, setHoveredType] = useState(null)

    useEffect(() => {
        getRegistrationTypes().then((res) => setTypes(res.types)).catch((err) => setError(err.message))
    }, [])

    return (
        <div className='min-h-screen bg-gradient-to-br from-bg via-bg to-bg flex items-center justify-center px-6 py-16'>
            <div className='w-full max-w-[900px]'>
                <div className='text-center mb-12'>
                    <div className='flex items-center justify-center gap-2 mb-6'>
                        <img src={logo} alt='WorkmateIQ' className='w-10 h-10 rounded-lg' />
                        <span className='font-display text-[20px] font-bold text-ink'>WorkmateIQ</span>
                    </div>
                    <h1 className='font-display text-[42px] font-bold text-ink mb-3'>Welcome to WorkmateIQ</h1>
                    <p className='text-text-secondary text-[16px] leading-relaxed max-w-[600px] mx-auto'>
                        Choose your role to get started. Each path is tailored to help you succeed.
                    </p>
                </div>

                {error && (
                    <div className='bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-8 text-center'>
                        <p className='text-red-700 text-[14px] font-medium'>{error}</p>
                    </div>
                )}

                <div className='grid sm:grid-cols-3 gap-6'>
                    {(types || [1, 2, 3]).map((t, i) => {
                        if (!types) {
                            return (
                                <div key={i} className='bg-card border border-line rounded-2xl p-8 h-[240px] animate-pulse' />
                            )
                        }
                        const Icon = ICONS[t.key] || User
                        const isHovered = hoveredType === t.key
                        return (
                            <button
                                key={t.key}
                                onClick={() => navigate(`/platform/register/${t.key.toLowerCase()}`)}
                                onMouseEnter={() => setHoveredType(t.key)}
                                onMouseLeave={() => setHoveredType(null)}
                                className='group relative'
                            >
                                <Card
                                    className={`p-8 h-full transition-all duration-300 flex flex-col ${
                                        isHovered
                                            ? 'shadow-[var(--shadow-lift)] border-accent/30 bg-accent/[0.02]'
                                            : 'shadow-[var(--shadow-soft)] border-line hover:border-accent/20'
                                    }`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center transition-all duration-300 ${
                                        isHovered
                                            ? 'bg-gradient-brand text-white'
                                            : 'bg-accent/10 text-accent'
                                    }`}>
                                        <Icon size={24} />
                                    </div>
                                    
                                    <div className='flex-grow text-left'>
                                        <h3 className='font-display text-[18px] font-bold text-ink mb-2'>{t.label}</h3>
                                        <p className='text-text-secondary text-[14px] leading-relaxed'>{COPY[t.key]}</p>
                                    </div>

                                    <div className={`mt-6 flex items-center gap-2 transition-all duration-300 ${
                                        isHovered ? 'translate-x-1 text-accent' : 'text-text-secondary'
                                    }`}>
                                        <span className='text-[13.5px] font-medium'>Get started</span>
                                        <ArrowRight size={16} />
                                    </div>
                                </Card>
                            </button>
                        )
                    })}
                </div>

                <div className='mt-12 text-center text-[13px] text-text-secondary'>
                    <p>Already have an account? <a href='/platform/login' className='text-accent hover:underline font-medium'>Sign in</a></p>
                </div>
            </div>
        </div>
    )
}

export default RegisterTypeSelect
