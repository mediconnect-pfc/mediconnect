'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Megaphone, Plus, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import { toast } from '@/components/ui'
import CampaignList from '@/components/campaigns/CampaignList'
import CampaignModal from '@/components/campaigns/CampaignModal'
import { useAuth } from '@/hooks/useAuth'
import type { Campaign } from '@/types'
import {
  getAuthToken,
  getCampaigns,
  getCampaignStats,
  createCampaign,
  launchCampaignWithCsv,
  pauseCampaign,
  type CampaignInput,
} from '@/lib/api'

export default function CampaignsPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [pausingId, setPausingId] = useState<string | null>(null)

  const token = useMemo(() => getAuthToken(), [])
  const canManageCampaigns = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  const refreshCampaigns = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const listResponse = await getCampaigns(token || undefined)
      const list: Campaign[] = Array.isArray(listResponse) ? listResponse : listResponse?.data ?? []

      const enriched = await Promise.all(
        list.map(async (campaign) => {
          try {
            const detail = await getCampaignStats(campaign.id, token || undefined)
            return {
              ...campaign,
              stats: detail.stats ?? detail.campaign?.stats ?? campaign.stats,
            }
          } catch {
            return campaign
          }
        }),
      )

      setCampaigns(enriched)
    } catch (err) {
      setCampaigns([])
      setError(err instanceof Error ? err.message : 'Erreur chargement campagnes')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    refreshCampaigns()
  }, [refreshCampaigns])

  async function handleCreate(data: { campaign: CampaignInput; file: File; contactsCount: number }) {
    if (!canManageCampaigns) {
      throw new Error('Acces refuse')
    }
    const authToken = token || getAuthToken()
    if (!authToken) throw new Error('Non authentifie')

    setCreateLoading(true)
    try {
      const created = await createCampaign(authToken, data.campaign)
      await launchCampaignWithCsv(authToken, created.id, data.file)
      setCreateOpen(false)
      await refreshCampaigns()
      toast({
        message: `Campagne lancee pour ${data.contactsCount} contacts`,
        type: 'success',
      })
    } finally {
      setCreateLoading(false)
    }
  }

  async function handlePause(campaign: Campaign) {
    if (!canManageCampaigns) {
      setError('Acces refuse')
      return
    }
    const authToken = token || getAuthToken()
    if (!authToken) throw new Error('Non authentifie')

    setPausingId(campaign.id)
    try {
      await pauseCampaign(authToken, campaign.id)
      await refreshCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur pause campagne')
    } finally {
      setPausingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campagnes</h1>
          <p className="mt-1 text-sm text-gray-500">SMS, appels vocaux et campagnes d'urgence</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={refreshCampaigns}>
            Rafraichir
          </Button>
          <Button
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
            disabled={!canManageCampaigns}
          >
            Nouvelle campagne
          </Button>
        </div>
      </div>

      {!canManageCampaigns && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Votre compte ne peut pas creer ou gerer des campagnes. Seuls les roles ADMIN et SUPER_ADMIN ont acces a cette fonctionnalite.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <CampaignList
        campaigns={campaigns}
        loading={loading}
        onPause={handlePause}
        onRefresh={refreshCampaigns}
        onCreate={() => setCreateOpen(true)}
        pausingId={pausingId}
        canManage={canManageCampaigns}
      />

      <CampaignModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={createLoading}
        disabled={!canManageCampaigns}
      />
    </div>
  )
}
