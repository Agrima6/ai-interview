import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const SIDES = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

function Tooltip({ content, side = 'top', children, className = '' }) {
  const [show, setShow] = useState(false)
  if (!content) return children

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.12 }}
            role='tooltip'
            className={`absolute z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-[#15151f] text-white dark:bg-white dark:text-[#0a0a0f] shadow-[var(--shadow-lift)] pointer-events-none ${SIDES[side]}`}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

export default Tooltip
