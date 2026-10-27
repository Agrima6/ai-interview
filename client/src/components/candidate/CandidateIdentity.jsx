import React from 'react'
import { resolveCandidateName, initialOf } from '../../utils/candidateName'

/**
 * The one place a signed-in candidate is identified: avatar + name. The email is shown only when `showEmail` is set
 * (account-oriented spots), and is always available as a tooltip so it is never lost, just not repeated.
 */
function CandidateIdentity({ user, showEmail = false, compact = false }) {
  const name = resolveCandidateName(user)
  return (
    <div className='flex items-center gap-2 min-w-0' title={user?.email || undefined}>
      <span aria-hidden='true' className='w-7 h-7 rounded-full bg-accent/10 text-accent text-[12px] font-bold flex items-center justify-center shrink-0'>
        {initialOf(name)}
      </span>
      <span className={`min-w-0 ${compact ? 'hidden sm:block' : ''}`}>
        <span className='block text-[12.5px] font-semibold text-ink max-w-[10rem] truncate'>{name}</span>
        {showEmail && user?.email && <span className='block text-[11.5px] text-text-secondary max-w-[10rem] truncate'>{user.email}</span>}
      </span>
    </div>
  )
}

export default CandidateIdentity
