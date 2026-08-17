import React from 'react'
import { Skeleton, EmptyState, Button } from '../ui'
import { AlertCircle } from 'lucide-react'

// Server-side cursor-paginated table used across every admin list screen.
// Handles the loading/empty/error/data states so each page only needs to
// supply columns + fetched rows.
function DataTable({ columns, rows, loading, error, onRetry, emptyLabel = 'Nothing here yet.', onRowClick, hasNext, onLoadMore, loadingMore }) {
    if (error) {
        return (
            <div className='border border-line rounded-2xl p-10 text-center'>
                <AlertCircle size={22} className='text-red-500 mx-auto mb-3' />
                <p className='text-[14px] text-ink font-medium mb-1'>Couldn't load this data</p>
                <p className='text-[13px] text-text-secondary mb-4'>{error}</p>
                {onRetry && <Button variant='secondary' onClick={onRetry}>Retry</Button>}
            </div>
        )
    }

    if (loading) {
        return (
            <div className='border border-line rounded-2xl overflow-hidden'>
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-14 border-b border-line last:border-0' />)}
            </div>
        )
    }

    if (!rows?.length) {
        return <EmptyState title={emptyLabel} />
    }

    return (
        <div className='border border-line rounded-2xl overflow-hidden'>
            <div className='overflow-x-auto'>
                <table className='w-full text-left'>
                    <thead>
                        <tr className='bg-bg border-b border-line'>
                            {columns.map((col) => (
                                <th key={col.key} className='px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-text-secondary whitespace-nowrap'>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.id}
                                onClick={() => onRowClick?.(row)}
                                className={`border-b border-line last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-bg/60' : ''}`}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className='px-5 py-3.5 text-[13.5px] text-ink whitespace-nowrap'>
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {hasNext && (
                <div className='border-t border-line p-3 text-center'>
                    <Button variant='secondary' size='sm' onClick={onLoadMore} disabled={loadingMore}>
                        {loadingMore ? 'Loading...' : 'Load more'}
                    </Button>
                </div>
            )}
        </div>
    )
}

export default DataTable
