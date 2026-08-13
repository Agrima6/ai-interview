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
    <div className={`inline-flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-full ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === active
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className='relative px-4 py-2 text-[13.5px] font-medium rounded-full transition-colors flex items-center gap-1.5'
          >
            {isActive && (
              <motion.span
                layoutId='tabs-pill'
                transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
                className='absolute inset-0 bg-card rounded-full shadow-[var(--shadow-soft)]'
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
