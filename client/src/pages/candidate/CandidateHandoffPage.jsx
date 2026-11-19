import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import Button from '../../components/Button'

// Where a candidate lands when the online test hands them on to the AI interview. The one-time ticket arrives in the
// URL fragment (never sent to a server or kept in a log) and is cleared from the address bar straight away.
const parse = () => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const to = params.get('to') || ''
    return { ticket: params.get('ticket') || '', to: /^\/candidate\/interview\/[A-Za-z0-9]+\/\d+$/.test(to) ? to : '' }
}

export default function CandidateHandoffPage() {
    const navigate = useNavigate()
    const { loginWithTicket } = useAuth()
    const [failed, setFailed] = useState(() => { const { ticket, to } = parse(); return !ticket || !to })
    const started = useRef(false)

    useEffect(() => {
        if (started.current) return
        started.current = true
        const { ticket, to } = parse()
        window.history.replaceState(null, '', window.location.pathname)
        if (!ticket || !to) return
        loginWithTicket(ticket).then(() => navigate(to, { replace: true })).catch(() => setFailed(true))
    }, [loginWithTicket, navigate])

    return (
        <div className='min-h-screen bg-bg flex items-center justify-center p-5 text-center' role='status'>
            {failed ? (
                <div className='max-w-sm'>
                    <h1 className='font-display text-[22px] font-bold text-ink mb-2'>We could not open your interview</h1>
                    <p className='text-[14px] text-text-secondary mb-5'>The link was used or has expired. Check your email for the interview invitation, or sign in to find it.</p>
                    <Button onClick={() => navigate('/login', { replace: true })}>Go to sign in</Button>
                </div>
            ) : (
                <div className='max-w-sm'>
                    <h1 className='font-display text-[20px] font-bold text-ink mb-2'>Opening your AI interview…</h1>
                    <p className='text-[14px] text-text-secondary'><b className='text-ink'>Please do not close or refresh this page.</b> It opens by itself in a few seconds.</p>
                </div>
            )}
        </div>
    )
}
