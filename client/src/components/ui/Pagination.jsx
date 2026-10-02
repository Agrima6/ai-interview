import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZES = [10, 25, 50, 100]

/**
 * Shared server-side pagination bar - integration.md section 17.
 * `page`/`pageSize`/`total` describe the current server response;
 * `onPageChange`/`onPageSizeChange` re-fetch from the caller.
 */
function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = PAGE_SIZES, className = '' }) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pageNumbers = []
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, Math.max(page + 2, 5))
  for (let p = start; p <= end; p++) pageNumbers.push(p)

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 ${className}`}>
      <div className='flex items-center gap-2 text-[12.5px] text-text-secondary'>
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className='bg-transparent border border-line rounded-lg px-2 py-1 text-ink text-[12.5px]'
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span className='ml-2 whitespace-nowrap'>Showing {from}–{to} of {total}</span>
      </div>

      <div className='flex items-center gap-1'>
        <button
          type='button'
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className='w-8 h-8 flex items-center justify-center rounded-lg border border-line text-text-secondary hover:text-ink hover:bg-black/[0.03] dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:pointer-events-none'
          aria-label='Previous page'
        >
          <ChevronLeft size={14} />
        </button>
        {start > 1 && <span className='px-1 text-text-secondary text-[12.5px]'>…</span>}
        {pageNumbers.map((p) => (
          <button
            key={p}
            type='button'
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors ${
              p === page ? 'bg-accent text-white' : 'text-text-secondary hover:text-ink hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span className='px-1 text-text-secondary text-[12.5px]'>…</span>}
        <button
          type='button'
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className='w-8 h-8 flex items-center justify-center rounded-lg border border-line text-text-secondary hover:text-ink hover:bg-black/[0.03] dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:pointer-events-none'
          aria-label='Next page'
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

export default Pagination
