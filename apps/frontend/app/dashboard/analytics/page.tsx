'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  LineChart as LineChartIcon,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import Button from '@/components/ui/Button'
import { API_URL, getAuthToken } from '@/lib/api'

type KpiMetrics = {
  totalAppointments: number
  confirmationRate: number
  cancellationRate: number
  noShowRate: number
  totalSMSSent: number
  totalCallsMade: number
  totalPatients: number
}

type KpiResponse = {
  period: { startDate: string; endDate: string }
  metrics: KpiMetrics
  timestamp: string
}

type AppointmentSeriesPoint = {
  date: string
  count: number
}

type AppointmentSeriesResponse = {
  period: { startDate: string; endDate: string }
  data: AppointmentSeriesPoint[]
  timestamp: string
}

const COLORS = {
  blue: '#2563eb',
  green: '#16a34a',
  red: '#dc2626',
  orange: '#ea580c',
  purple: '#7c3aed',
  grey: '#9ca3af',
}

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getToday() {
  return toDateInput(new Date())
}

function getThirtyDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return toDateInput(d)
}

function formatDisplayDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function isZeroMetrics(metrics: KpiMetrics | null) {
  if (!metrics) return true
  return (
    metrics.totalAppointments === 0 &&
    metrics.confirmationRate === 0 &&
    metrics.cancellationRate === 0 &&
    metrics.noShowRate === 0 &&
    metrics.totalSMSSent === 0 &&
    metrics.totalCallsMade === 0 &&
    metrics.totalPatients === 0
  )
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Erreur ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Erreur ${res.status}`)
  }

  const blob = await res.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(objectUrl)
}

function LoadingCard() {
  return <div className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: ComponentType<{ size?: number; className?: string }>
  color: keyof typeof COLORS
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: COLORS[color] }}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState(getThirtyDaysAgo)
  const [endDate, setEndDate] = useState(getToday)
  const [kpis, setKpis] = useState<KpiResponse | null>(null)
  const [appointmentsSeries, setAppointmentsSeries] = useState<AppointmentSeriesPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const initialLoadRef = useRef(true)

  const loadDashboard = useCallback(async () => {
    if (!startDate || !endDate) return
    if (startDate > endDate) {
      setError('La date de debut doit etre anterieure a la date de fin')
      setLoading(false)
      setRefreshing(false)
      return
    }

    setError('')
    if (initialLoadRef.current) setLoading(true)
    else setRefreshing(true)

    try {
      const [kpiResponse, seriesResponse] = await Promise.all([
        fetchJson<KpiResponse>(`${API_URL}/analytics/kpis?startDate=${startDate}&endDate=${endDate}`),
        fetchJson<AppointmentSeriesResponse>(`${API_URL}/analytics/appointments/week?startDate=${startDate}&endDate=${endDate}`),
      ])

      setKpis(kpiResponse)
      setAppointmentsSeries(seriesResponse.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des indicateurs')
      setKpis(null)
      setAppointmentsSeries([])
    } finally {
      setLoading(false)
      setRefreshing(false)
      initialLoadRef.current = false
    }
  }, [endDate, startDate])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const pieData = useMemo(() => {
    const metrics = kpis?.metrics
    if (!metrics) return []

    const pending = Math.max(0, 100 - (metrics.confirmationRate + metrics.cancellationRate + metrics.noShowRate))
    return [
      { name: 'Confirmés', value: metrics.confirmationRate, color: COLORS.green },
      { name: 'Annulés', value: metrics.cancellationRate, color: COLORS.red },
      { name: 'No-show', value: metrics.noShowRate, color: COLORS.orange },
      { name: 'En attente', value: pending, color: COLORS.grey },
    ].filter((item) => item.value > 0)
  }, [kpis])

  const hasNoData = !error && isZeroMetrics(kpis?.metrics ?? null)

  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      await downloadFile(
        `${API_URL}/analytics/export?format=${format}&startDate=${startDate}&endDate=${endDate}`,
        `analytics-${startDate}-${endDate}.${format}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : `Erreur export ${format}`)
    } finally {
      setExporting(null)
    }
  }, [endDate, startDate])

  const metrics = kpis?.metrics

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord analytique</h1>
          <p className="text-sm text-gray-500">Indicateurs de performance de votre clinique</p>
          {kpis && (
            <p className="text-xs text-gray-400">
              Dernière mise à jour : {formatDisplayDate(kpis.timestamp)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Date début
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
              className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <Button
            onClick={() => void loadDashboard()}
            loading={refreshing}
            icon={<RefreshCw size={16} />}
            className="h-11"
          >
            Actualiser
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingCard key={index} />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <LoadingCard />
            <LoadingCard />
          </div>
          <LoadingCard />
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                title="Total RDV"
                value={String(metrics?.totalAppointments ?? 0)}
                icon={CalendarDays}
                color="blue"
              />
              <MetricCard
                title="Taux de confirmation"
                value={`${metrics?.confirmationRate ?? 0}%`}
                icon={CheckCircle2}
                color="green"
              />
              <MetricCard
                title="Taux d'annulation"
                value={`${metrics?.cancellationRate ?? 0}%`}
                icon={XCircle}
                color="red"
              />
              <MetricCard
                title="Taux de no-show"
                value={`${metrics?.noShowRate ?? 0}%`}
                icon={Clock3}
                color="orange"
              />
              <MetricCard
                title="SMS envoyés"
                value={String(metrics?.totalSMSSent ?? 0)}
                icon={MessageSquare}
                color="purple"
              />
              <MetricCard
                title="Appels passés"
                value={String(metrics?.totalCallsMade ?? 0)}
                icon={PhoneCall}
                color="blue"
              />
            </div>

            {hasNoData && (
              <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-gray-500 shadow-sm">
                Aucune donnée
              </div>
            )}
          </section>

          {!hasNoData && (
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <LineChartIcon size={18} className="text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Évolution des RDV</h2>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={appointmentsSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                        }}
                        stroke="#6b7280"
                      />
                      <YAxis allowDecimals={false} stroke="#6b7280" />
                      <Tooltip
                        labelFormatter={(label) =>
                          new Date(String(label)).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        }
                        formatter={(value) => [String(value ?? 0), 'RDV']}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={COLORS.blue}
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Répartition des statuts</h2>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        innerRadius={60}
                        paddingAngle={2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value ?? 0}%`, 'Part']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Exports</h2>
                <p className="text-sm text-gray-500">
                  Exportez les indicateurs de la période sélectionnée.
                </p>
              </div>
              <div className="text-xs text-gray-400">
                {startDate} → {endDate}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                icon={<Download size={16} />}
                loading={exporting === 'csv'}
                onClick={() => void handleExport('csv')}
                disabled={!startDate || !endDate}
              >
                Export CSV
              </Button>
              <Button
                icon={<Download size={16} />}
                loading={exporting === 'pdf'}
                onClick={() => void handleExport('pdf')}
                disabled={!startDate || !endDate}
              >
                Export PDF
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-600">
            <p className="font-medium text-gray-800">Lecture des cartes</p>
            <p className="mt-1">
              Les indicateurs suivent l’activité clinique de la période choisie : rendez-vous,
              confirmations, annulations, no-shows, SMS envoyés et appels passés.
              {metrics?.totalPatients ? ` Patients actifs : ${metrics.totalPatients}.` : ''}
            </p>
          </section>
        </>
      )}
    </div>
  )
}
