export interface KpiPeriod {
  startDate: string;
  endDate: string;
}

export interface KpiMetrics {
  totalAppointments: number;
  confirmationRate: number;
  cancellationRate: number;
  noShowRate: number;
  totalSMSSent: number;
  totalCallsMade: number;
  totalPatients: number;
}

export interface KpiResponse {
  period: KpiPeriod;
  metrics: KpiMetrics;
  timestamp: string;
}

export interface AppointmentSeriesPoint {
  date: string;
  count: number;
  confirmed: number;
  cancelled: number;
  noShow: number;
}

export interface AppointmentSeriesResponse {
  period: KpiPeriod;
  data: AppointmentSeriesPoint[];
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
