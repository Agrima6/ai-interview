import React, { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

/**
 * Debounced search box - manages its own local typing state and only calls
 * onChange(value) 300ms after the user stops typing, so search doesn't hit
 * the API on every keystroke. `value` is the committed (debounced) value,
 * kept in sync if the parent resets it externally (e.g. clearing filters).
 */
function SearchInput({ value = '', onChange, placeholder = 'Search...', debounceMs = 300, className = '' }) {
    const [local, setLocal] = useState(value)

    useEffect(() => { setLocal(value) }, [value])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (local !== value) onChange(local)
        }, debounceMs)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [local])

    return (
        <div className={`relative ${className}`}>
            <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none' />
            <input
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className='w-full pl-9 pr-3.5 py-2.5 text-[13.5px] text-ink bg-card border border-line rounded-xl outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 transition-colors'
            />
        </div>
    )
}

export default SearchInput
