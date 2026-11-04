import React, { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Tabs({ tabs: [{id,label,icon?}], value, onChange }) — controlled.
 * If `value`/`onChange` are omitted, manages its own state (uncontrolled).
 */
function Tabs({ tabs, value, onChange, className = '' }) {
  const [internal, setInternal] = useState(tabs?.[0]?.id)
  const active = value ?? internal
  const setActive = onChange ?? setInternal

  return (
    <div className={`inline-flex items-center gap-1.5 bg-[#e9ebf6] p-[5px] rounded-[14px] max-w-full overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === active
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className='relative h-[38px] px-4 text-[13px] font-semibold rounded-[10px] transition-colors flex items-center gap-1.5 whitespace-nowrap'
          >
            {isActive && (
              <motion.span
                layoutId='tabs-pill'
                transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
                className='absolute inset-0 bg-card rounded-[10px] shadow-[0_4px_12px_-6px_rgba(13,18,51,0.35)]'
              />
            )}
            <span className={`relative flex items-center gap-1.5 ${isActive ? 'text-ink' : 'text-text-secondary'}`}>
              {Icon && <Icon size={14} />}
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
