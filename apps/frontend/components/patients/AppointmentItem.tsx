'use client'

import type { AppointmentData } from '@/types'

const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  confirmed: { label: 'Confirmé', icon: '✅', color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Annulé', icon: '❌', color: 'bg-red-100 text-red-700 border-red-200' },
  pending: { label: 'En attente', icon: '⏳', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  no_show: { label: 'No-show', icon: '🚫', color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const sourceLabels: Record<string, string> = {
  manual: 'Manuel',
  call: 'Appel',
  portal: 'Portail',
}

export default function AppointmentItem({ data }: { data: AppointmentData }) {
  const cfg = statusConfig[data.status] || statusConfig.pending
  const date = new Date(data.dateTime)

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-base">
          📅
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-purple-600">Rendez-vous</span>
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            <span className="text-xs text-gray-400">
              {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="text-xs text-gray-400">
              {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <p className="mt-1 text-sm font-medium text-gray-900">{data.doctorName}</p>
          <p className="text-xs text-gray-500">{data.specialty}</p>

          <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            Source: {sourceLabels[data.source] || data.source}
          </span>
        </div>
      </div>
    </div>
  )
}
