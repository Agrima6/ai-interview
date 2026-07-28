import React from 'react'
import { motion } from "motion/react"

const base = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 select-none disabled:opacity-40 disabled:pointer-events-none"

const sizes = {
  md: "px-6 py-3 text-[15px]",
  lg: "px-8 py-3.5 text-[16px]",
}

const variants = {
  primary: "bg-accent text-white shadow-[0_4px_14px_-4px_rgba(224,39,27,0.55)] hover:bg-accent-dark hover:shadow-[0_10px_24px_-6px_rgba(169,7,7,0.5)] hover:-translate-y-0.5",
  secondary: "bg-card text-ink border border-line hover:border-black/20 dark:hover:border-white/20 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
  // for use on always-dark surfaces (Footer, CTA banners) - a light, high-contrast pop button
  accent: "bg-white text-[#120f10] hover:bg-white/90 hover:-translate-y-0.5 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)]",
  ghost: "text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
}

function Button({ as = "button", variant = "primary", size = "md", className = "", children, ...props }) {
  const Component = motion[as] || motion.button
  return (
    <Component
      whileTap={{ scale: 0.96 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Button
