'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, CheckCircle2, Circle, Clock3, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardRealtime } from '@/components/dashboard/DashboardRealtimeProvider'
import Badge from '@/components/ui/Badge'
import { API_URL, authHeaders, handleAuthResponse } from '@/lib/api'

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

type AppointmentToday = {
  id: string
  doctorName: string
  date: string
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  source?: string
  patient: { id: string; firstName: string; lastName: string; phone: string }
}

type AppointmentSeriesPoint = {
  date: string
  count: number
  confirmed?: number
  cancelled?: number
  noShow?: number
}

type AppointmentSeriesResponse = {
  period: { startDate: string; endDate: string }
  data: AppointmentSeriesPoint[]
  timestamp: string
}

type PatientResponse = {
  total: number
}

const KPI_COLORS = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
}

const CHART_COLORS = {
  confirmed: '#16a34a',
  cancelled: '#dc2626',
  noShow: '#ea580c',
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

function getSevenDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return toDateInput(d)
}

function getRelativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.max(1, Math.round(diff / 60000))
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  return `il y a ${days} j`
}

function formatTime(value: string) {
  const date = new Date(value)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
}

function statusBadge(status: AppointmentToday['status']) {
  switch (status) {
    case 'CONFIRMED':
      return <Badge variant="success">Confirmé</Badge>
    case 'CANCELLED':
      return <Badge variant="danger">Annulé</Badge>
    case 'NO_SHOW':
      return <Badge variant="warning">Absent</Badge>
    case 'COMPLETED':
      return <Badge variant="info">Terminé</Badge>
    default:
      return <Badge variant="info">Planifié</Badge>
  }
}

function LoadingCard() {
  return <div className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
}

function LoadingPanel({ className = '' }: { className?: string }) {
  return <div className={`h-[360px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 ${className}`} />
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await handleAuthResponse(await fetch(url, { headers: authHeaders() }))
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Erreur ${res.status}`)
  }
  return res.json() as Promise<T>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { connected, activityFeed, todayCounts } = useDashboardRealtime()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kpis, setKpis] = useState<KpiMetrics | null>(null)
  const [todayAppointments, setTodayAppointments] = useState<AppointmentToday[]>([])
  const [totalPatients, setTotalPatients] = useState(0)
  const [weekSeries, setWeekSeries] = useState<AppointmentSeriesPoint[]>([])

  const today = useMemo(() => getToday(), [])
  const weekStart = useMemo(() => getSevenDaysAgo(), [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [kpiResponse, appointmentsResponse, patientsResponse, weekResponse] = await Promise.all([
        fetchJson<KpiResponse>(`${API_URL}/analytics/kpis?startDate=${today}&endDate=${today}`),
        fetchJson<AppointmentToday[]>(`${API_URL}/appointments/today`),
        fetchJson<PatientResponse>(`${API_URL}/patients?limit=1&page=1`),
        fetchJson<AppointmentSeriesResponse>(`${API_URL}/analytics/appointments/week?startDate=${weekStart}&endDate=${today}`),
      ])

      setKpis(kpiResponse.metrics)
      setTodayAppointments(appointmentsResponse ?? [])
      setTotalPatients(patientsResponse?.total ?? 0)
      setWeekSeries(weekResponse.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement du tableau de bord')
      setKpis(null)
      setTodayAppointments([])
      setWeekSeries([])
    } finally {
      setLoading(false)
    }
  }, [today, weekStart])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const chartData = useMemo(
    () =>
      weekSeries.map((point) => ({
        day: formatDay(point.date),
        confirmed: point.confirmed ?? 0,
        cancelled: point.cancelled ?? 0,
        noShow: point.noShow ?? 0,
      })),
    [weekSeries],
  )

  const recentActivity = useMemo(() => activityFeed.slice(0, 10), [activityFeed])

  const stats = [
    {
      label: "RDV Aujourd'hui",
      value: String(kpis?.totalAppointments ?? 0),
      delta: todayCounts ? `${todayCounts.confirmed} confirmés` : 'Données en temps réel',
      icon: CalendarCheck,
      color: 'blue' as const,
    },
    {
      label: 'Confirmés',
      value: `${kpis?.confirmationRate ?? 0}%`,
      delta: 'Taux de confirmation',
      icon: CheckCircle2,
      color: 'green' as const,
    },
    {
      label: 'Annulés',
      value: `${kpis?.cancellationRate ?? 0}%`,
      delta: 'Taux d’annulation',
      icon: Clock3,
      color: 'red' as const,
    },
    {
      label: 'Patients total',
      value: String(totalPatients),
      delta: 'Total actifs',
      icon: Users,
      color: 'purple' as const,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          Bienvenue, {user?.name || 'Utilisateur'}
        </h1>
        <p className="text-sm text-gray-500">Dashboard principal de votre clinique</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <LoadingCard key={index} />)
          : stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className={`rounded-lg p-2 ${KPI_COLORS[stat.color]}`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-sm font-medium text-gray-500">{stat.delta}</span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              )
            })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">RDV du jour</h2>
              <p className="text-sm text-gray-500">Jusqu&apos;à 5 rendez-vous affichés</p>
            </div>
            <Link href="/dashboard/appointments" className="text-sm font-medium text-blue-700 hover:text-blue-800">
              Voir tout
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center text-gray-500">
              Aucun rendez-vous aujourd&apos;hui.
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 text-sm font-semibold text-gray-900">
                      {formatTime(appointment.date)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {appointment.patient.firstName} {appointment.patient.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {appointment.doctorName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge variant="info">{appointment.source === 'ai' ? '🤖 IA' : appointment.source || 'Manuel'}</Badge>
                    {statusBadge(appointment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Activité temps réel</h2>
              <p className="text-sm text-gray-500">Derniers événements reçus</p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                connected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Circle size={8} className={connected ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'} />
              {connected ? 'Connecté' : 'Déconnecté'}
            </span>
          </div>

          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center text-gray-500">
              Aucune activité pour le moment
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-xl border px-4 py-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ${
                      item.tone === 'success'
                        ? 'bg-green-500'
                        : item.tone === 'danger'
                          ? 'bg-red-500'
                          : item.tone === 'warning'
                            ? 'bg-orange-500'
                            : 'bg-blue-500'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <span className="shrink-0 text-xs text-gray-400">{getRelativeTime(item.createdAt)}</span>
                    </div>
                    {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">RDV cette semaine</h2>
            <p className="text-sm text-gray-500">Confirmés, annulés et no-show par jour</p>
          </div>
        </div>

        {loading ? (
          <LoadingPanel />
        ) : chartData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center text-gray-500">
            Aucune donnée pour la période sélectionnée
          </div>
        ) : (
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="confirmed" name="Confirmés" fill={CHART_COLORS.confirmed} radius={[6, 6, 0, 0]} />
                <Bar dataKey="cancelled" name="Annulés" fill={CHART_COLORS.cancelled} radius={[6, 6, 0, 0]} />
                <Bar dataKey="noShow" name="No-show" fill={CHART_COLORS.noShow} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
