import React from 'react'
import { Building2, GraduationCap, User, TrendingUp } from 'lucide-react'
import logo from '../../assets/logo.png'

// Code-drawn brand graphics (SVG/CSS, no external image or AI-generated
// asset) used in place of imagery throughout the marketing pages, in the
// same crimson/white palette as the logo. Swap any of these for a real
// photo by dropping the file in and replacing the call site.

export function NetworkVisual({ className = '' }) {
    const nodes = [
        { icon: Building2, label: 'Organizations', x: 18, y: 22 },
        { icon: GraduationCap, label: 'Colleges', x: 82, y: 22 },
        { icon: User, label: 'Candidates', x: 50, y: 82 },
    ]
    return (
        <div className={`relative rounded-3xl border border-line bg-card overflow-hidden ${className}`}>
            <svg viewBox='0 0 100 100' className='w-full h-full'>
                <line x1='18' y1='22' x2='50' y2='50' stroke='#c4161f' strokeWidth='0.4' strokeDasharray='1.5 1.5' opacity='0.4' />
                <line x1='82' y1='22' x2='50' y2='50' stroke='#c4161f' strokeWidth='0.4' strokeDasharray='1.5 1.5' opacity='0.4' />
                <line x1='50' y1='82' x2='50' y2='50' stroke='#c4161f' strokeWidth='0.4' strokeDasharray='1.5 1.5' opacity='0.4' />
                <circle cx='50' cy='50' r='9' fill='#c4161f' />
                {nodes.map((n) => (
                    <circle key={n.label} cx={n.x} cy={n.y} r='7' fill='white' stroke='#c4161f' strokeWidth='0.6' />
                ))}
            </svg>
            <div className='absolute inset-0'>
                <img src={logo} alt='' className='absolute w-10 h-10 rounded-full -translate-x-1/2 -translate-y-1/2' style={{ left: '50%', top: '50%' }} />
                {nodes.map((n) => (
                    <div key={n.label} className='absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5'
                        style={{ left: `${n.x}%`, top: `${n.y}%` }}>
                        <div className='w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center shadow-sm'>
                            <n.icon size={14} className='text-accent' />
                        </div>
                        <span className='text-[10.5px] font-medium text-ink bg-white/90 px-1.5 rounded whitespace-nowrap'>{n.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function JourneyVisual({ className = '' }) {
    const stops = ['Register', 'Onboard', 'Review', 'Opportunity']
    return (
        <div className={`relative rounded-3xl border border-line bg-card p-8 flex flex-col justify-center ${className}`}>
            <svg viewBox='0 0 300 40' className='w-full mb-6' preserveAspectRatio='none'>
                <path d='M10,20 Q80,-10 150,20 T290,20' fill='none' stroke='#c4161f' strokeWidth='1.2' opacity='0.5' />
            </svg>
            <div className='flex justify-between'>
                {stops.map((s, i) => (
                    <div key={s} className='flex flex-col items-center gap-2'>
                        <div className='w-9 h-9 rounded-full bg-accent/10 border border-accent/30 text-accent text-[12px] font-bold flex items-center justify-center'>{i + 1}</div>
                        <span className='text-[11px] text-text-secondary font-medium'>{s}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function DashboardVisual({ className = '' }) {
    return (
        <div className={`relative rounded-3xl border border-line bg-card p-5 ${className}`}>
            <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                    <img src={logo} alt='' className='w-6 h-6 rounded-full' />
                    <span className='text-[12px] font-semibold text-ink'>Overview</span>
                </div>
                <TrendingUp size={14} className='text-success' />
            </div>
            <div className='grid grid-cols-3 gap-2 mb-4'>
                {[['1,248', 'Registrations'], ['856', 'Onboardings'], ['327', 'Enquiries']].map(([v, l]) => (
                    <div key={l} className='bg-bg rounded-xl p-3 border border-line'>
                        <p className='text-[16px] font-bold text-ink'>{v}</p>
                        <p className='text-[10px] text-text-secondary'>{l}</p>
                    </div>
                ))}
            </div>
            <div className='h-16 bg-bg rounded-xl border border-line flex items-end gap-1 p-2'>
                {[40, 55, 45, 70, 60, 85, 75, 95].map((h, i) => (
                    <div key={i} className='flex-1 bg-accent/60 rounded-sm' style={{ height: `${h}%` }} />
                ))}
            </div>
        </div>
    )
}

export function OrbitVisual({ className = '' }) {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className='absolute w-[70%] aspect-square rounded-full border border-accent/20' />
            <div className='absolute w-[45%] aspect-square rounded-full border border-accent/25' />
            <img src={logo} alt='' className='relative w-16 h-16 rounded-full shadow-lg' />
        </div>
    )
}
