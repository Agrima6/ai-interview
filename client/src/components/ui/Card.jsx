import React from 'react'
import { motion } from 'motion/react'

/**
 * Generic glassmorphic surface used across dashboards, forms and lists.
 * hover: adds the subtle hover-lift used site-wide.
 */
function Card({ as = 'div', hover = false, className = '', children, ...props }) {
  const Component = hover ? motion[as] || motion.div : as
  const hoverProps = hover
    ? { whileHover: { y: -3 }, transition: { duration: 0.2 } }
    : {}
  return (
    <Component
      className={`bg-card border border-line rounded-2xl shadow-[var(--shadow-soft)] ${hover ? 'transition-shadow duration-300 hover:shadow-[var(--shadow-lift)] hover:border-black/20 dark:hover:border-white/20' : ''} ${className}`}
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardHeader({ className = '', children }) {
  return <div className={`p-6 border-b border-line ${className}`}>{children}</div>
}

export function CardBody({ className = '', children }) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

export function CardFooter({ className = '', children }) {
  return <div className={`p-6 border-t border-line ${className}`}>{children}</div>
}

export default Card
