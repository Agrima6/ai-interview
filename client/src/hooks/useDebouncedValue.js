import { useEffect, useState } from 'react'

/** The value, but only after it has stopped changing for `ms`: for search boxes that query the server. */
export default function useDebouncedValue(value, ms = 350) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => { const id = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(id) }, [value, ms])
    return debounced
}
