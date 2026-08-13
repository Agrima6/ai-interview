import React from 'react'
import { Inbox } from 'lucide-react'
import Button from '../Button'

function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-16 ${className}`}>
      <div className='w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mb-5'>
        <Icon size={22} strokeWidth={1.5} className='text-text-secondary' />
      </div>
      <h3 className='text-[16px] font-semibold text-ink mb-1.5'>{title}</h3>
      {description && <p className='text-[13.5px] text-text-secondary max-w-sm leading-relaxed mb-6'>{description}</p>}
      {actionLabel && (
        <Button size='md' onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
