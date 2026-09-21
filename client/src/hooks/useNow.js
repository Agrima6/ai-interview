import { useEffect, useState } from 'react'

/** Current time as a number, refreshed on an interval so countdowns and live gates update without a reload. */
export default function useNow(intervalMs = 10000) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs)
        return () => clearInterval(id)
    }, [intervalMs])
    return now
}
