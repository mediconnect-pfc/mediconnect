'use client'

import { Calendar, Pause, Play, RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import CampaignStats from './CampaignStats'
import type { Campaign } from '@/types'

interface CampaignListProps {
  campaigns: Campaign[]
  loading?: boolean
  onLaunch: (campaign: Campaign) => void
  onPause: (campaign: Campaign) => Promise<void> | void
  onRefresh: () => void
  launchingId?: string | null
  pausingId?: string | null
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info'; className?: string }> = {
  DRAFT: { label: 'Brouillon', variant: 'info' },
  SCHEDULED: { label: 'Planifiée', variant: 'warning' },
  RUNNING: { label: 'En cours', variant: 'info', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Terminée', variant: 'success' },
  PAUSED: { label: 'En pause', variant: 'warning' },
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function CampaignList({
  campaigns,
  loading,
  onLaunch,
  onPause,
  onRefresh,
  launchingId,
  pausingId,
}: CampaignListProps) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
        Chargement...
      </div>
    )
  }

  if (!campaigns.length) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
        Aucune campagne.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => {
        const status = statusMap[campaign.status] ?? statusMap.DRAFT
        const canLaunch = campaign.status !== 'RUNNING' && campaign.status !== 'COMPLETED'
        const canPause = campaign.status === 'RUNNING' || campaign.status === 'SCHEDULED'

        return (
          <div key={campaign.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                  <Badge variant={status.variant} className={status.className}>
                    {campaign.status === 'RUNNING' ? <RotateCcw size={12} className="mr-1 animate-spin" /> : null}
                    {status.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span>Type: <strong className="text-gray-700">{campaign.type}</strong></span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(campaign.scheduledAt)}
                  </span>
                </div>

                {campaign.message && (
                  <p className="max-w-3xl whitespace-pre-wrap text-sm text-gray-600">
                    {campaign.message}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {canLaunch && (
                  <Button loading={launchingId === campaign.id} icon={<Play size={16} />} onClick={() => onLaunch(campaign)}>
                    Lancer
                  </Button>
                )}
                {canPause && (
                  <Button
                    variant="secondary"
                    loading={pausingId === campaign.id}
                    icon={<Pause size={16} />}
                    onClick={() => onPause(campaign)}
                  >
                    Pause
                  </Button>
                )}
                <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={onRefresh}>
                  Rafraîchir
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <CampaignStats stats={campaign.stats} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
