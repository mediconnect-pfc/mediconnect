'use client'

import { useState, useCallback } from 'react'
import { useKPIWebSocket } from '@/hooks/useKPIWebSocket'
import KPIDashboard from '@/components/Analytics/KPIDashboard'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)

  const { kpis, loading, connected, lastUpdated, refresh } = useKPIWebSocket()

  const handleExportCSV = useCallback(() => {
    if (kpis) downloadCsv(kpis)
  }, [kpis])

  const handleExportPDF = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${API_URL}/analytics/export/pdf?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      )
      if (!res.ok) throw new Error(`PDF export failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rapport-${startDate}-${endDate}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export error:', err)
    }
  }, [startDate, endDate])

  return (
    <KPIDashboard
      kpis={kpis}
      loading={loading}
      connected={connected}
      lastUpdated={lastUpdated}
      onRefresh={refresh}
      onExportCSV={handleExportCSV}
      onExportPDF={handleExportPDF}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
    />
  )
}
