import React from 'react'
import { Inbox, Sparkles } from 'lucide-react'
import Button from '../Button'

/**
 * Illustrated empty state: a soft orbit with the page's own icon in the
 * middle and two floating chips. Pure CSS/SVG so it re-themes with the
 * organization's accent colour and costs no image download.
 */
function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction, compact = false, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${compact ? 'py-8' : 'py-14'} ${className}`}>
      <div aria-hidden='true' className={`relative flex items-center justify-center ${compact ? 'w-24 h-24 mb-4' : 'w-36 h-36 mb-6'}`}>
        <span className='absolute inset-0 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_7%,white)]' />
        <span className='absolute inset-3 rounded-full border border-dashed border-accent/30' />
        <span className='ui-float relative w-[60%] aspect-square rounded-[22px] bg-card shadow-[0_18px_36px_-14px_color-mix(in_srgb,var(--color-accent)_55%,transparent)] border border-line flex items-center justify-center'>
          <Icon size={compact ? 24 : 32} strokeWidth={1.6} className='text-accent' />
        </span>
        <span className='absolute top-1 right-2 w-7 h-7 rounded-full bg-[var(--color-accent-cyan)] text-white flex items-center justify-center shadow-md ui-pop'>
          <Sparkles size={13} />
        </span>
        <span className='absolute bottom-3 left-0 w-3.5 h-3.5 rounded-full bg-accent/70' />
      </div>
      <h3 className='text-[17px] font-bold text-ink mb-1.5'>{title}</h3>
      {description && <p className='text-[14px] text-text-secondary max-w-sm leading-relaxed mb-6'>{description}</p>}
      {actionLabel && (
        <Button size='md' onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
