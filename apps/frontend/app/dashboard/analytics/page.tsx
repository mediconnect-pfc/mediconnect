'use client'

import { useCallback } from 'react'
import { useKPIWebSocket } from '@/hooks/useKPIWebSocket'
import KPIDashboard from '@/components/Analytics/KPIDashboard'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

function downloadCsv(kpis: any) {
  const headers = ['Indicateur', 'Valeur', 'Unité']
  const rows = [
    ['Utilisateurs actifs', kpis.activeUsers, 'utilisateurs'],
    ['Requêtes aujourd\'hui', kpis.requestsToday, 'requêtes'],
    ['Taux de succès', kpis.successRate, '%'],
    ['Temps de réponse moyen', kpis.avgResponseTime, 'ms'],
    ['Erreurs', kpis.errorCount, 'erreurs'],
    ['Transactions/min', kpis.transactionsPerMin, 'tpm'],
    ['Disponibilité', kpis.uptime, '%'],
  ]
  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kpis-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AnalyticsPage() {
  const { kpis, loading, connected, lastUpdated, refresh } = useKPIWebSocket()

  const handleExport = useCallback(() => {
    if (kpis) downloadCsv(kpis)
  }, [kpis])

  return (
    <KPIDashboard
      kpis={kpis}
      loading={loading}
      connected={connected}
      lastUpdated={lastUpdated}
      onRefresh={refresh}
      onExport={handleExport}
    />
  )
}
