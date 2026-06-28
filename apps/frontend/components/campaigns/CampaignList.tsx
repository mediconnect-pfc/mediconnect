'use client'

import { Calendar, Plus, Pause, RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import CampaignStats from './CampaignStats'
import type { Campaign } from '@/types'

interface CampaignListProps {
  campaigns: Campaign[]
  loading?: boolean
  onPause: (campaign: Campaign) => Promise<void> | void
  onRefresh: () => void
  onCreate?: () => void
  pausingId?: string | null
  canManage?: boolean
}

const statusMap: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info'; className?: string }
> = {
  DRAFT: { label: 'Brouillon', variant: 'info' },
  SCHEDULED: { label: 'Planifié', variant: 'warning' },
  RUNNING: { label: 'En cours', variant: 'info', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Terminé', variant: 'success' },
  PAUSED: { label: 'En pause', variant: 'warning' },
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

function LoadingCard() {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-2/5 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-gray-200" />
          <div className="h-6 w-28 rounded-full bg-gray-100" />
        </div>
        <div className="h-4 w-3/5 rounded bg-gray-100" />
        <div className="h-32 rounded-xl bg-gray-100" />
      </div>
    </div>
  )
}

export default function CampaignList({
  campaigns,
  loading,
  onPause,
  onRefresh,
  onCreate,
  pausingId,
  canManage = true,
}: CampaignListProps) {
  if (loading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingCard key={`campaign-loading-${index}`} />
        ))}
      </div>
    )
  }

  if (!campaigns.length) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-gray-500 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Plus size={24} />
        </div>
        <p className="text-base font-medium text-gray-900">Aucune campagne.</p>
        <p className="mt-1 text-sm text-gray-500">Créez votre première campagne pour démarrer.</p>
        <div className="mt-4 flex justify-center gap-2">
          {onCreate && (
            <Button onClick={onCreate} icon={<Plus size={16} />} disabled={!canManage}>
              Nouvelle campagne
            </Button>
          )}
          <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={onRefresh}>
            Rafraîchir
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => {
        const status = statusMap[campaign.status] ?? statusMap.DRAFT
        const canPause = canManage && (campaign.status === 'RUNNING' || campaign.status === 'SCHEDULED')
        const totalContacts = campaign.stats?.totalMessages ?? 0

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
                  <span>
                    Type: <strong className="text-gray-700">{campaign.type}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(campaign.scheduledAt)}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {totalContacts} contacts
                  </span>
                </div>

                {campaign.message && (
                  <p className="max-w-3xl whitespace-pre-wrap text-sm text-gray-600">
                    {campaign.message}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
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

            {!canManage && (
              <p className="mt-3 text-xs text-amber-700">
                Lecture seule. La création et la gestion des campagnes nécessitent un rôle ADMIN ou SUPER_ADMIN.
              </p>
            )}

            <div className="mt-4">
              <CampaignStats stats={campaign.stats} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
