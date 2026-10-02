import React from 'react'
import { Skeleton, EmptyState, Button, Select } from '../ui'
import { AlertCircle, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * Server-side table used across every admin list screen. Handles the
 * loading/empty/error/data states so each page only needs to supply
 * columns + fetched rows.
 *
 * Two pagination modes, chosen by which props the caller passes:
 * - Cursor mode (default, unchanged): `hasNext`/`onLoadMore`/`loadingMore`
 *   render a trailing "Load more" button.
 * - Page mode (opt-in): pass `pagination` = { page, pageSize, total,
 *   onPageChange, onPageSizeChange } to render page-size selection, a
 *   "Showing X-Y of Z" summary and Prev/1 2 3/Next controls instead.
 *
 * `sort` = { sortBy, sortOrder, onChange } makes any column with
 * `sortable: true` clickable, toggling asc/desc server-side.
 */
function DataTable({ columns, rows, loading, error, onRetry, emptyLabel = 'Nothing here yet.', onRowClick, hasNext, onLoadMore, loadingMore, sort, pagination }) {
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

    const sortIcon = (col) => {
        if (!col.sortable) return null
        if (sort?.sortBy !== col.key) return <ChevronsUpDown size={12} className='opacity-40' />
        return sort.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
    }

    const totalPages = pagination ? Math.max(Math.ceil(pagination.total / pagination.pageSize), 1) : 0
    const rangeStart = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 0
    const rangeEnd = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0

    // A compact page list: always show first/last, the current page +/-1,
    // and "..." for any gap, rather than every page number for large sets.
    const pageNumbers = []
    if (pagination) {
        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || Math.abs(p - pagination.page) <= 1) pageNumbers.push(p)
            else if (pageNumbers[pageNumbers.length - 1] !== '...') pageNumbers.push('...')
        }
    }

    return (
        <div className='border border-line rounded-2xl overflow-hidden'>
            <div className='overflow-x-auto'>
                <table className='w-full text-left'>
                    <thead>
                        <tr className='bg-bg border-b border-line'>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={col.sortable ? () => sort?.onChange(col.key) : undefined}
                                    className={`px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-text-secondary whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-ink' : ''}`}
                                >
                                    <span className='inline-flex items-center gap-1'>{col.label}{sortIcon(col)}</span>
                                </th>
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

            {hasNext !== undefined && !pagination && (
                <div className='border-t border-line p-3 text-center'>
                    <Button variant='secondary' size='sm' onClick={onLoadMore} disabled={loadingMore}>
                        {loadingMore ? 'Loading...' : 'Load more'}
                    </Button>
                </div>
            )}

            {pagination && (
                <div className='border-t border-line px-4 py-3 flex items-center justify-between flex-wrap gap-3'>
                    <div className='flex items-center gap-3'>
                        <span className='text-[12.5px] text-text-secondary whitespace-nowrap'>
                            {pagination.total > 0 ? `Showing ${rangeStart}–${rangeEnd} of ${pagination.total}` : 'No results'}
                        </span>
                        <Select
                            value={pagination.pageSize}
                            onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
                            wrapperClassName='w-[100px]'
                            aria-label='Page size'
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
                        </Select>
                    </div>
                    <div className='flex items-center gap-1'>
                        <Button variant='secondary' size='xs' disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>Previous</Button>
                        {pageNumbers.map((p, i) => p === '...' ? (
                            <span key={`gap-${i}`} className='px-2 text-[12.5px] text-text-secondary'>...</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => pagination.onPageChange(p)}
                                className={`w-7 h-7 rounded-lg text-[12.5px] font-medium transition-colors ${p === pagination.page ? 'bg-accent text-white' : 'text-text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'}`}
                            >
                                {p}
                            </button>
                        ))}
                        <Button variant='secondary' size='xs' disabled={pagination.page >= totalPages} onClick={() => pagination.onPageChange(pagination.page + 1)}>Next</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DataTable
