import React from 'react'
import { User } from 'lucide-react'

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-9 h-9 text-[13px]',
  lg: 'w-12 h-12 text-[16px]',
  xl: 'w-16 h-16 text-[20px]',
}

// Photo avatar when `src` is given, otherwise a gradient initials/icon badge.
function Avatar({ src, name, size = 'md', className = '' }) {
  const initials = name?.trim()?.slice(0, 1)?.toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${SIZES[size]} rounded-full object-cover border border-line ${className}`}
      />
    )
  }

  return (
    <div className={`${SIZES[size]} rounded-full gradient-brand text-white flex items-center justify-center font-semibold shrink-0 ${className}`}>
      {initials || <User size={14} />}
    </div>
  )
}

export default Avatar
