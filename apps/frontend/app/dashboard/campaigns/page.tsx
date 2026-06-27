'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Megaphone, Plus, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import CampaignList from '@/components/campaigns/CampaignList'
import CampaignModal from '@/components/campaigns/CampaignModal'
import LaunchConfirmModal from '@/components/campaigns/LaunchConfirmModal'
import type { Campaign } from '@/types'
import {
  getAuthToken,
  getCampaigns,
  getCampaignStats,
  createCampaign,
  launchCampaign,
  pauseCampaign,
  type CampaignInput,
} from '@/lib/api'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [launchOpen, setLaunchOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [launchingId, setLaunchingId] = useState<string | null>(null)
  const [pausingId, setPausingId] = useState<string | null>(null)

  const token = useMemo(() => getAuthToken(), [])

  const refreshCampaigns = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const listResponse = await getCampaigns(token || undefined)
      const list: Campaign[] = Array.isArray(listResponse)
        ? listResponse
        : listResponse?.data ?? []

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

  async function handleCreate(data: CampaignInput) {
    const authToken = token || getAuthToken()
    if (!authToken) throw new Error('Non authentifie')

    setCreateLoading(true)
    try {
      await createCampaign(authToken, data)
      setCreateOpen(false)
      await refreshCampaigns()
    } finally {
      setCreateLoading(false)
    }
  }

  function openLaunchModal(campaign: Campaign) {
    setSelectedCampaign(campaign)
    setLaunchOpen(true)
  }

  async function confirmLaunch() {
    if (!selectedCampaign) return
    const authToken = token || getAuthToken()
    if (!authToken) throw new Error('Non authentifie')

    setLaunchingId(selectedCampaign.id)
    try {
      await launchCampaign(authToken, selectedCampaign.id)
      setLaunchOpen(false)
      setSelectedCampaign(null)
      await refreshCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lancement campagne')
    } finally {
      setLaunchingId(null)
    }
  }

  async function handlePause(campaign: Campaign) {
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
          <h1 className="text-2xl font-bold text-gray-900">Campagnes</h1>
          <p className="mt-1 text-sm text-gray-500">
            SMS, appels vocaux et campagnes d&apos;urgence
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={refreshCampaigns}>
            Rafraîchir
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Nouvelle campagne
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <CampaignList
        campaigns={campaigns}
        loading={loading}
        onLaunch={openLaunchModal}
        onPause={handlePause}
        onRefresh={refreshCampaigns}
        launchingId={launchingId}
        pausingId={pausingId}
      />

      <CampaignModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={createLoading}
      />

      <LaunchConfirmModal
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        onConfirm={confirmLaunch}
        campaignName={selectedCampaign?.name || ''}
        recipientCount={selectedCampaign?.stats?.totalMessages}
        loading={launchingId === selectedCampaign?.id}
      />
    </div>
  )
}
