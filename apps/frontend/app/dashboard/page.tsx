'use client'

import { useAuth } from '@/hooks/useAuth'
import { useDashboardRealtime } from '@/components/dashboard/DashboardRealtimeProvider'
import { Users, CalendarCheck, Smile, MessageSquare } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const chartData = [
  { month: 'Jan', patients: 120 },
  { month: 'Fév', patients: 145 },
  { month: 'Mar', patients: 110 },
  { month: 'Avr', patients: 170 },
  { month: 'Mai', patients: 135 },
]

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-purple-50 text-purple-600',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { connected, todayCounts, activityFeed } = useDashboardRealtime()

  const stats = [
    { label: 'Total Patients', value: '1 284', change: '+12%', icon: Users, color: 'blue' },
    {
      label: "RDV Aujourd'hui",
      value: String(todayCounts?.total ?? 18),
      change: todayCounts ? `${todayCounts.confirmed} confirmés` : '+3',
      icon: CalendarCheck,
      color: 'green',
    },
    { label: 'Taux Satisfaction', value: '94%', change: '+2%', icon: Smile, color: 'yellow' },
    {
      label: 'Messages',
      value: String(activityFeed.filter((item) => item.type === 'interaction').length || 42),
      change: connected ? 'Live' : 'Hors ligne',
      icon: MessageSquare,
      color: 'purple',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Bienvenue, {user?.name || 'Utilisateur'}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-2 ${colorMap[stat.color]}`}>
                  <Icon size={20} />
                </div>
                <span className="text-sm font-medium text-green-600">
                  {stat.change}
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Nouveaux patients (6 derniers mois)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 13 }} />
            <YAxis tick={{ fontSize: 13 }} />
            <Tooltip />
            <Bar dataKey="patients" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Activité récente</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            connected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {connected ? 'Temps réel' : 'Déconnecté'}
          </span>
        </div>

        {activityFeed.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune activité temps réel pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {activityFeed.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-3">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  item.tone === 'success'
                    ? 'bg-green-500'
                    : item.tone === 'danger'
                      ? 'bg-red-500'
                      : item.tone === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="truncate text-sm text-gray-500">{item.description}</p>
                </div>
                <time className="shrink-0 text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
