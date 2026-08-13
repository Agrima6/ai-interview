import React from 'react'

// Generic shimmering loading placeholder. Compose with width/height utility
// classes, e.g. <Skeleton className="h-4 w-32" /> or <Skeleton className="h-10 w-10 rounded-full" />
function Skeleton({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-black/[0.06] dark:bg-white/[0.08] ${className}`}
    >
      <div className='absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-black/[0.06] dark:via-white/[0.10] to-transparent' />
    </div>
  )
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export default Skeleton
