export interface User {
  id: string
  name: string
  email: string
  role: string
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
}

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  date: string
  motif: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
}

export interface Interaction {
  id: string
  patientId: string
  type: 'CALL' | 'MESSAGE' | 'NOTE'
  content: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
}
