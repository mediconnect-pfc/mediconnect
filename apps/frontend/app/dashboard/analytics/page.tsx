'use client'

import { useCallback, useState } from 'react'
import { useKPIWebSocket } from '@/hooks/useKPIWebSocket'
import KPIDashboard from '@/components/Analytics/KPIDashboard'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { FileText, Download } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

async function exportPatients(format: 'pdf' | 'csv', startDate: string, endDate: string) {
  const token = getToken()
  if (!token) throw new Error('Non authentifie')

  const res = await fetch(`${API_URL}/patients/export/${format}?startDate=${startDate}&endDate=${endDate}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Erreur export ${format}`)
  }

  downloadBlob(await res.blob(), `patients-${startDate}-${endDate}.${format}`)
}

function downloadCsv(kpis: any) {
  const headers = ['Indicateur', 'Valeur', 'Unite']
  const rows = [
    ['Utilisateurs actifs', kpis.activeUsers, 'utilisateurs'],
    ['Requetes aujourd\'hui', kpis.requestsToday, 'requetes'],
    ['Taux de succes', kpis.successRate, '%'],
    ['Temps de reponse moyen', kpis.avgResponseTime, 'ms'],
    ['Erreurs', kpis.errorCount, 'erreurs'],
    ['Transactions/min', kpis.transactionsPerMin, 'tpm'],
    ['Disponibilite', kpis.uptime, '%'],
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
  const today = new Date().toISOString().slice(0, 10)
  const firstDay = new Date()
  firstDay.setMonth(firstDay.getMonth() - 1)
  const defaultStart = firstDay.toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(today)
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null)
  const [error, setError] = useState('')

  const handleKpiExport = useCallback(() => {
    if (kpis) downloadCsv(kpis)
  }, [kpis])

  async function handleExport(format: 'pdf' | 'csv') {
    setError('')
    setExporting(format)
    try {
      await exportPatients(format, startDate, endDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'export')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-8">
      <KPIDashboard
        kpis={kpis}
        loading={loading}
        connected={connected}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        onExport={handleKpiExport}
      />

      <Card>
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-900">Exporter la liste des patients</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Date debut
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                Date fin
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              icon={<FileText size={16} />}
              loading={exporting === 'pdf'}
              disabled={!startDate || !endDate}
              onClick={() => handleExport('pdf')}
            >
              Exporter PDF
            </Button>
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              loading={exporting === 'csv'}
              disabled={!startDate || !endDate}
              onClick={() => handleExport('csv')}
            >
              Exporter CSV
            </Button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Card>
    </div>
  )
}
