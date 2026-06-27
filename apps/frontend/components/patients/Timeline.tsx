'use client'

import { useState, useMemo } from 'react'
import type { TimelineItem } from '@/types'
import InteractionItem from './InteractionItem'
import AppointmentItem from './AppointmentItem'
import MedicalRecordItem from './MedicalRecordItem'

const ITEMS_PER_PAGE = 10

function renderItem(item: TimelineItem) {
  switch (item.type) {
    case 'interaction':
      return <InteractionItem key={item.id} data={item.data as any} />
    case 'appointment':
      return <AppointmentItem key={item.id} data={item.data as any} />
    case 'medical_record':
      return <MedicalRecordItem key={item.id} data={item.data as any} />
  }
}

export default function Timeline({ items }: { items: TimelineItem[] }) {
  const [page, setPage] = useState(1)

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [items],
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE))
  const paginated = sorted.slice(0, page * ITEMS_PER_PAGE)
  const hasMore = paginated.length < sorted.length

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
        Aucune activité pour ce patient.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {paginated.map(renderItem)}
      {hasMore && (
        <div className="pt-2 text-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50"
          >
            Charger plus ({sorted.length - paginated.length} restants)
          </button>
        </div>
      )}
    </div>
  )
}
