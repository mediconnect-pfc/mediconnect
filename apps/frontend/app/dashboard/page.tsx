'use client'

import { useAuth } from '@/hooks/useAuth'
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

const stats = [
  { label: 'Total Patients', value: '1 284', change: '+12%', icon: Users, color: 'blue' },
  { label: "RDV Aujourd'hui", value: '18', change: '+3', icon: CalendarCheck, color: 'green' },
  { label: 'Taux Satisfaction', value: '94%', change: '+2%', icon: Smile, color: 'yellow' },
  { label: 'Messages', value: '42', change: '+8', icon: MessageSquare, color: 'purple' },
]

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
    </div>
  )
}
