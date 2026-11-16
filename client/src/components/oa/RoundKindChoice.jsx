import React from 'react'
import { Bot, Check, ClipboardCheck } from 'lucide-react'

const KINDS = [
    { id: 'TEST', icon: ClipboardCheck, title: 'Online test', text: 'MCQ, written, coding and video questions in a proctored test room.' },
    { id: 'AI_INTERVIEW', icon: Bot, title: 'AI interview', text: 'The AI interviewer speaks to each candidate and scores the conversation.' },
]

/** A big either/or card that reads at a glance; the selected one carries a tick, not colour alone. */
export function Choice({ selected, onSelect, icon, title, text, disabled, name }) {
    const Icon = icon
    return (
        <label className={`relative flex gap-3 rounded-2xl border-2 p-3.5 transition-colors ${disabled ? 'opacity-55 cursor-not-allowed border-line' : selected ? 'border-accent bg-accent/[0.05] cursor-pointer' : 'border-line hover:border-accent/40 cursor-pointer'}`}>
            <input type='radio' name={name} className='sr-only' checked={selected} disabled={disabled} onChange={onSelect} />
            {Icon && <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${selected ? 'bg-accent text-white' : 'bg-surface-muted text-text-secondary'}`} aria-hidden='true'><Icon size={19} strokeWidth={1.8} /></span>}
            <span className='min-w-0 flex-1'>
                <span className='block text-[14px] font-bold text-ink'>{title}</span>
                <span className='block text-[12.5px] leading-snug text-text-secondary mt-0.5'>{text}</span>
            </span>
            {selected && <span className='absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center' aria-hidden='true'><Check size={12} strokeWidth={3} /></span>}
        </label>
    )
}

/** Online test or AI interview. */
export default function RoundKindChoice({ value, onChange, name = 'round-kind' }) {
    return (
        <div className='grid sm:grid-cols-2 gap-3'>
            {KINDS.map((k) => <Choice key={k.id} name={name} selected={value === k.id} onSelect={() => onChange(k.id)} icon={k.icon} title={k.title} text={k.text} />)}
        </div>
    )
}
