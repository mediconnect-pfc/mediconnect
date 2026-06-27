'use client'

import { useState } from 'react'
import KPICard from './KPICard'
import Button from '@/components/ui/Button'
import { RefreshCw, Download, Settings, BarChart3 } from 'lucide-react'
import type { KpiData } from '@/hooks/useKPIWebSocket'

interface KPIDashboardProps {
  kpis: KpiData | null
  loading: boolean
  connected: boolean
  lastUpdated: string | null
  onRefresh: () => void
  onExport: () => void
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 5) return 'à l\'instant'
  if (sec < 60) return `il y a ${sec}s`
  return `il y a ${Math.floor(sec / 60)}min`
}

const kpiConfig: { key: keyof KpiData; title: string; unit: string; icon: string; healthy: (v: number) => boolean; warning: (v: number) => boolean }[] = [
  { key: 'activeUsers', title: 'Utilisateurs actifs', unit: 'utilisateurs', icon: '👥', healthy: v => v > 50, warning: v => v > 10 },
  { key: 'requestsToday', title: 'Requêtes aujourd\'hui', unit: 'requêtes', icon: '📨', healthy: () => true, warning: () => false },
  { key: 'successRate', title: 'Taux de succès', unit: '%', icon: '✅', healthy: v => v >= 99, warning: v => v >= 95 },
  { key: 'avgResponseTime', title: 'Temps de réponse moyen', unit: 'ms', icon: '⚡', healthy: v => v < 300, warning: v => v < 500 },
  { key: 'errorCount', title: 'Erreurs', unit: 'erreurs', icon: '❌', healthy: v => v === 0, warning: v => v < 10 },
  { key: 'transactionsPerMin', title: 'Transactions/min', unit: 'tpm', icon: '💳', healthy: v => v > 100, warning: v => v > 30 },
  { key: 'uptime', title: 'Disponibilité', unit: '%', icon: '⏱️', healthy: v => v >= 99.9, warning: v => v >= 99 },
]

export default function KPIDashboard({ kpis, loading, connected, lastUpdated, onRefresh, onExport }: KPIDashboardProps) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPIs en temps réel</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            <span className={`flex items-center gap-1 ${connected ? 'text-green-600' : 'text-red-500'}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              {connected ? 'Connecté' : 'Déconnecté'}
            </span>
            {lastUpdated && <span>Dernière mise à jour : {timeAgo(lastUpdated)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={onRefresh} loading={loading}>
            Actualiser
          </Button>
          <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={onExport}>
            Export CSV
          </Button>
          <Button variant="ghost" size="sm" icon={<Settings size={16} />} onClick={() => setShowSettings(!showSettings)}>
            Paramètres
          </Button>
          <Button variant="ghost" size="sm" icon={<BarChart3 size={16} />}>
            Détails
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-xl border bg-blue-50 p-4 text-sm text-blue-700">
          Les KPIs sont automatiquement mis à jour toutes les 5 secondes via WebSocket.
          Utilisez le bouton Actualiser pour une mise à jour manuelle.
        </div>
      )}

      {/* Loading */}
      {loading && !kpis && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {/* KPI Grid */}
      {kpis && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {kpiConfig.map((cfg) => {
            const val = kpis[cfg.key] as number
            return (
              <KPICard
                key={cfg.key}
                title={cfg.title}
                value={val}
                unit={cfg.unit}
                status={cfg.healthy(val) ? 'healthy' : cfg.warning(val) ? 'warning' : 'critical'}
                icon={cfg.icon}
              />
            )
          })}
        </div>
      )}

      {/* No data */}
      {!loading && !kpis && (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-500">
          En attente des données... Assurez-vous d'être connecté.
        </div>
      )}
    </div>
  )
}
