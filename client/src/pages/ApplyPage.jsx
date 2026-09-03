import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Building2, Briefcase, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, Skeleton } from '../components/ui'
import logo from '../assets/logo.png'
import { getPublicDrive } from '../api/organization/organizationApi'

/**
 * Public, unauthenticated candidate landing page for a drive's invite link
 * (GET /api/v1/drives/public/:link - no auth, no candidate roster exposed).
 * There is no Interview Service yet (backend.md #15, not built), so this
 * intentionally stops at "here's the role you were invited to" rather than
 * a fake "Start Interview" button that would go nowhere real.
 */
function ApplyPage() {
    const { link } = useParams()
    const [drive, setDrive] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        getPublicDrive(link)
            .then(setDrive)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [link])

    return (
        <div className='min-h-screen bg-bg flex items-center justify-center px-6 py-12'>
            <div className='w-full max-w-lg'>
                <div className='flex items-center justify-center gap-2.5 mb-8'>
                    <img src={logo} alt='' className='w-9 h-9 rounded-full' />
                    <span className='font-display text-[17px] font-bold text-ink'>WorkmateIQ</span>
                </div>

                {loading ? (
                    <Card className='p-8'><Skeleton className='h-48' /></Card>
                ) : error || !drive ? (
                    <Card className='p-8 text-center'>
                        <AlertCircle size={28} className='text-red-500 mx-auto mb-4' />
                        <h1 className='text-[18px] font-bold text-ink mb-2'>This link isn't valid</h1>
                        <p className='text-[14px] text-text-secondary'>{error || 'This interview invitation may have expired or been closed by the organization.'}</p>
                    </Card>
                ) : drive.expired ? (
                    <Card className='p-8 text-center'>
                        <Clock size={28} className='text-amber-500 mx-auto mb-4' />
                        <h1 className='text-[18px] font-bold text-ink mb-2'>This invitation has expired</h1>
                        <p className='text-[14px] text-text-secondary'>The application window for <strong>{drive.title}</strong> closed on {new Date(drive.expiryDate).toLocaleDateString()}. Please contact {drive.companyName || 'the organization'} if you believe this is a mistake.</p>
                    </Card>
                ) : (
                    <Card className='p-8'>
                        <div className='w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-5'>
                            <Briefcase size={22} />
                        </div>
                        <h1 className='text-[20px] font-bold text-ink mb-1'>You're invited to interview</h1>
                        <p className='text-[15px] font-semibold text-accent mb-5'>{drive.title}</p>

                        <div className='space-y-2.5 mb-6 text-[13.5px]'>
                            <div className='flex items-center gap-2 text-text-secondary'>
                                <Building2 size={15} className='shrink-0' /> {drive.companyName || 'Hiring organization'}
                            </div>
                            <div className='flex items-center gap-2 text-text-secondary'>
                                <Briefcase size={15} className='shrink-0' /> {drive.department} • {drive.roleCategory?.replace(/_/g, ' ')}
                            </div>
                            <div className='flex items-center gap-2 text-text-secondary'>
                                <Clock size={15} className='shrink-0' /> Apply before {new Date(drive.expiryDate).toLocaleDateString()}
                            </div>
                        </div>

                        <div className='p-4 rounded-xl border border-line bg-black/[0.02] dark:bg-white/[0.04] flex items-start gap-2.5'>
                            <CheckCircle2 size={16} className='text-accent shrink-0 mt-0.5' />
                            <p className='text-[13px] text-text-secondary leading-relaxed'>
                                The AI video interview experience is being finalized. {drive.companyName || 'The organization'} has your details and will follow up directly with next steps.
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}

export default ApplyPage
