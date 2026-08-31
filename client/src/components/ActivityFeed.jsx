import React from 'react'
import { Clock } from 'lucide-react'
import { EmptyState } from './ui'

/**
 * Generic timeline list - reused wherever a "recent activity" style feed is
 * needed (dashboard, drive detail, candidate detail, notifications), so
 * this markup is never duplicated per page.
 * `items`: [{ id, message, timestamp }]
 */
function ActivityFeed({ items, emptyLabel = 'No recent activity.' }) {
    if (!items?.length) return <EmptyState title={emptyLabel} />

    return (
        <div className='space-y-1'>
            {items.map((item) => (
                <div key={item.id} className='flex items-start gap-2.5 py-2.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0' aria-hidden='true' />
                    <div className='min-w-0'>
                        <p className='text-[13.5px] text-ink leading-snug'>{item.message}</p>
                        <p className='text-[12px] text-text-secondary flex items-center gap-1 mt-0.5'>
                            <Clock size={11} /> {timeAgo(item.timestamp)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}

function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const minutes = Math.round(diffMs / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.round(hours / 24)
    return `${days}d ago`
}

export default ActivityFeed
