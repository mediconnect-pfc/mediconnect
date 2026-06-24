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

export interface KpiData {
  activeUsers: number;
  requestsToday: number;
  successRate: number;
  avgResponseTime: number;
  errorCount: number;
  transactionsPerMin: number;
  uptime: number;
  timestamp: string;
}
