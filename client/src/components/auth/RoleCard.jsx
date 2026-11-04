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
    CANDIDATE: 'Present your potential and get discovered.'
}

// One selectable role, shown as a radio option: icon tile, title and description, with a ring that fills when chosen.
function RoleCard({ roleKey, label, selected, onClick }) {
    const Icon = ICONS[roleKey] || User
    const description = DESCRIPTIONS[roleKey] || ''

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-5 py-4 min-h-[84px] rounded-[20px] border-[1.5px] text-left transition-all duration-200 select-none group focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 hover:-translate-y-0.5 ${
                selected
                    ? 'border-accent bg-[#FFF6F7]'
                    : 'border-[#EFE3E7] bg-white hover:border-[#E3CDD3] hover:shadow-[0_18px_40px_-28px_rgba(90,20,40,0.45)]'
            }`}
        >
            <span className={`w-[50px] h-[50px] rounded-[14px] flex items-center justify-center shrink-0 transition-colors duration-200 ${
                selected ? 'bg-accent text-white' : 'bg-[#FFF1F3] text-accent'
            }`}>
                <Icon size={24} strokeWidth={1.7} aria-hidden='true' />
            </span>

            <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-medium text-ink leading-snug">{label}</span>
                <span className="block text-[13.5px] font-normal text-text-secondary leading-normal">{description}</span>
            </span>

            <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
                selected ? 'border-accent bg-accent text-white' : 'border-[#D9C6CC] bg-white text-transparent'
            }`} aria-hidden='true'>
                <Check size={12} className="stroke-[3]" />
            </span>
        </button>
    )
}

export default RoleCard
