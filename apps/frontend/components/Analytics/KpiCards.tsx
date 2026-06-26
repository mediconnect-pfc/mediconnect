'use client'

import KPICard from './KPICard'

interface Metrics {
  totalAppointments: number
  confirmationRate: number
  cancellationRate: number
  totalSMSSent: number
}

export default function KpiCards({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Rendez-vous"
        value={metrics.totalAppointments}
        unit="rdv"
        status="healthy"
        icon="📅"
      />
      <KPICard
        title="Taux de Confirmation"
        value={metrics.confirmationRate}
        unit="%"
        status={metrics.confirmationRate >= 80 ? 'healthy' : metrics.confirmationRate >= 60 ? 'warning' : 'critical'}
        icon="✅"
      />
      <KPICard
        title="Taux d'Annulation"
        value={metrics.cancellationRate}
        unit="%"
        status={metrics.cancellationRate <= 10 ? 'healthy' : metrics.cancellationRate <= 20 ? 'warning' : 'critical'}
        icon="❌"
      />
      <KPICard
        title="SMS Envoyés"
        value={metrics.totalSMSSent}
        unit="sms"
        status="healthy"
        icon="📨"
      />
    </div>
  )
}
