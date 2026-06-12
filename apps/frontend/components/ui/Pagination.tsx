'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  function range() {
    const pages: number[] = []
    const start = Math.max(1, page - 1)
    const end = Math.min(totalPages, page + 1)
    if (start > 1) pages.push(1)
    if (start > 2) pages.push(-1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push(-1)
    if (end < totalPages) pages.push(totalPages)
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
      >
        <ChevronLeft size={18} />
      </button>
      {range().map((p, i) =>
        p === -1 ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              p === page ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
