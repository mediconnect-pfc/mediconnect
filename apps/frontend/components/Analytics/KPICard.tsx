'use client'

import { useEffect, useRef } from 'react'

export interface KPICardProps {
  title: string
  value?: number
  unit: string
  status?: 'healthy' | 'warning' | 'critical'
  icon: string
  trend?: number
}

const statusColors = {
  healthy: 'border-l-green-500 bg-green-50',
  warning: 'border-l-yellow-500 bg-yellow-50',
  critical: 'border-l-red-500 bg-red-50',
}

const statusIcons = {
  healthy: '✅',
  warning: '⚠️',
  critical: '❌',
}

export default function KPICard({ title, value, unit, status = 'healthy', icon, trend }: KPICardProps) {
  const prevRef = useRef(value)

  useEffect(() => {
    prevRef.current = value
  }, [value])

  return (
    <div className={`rounded-xl border border-l-4 bg-white p-5 shadow-sm transition-all ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-lg">{statusIcons[status]}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">
        {value !== undefined ? value.toLocaleString() : '—'}
        <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>
      </p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}
