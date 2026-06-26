'use client'

import { useState } from 'react'
import type { InteractionData } from '@/types'

const intentLabels: Record<string, string> = {
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  no_response: 'Pas de réponse',
  unreachable: 'Injoignable',
}

const intentIcons: Record<string, string> = {
  confirmed: '✅',
  cancelled: '❌',
  no_response: '📵',
  unreachable: '🚫',
}

const sentimentColors: Record<string, string> = {
  POSITIVE: 'bg-green-100 text-green-700 border-green-200',
  NEUTRAL: 'bg-gray-100 text-gray-600 border-gray-200',
  NEGATIVE: 'bg-red-100 text-red-700 border-red-200',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 3600000) return `H-${Math.max(1, Math.round(diff / 60000))}min`
  const sameDay = new Date().toDateString() === d.toDateString()
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function InteractionItem({ data }: { data: InteractionData }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-base">
          {data.type === 'CALL' ? '📞' : '💬'}
        </div>
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-blue-600">
              {data.type === 'CALL' ? 'Appel' : 'SMS'}{' '}
              {data.direction === 'OUTBOUND' ? '↗ sortant' : '↙ entrant'}
            </span>
            <span className="text-xs text-gray-400">{formatTime(data.createdAt)}</span>
            {data.duration && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                {data.duration}s
              </span>
            )}
            <span className="text-xs">{intentIcons[data.intent]} {intentLabels[data.intent]}</span>
          </div>

          {/* Sentiment badge */}
          {data.sentiment && (
            <span className={`mt-1 inline-block rounded border px-2 py-0.5 text-xs font-medium ${sentimentColors[data.sentiment]}`}>
              {data.sentiment === 'POSITIVE' ? '🟢' : data.sentiment === 'NEUTRAL' ? '⚪' : '🔴'} {data.sentiment}
            </span>
          )}

          {/* Transcript toggle */}
          {data.transcript && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                {expanded ? 'Masquer le transcript ▲' : 'Voir le transcript ▼'}
              </button>
              {expanded && (
                <div className="mt-1 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                  {data.transcript}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
