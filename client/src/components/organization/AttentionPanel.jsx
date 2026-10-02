import React from 'react'
import { Link } from 'react-router-dom'
import { AlertOctagon, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { EmptyState } from '../ui'

// Severity is always paired with an icon + text label, never color alone
// (accessibility requirement - section 54).
const SEVERITY = {
    critical: { icon: AlertOctagon, className: 'text-red-500 bg-red-500/10', label: 'Critical' },
    warning: { icon: AlertTriangle, className: 'text-amber-500 bg-amber-500/10', label: 'Warning' },
    info: { icon: Info, className: 'text-accent bg-accent/10', label: 'Info' },
    success: { icon: CheckCircle2, className: 'text-green-600 bg-green-600/10', label: 'Resolved' },
}

/**
 * `items`: [{ id, title, description, severity, timestamp, action: { label, to } }]
 */
function AttentionPanel({ items }) {
    if (!items?.length) {
        return <EmptyState icon={CheckCircle2} title="You're all caught up." />
    }

    return (
        <div className='space-y-1'>
            {items.map((item) => {
                const severity = SEVERITY[item.severity] || SEVERITY.info
                const Icon = severity.icon
                const content = (
                    <div className='flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors'>
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${severity.className}`}>
                            <Icon size={15} />
                        </span>
                        <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2'>
                                <p className='text-[13.5px] font-medium text-ink truncate'>{item.title}</p>
                                <span className={`text-[10.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${severity.className}`}>{severity.label}</span>
                            </div>
                            <p className='text-[12.5px] text-text-secondary mt-0.5 leading-relaxed'>{item.description}</p>
                            {item.action?.label && <span className='text-[12px] font-medium text-accent mt-1 inline-block'>{item.action.label} →</span>}
                        </div>
                    </div>
                )
                return item.action?.to ? (
                    <Link key={item.id} to={item.action.to}>{content}</Link>
                ) : (
                    <div key={item.id}>{content}</div>
                )
            })}
        </div>
    )
}

export default AttentionPanel
