'use client'

import type { CampaignStats as CampaignStatsType } from '@/types'

interface CampaignStatsProps {
  stats?: CampaignStatsType
}

export default function CampaignStats({ stats }: CampaignStatsProps) {
  const total = stats?.totalMessages ?? 0
  const delivered = stats?.delivered ?? 0
  const sent = stats?.sent ?? 0
  const failed = stats?.failed ?? 0
  const progress = total > 0 ? Math.round((delivered / total) * 100) : 0
  const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0

  return (
    <div className="space-y-3 rounded-xl border bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Contacts</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{total}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Envoyés</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{sent}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Livrés</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{delivered}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Échecs</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{failed}</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Livrés</span>
          <span>{successRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
