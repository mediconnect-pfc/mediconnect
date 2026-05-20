export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface Patient {
  id: string
  name: string
  phone: string
  email?: string
  birthDate?: string
  address?: string
  doctorId: string
  doctorName?: string
  status: 'ACTIF' | 'PENDING' | 'NO_SHOW'
  lastAppointment?: string
  createdAt: string
  updatedAt: string
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
