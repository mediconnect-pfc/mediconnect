'use client'

import { useCallback, useState } from 'react'
import { useKPIWebSocket } from '@/hooks/useKPIWebSocket'
import KPIDashboard from '@/components/Analytics/KPIDashboard'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { FileText, Download } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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

async function fetchAnalyticsExport(format: 'csv' | 'pdf', startDate: string, endDate: string) {
  const token = getToken()
  if (!token) throw new Error('Non authentifie')

  const res = await fetch(
    `${API_URL}/analytics/export?format=${format}&dateFrom=${startDate}&dateTo=${endDate}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Erreur export ${format}`)
  }

  downloadBlob(await res.blob(), `analytics-${startDate}-${endDate}.${format}`)
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
  const [patientExporting, setPatientExporting] = useState<'pdf' | 'csv' | null>(null)
  const [patientError, setPatientError] = useState('')

  const handleExportCSV = useCallback(async () => {
    setError('')
    setExporting('csv')
    try {
      await fetchAnalyticsExport('csv', startDate, endDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur export CSV')
    } finally {
      setExporting(null)
    }
  }, [startDate, endDate])

  const handleExportPDF = useCallback(async () => {
    setError('')
    setExporting('pdf')
    try {
      await fetchAnalyticsExport('pdf', startDate, endDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur export PDF')
    } finally {
      setExporting(null)
    }
  }, [startDate, endDate])

  async function handlePatientExport(format: 'pdf' | 'csv') {
    setPatientError('')
    setPatientExporting(format)
    try {
      await exportPatients(format, startDate, endDate)
    } catch (err) {
      setPatientError(err instanceof Error ? err.message : 'Erreur d\'export')
    } finally {
      setPatientExporting(null)
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
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Card>
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-900">Exporter la liste des patients</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="patientStartDate" className="block text-sm font-medium text-gray-700">
                Date debut
              </label>
              <input
                id="patientStartDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label htmlFor="patientEndDate" className="block text-sm font-medium text-gray-700">
                Date fin
              </label>
              <input
                id="patientEndDate"
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
              loading={patientExporting === 'pdf'}
              disabled={!startDate || !endDate}
              onClick={() => handlePatientExport('pdf')}
            >
              Exporter PDF
            </Button>
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              loading={patientExporting === 'csv'}
              disabled={!startDate || !endDate}
              onClick={() => handlePatientExport('csv')}
            >
              Exporter CSV
            </Button>
          </div>

          {patientError && <p className="text-sm text-red-500">{patientError}</p>}
        </div>
      </Card>
    </div>
  )
}
