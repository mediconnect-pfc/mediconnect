export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  slot: string
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  confirmation: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  notes?: string | null
}

export interface Interaction {
  id: string
  patientId: string
  type: 'CALL' | 'SMS'
  direction: 'INBOUND' | 'OUTBOUND'
  transcript?: string | null
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null
  intent?: string | null
  duration?: number | null
  createdAt: string
}

export interface Patient {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string | null
  birthDate?: string | null
  address?: string | null
  doctorId?: string
  doctorName?: string
  tags?: string[]
  status?: string
  lastAppointment?: string | null
  portalToken?: string | null
  portalTokenExpiry?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  interactions?: Interaction[]
  appointments?: Appointment[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
}
