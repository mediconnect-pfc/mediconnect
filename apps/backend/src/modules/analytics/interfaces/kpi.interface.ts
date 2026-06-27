export interface KpiPeriod {
  startDate: string;
  endDate: string;
}

export interface KpiMetrics {
  totalAppointments: number;
  confirmationRate: number;
  cancellationRate: number;
  totalSMSSent: number;
}

export interface KpiResponse {
  period: KpiPeriod;
  metrics: KpiMetrics;
  timestamp: string;
}
