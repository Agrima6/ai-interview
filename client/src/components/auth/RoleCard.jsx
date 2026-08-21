import React from 'react'
import { Check, Building2, GraduationCap, User } from 'lucide-react'

const ICONS = {
    ORGANIZATION: Building2,
    COLLEGE: GraduationCap,
    CANDIDATE: User
}

const DESCRIPTIONS = {
    ORGANIZATION: 'Hire smarter and build stronger teams.',
    COLLEGE: 'Connect students with real opportunities.',
    CANDIDATE: 'Present potential and get discovered.'
}

function RoleCard({ roleKey, label, selected, onClick }) {
    const Icon = ICONS[roleKey] || User
    const description = DESCRIPTIONS[roleKey] || ''

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full relative flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200 select-none group focus:outline-none focus:ring-4 focus:ring-accent/15 ${
                selected
                    ? 'border-accent bg-[#fff5f5] shadow-[0_4px_20px_-4px_rgba(196,22,31,0.1)]'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
            }`}
        >
            {/* Left Icon Container */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                selected
                    ? 'bg-accent text-white border-accent'
                    : 'bg-red-50 text-accent border-red-100/50 group-hover:bg-accent group-hover:text-white group-hover:border-accent'
            }`}>
                <Icon size={20} />
            </div>

            {/* Content area */}
            <div className="flex-1 space-y-1">
                <h4 className="font-display font-bold text-[15px] text-ink leading-snug">
                    {label}
                </h4>
                <p className="text-[12.5px] text-text-secondary leading-normal">
                    {description}
                </p>
            </div>

            {/* Checkmark Indicator */}
            {selected && (
                <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center animate-in scale-in duration-150">
                    <Check size={12} className="stroke-[3]" />
                </div>
            )}
        </button>
    )
}

export default RoleCard
