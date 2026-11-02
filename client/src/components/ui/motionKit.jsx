import React, { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useReducedMotion } from 'motion/react'

/**
 * Small, shared motion helpers so every page animates the same way (and none of it runs for people who ask their
 * system for reduced motion).
 */

// Fades and rises into place when scrolled into view. `index` staggers siblings (0.06s apart, capped).
export function Reveal({ as = 'div', index = 0, className = '', children, ...props }) {
  const reduce = useReducedMotion()
  const Component = motion[as] || motion.div
  return (
    <Component
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  )
}

// Counts up to a number the first time it is seen. Non-numeric values (e.g. "—") are shown as they are.
export function CountUp({ value, duration = 0.9, className = '' }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const text = String(value ?? '')
  const match = text.replace(/,/g, '').match(/^(-?\d+(?:\.\d+)?)(.*)$/)
  const target = match ? Number(match[1]) : null
  const suffix = match ? match[2] : ''
  const decimals = match && match[1].includes('.') ? match[1].split('.')[1].length : 0
  const [shown, setShown] = useState(target === null || reduce ? target : 0)

  useEffect(() => {
    if (target === null) return undefined
    if (reduce) { setShown(target); return undefined }
    if (!inView) return undefined
    const controls = animate(0, target, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(v) })
    return () => controls.stop()
  }, [target, inView, reduce, duration])

  if (target === null) return <span ref={ref} className={className}>{text}</span>
  const formatted = Number(shown).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return <span ref={ref} className={className}>{formatted}{suffix}</span>
}
