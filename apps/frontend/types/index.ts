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

/* ── FE-008 Timeline types ── */

export interface InteractionData {
  id: string
  type: 'CALL' | 'SMS'
  direction: 'OUTBOUND' | 'INBOUND'
  duration?: number
  intent: 'confirmed' | 'cancelled' | 'no_response' | 'unreachable'
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  transcript?: string
  createdAt: string
}

export interface AppointmentData {
  id: string
  status: 'confirmed' | 'cancelled' | 'pending' | 'no_show'
  doctorName: string
  specialty: string
  dateTime: string
  source: 'manual' | 'call' | 'portal'
}

export interface MedicalRecordData {
  id: string
  doctorName: string
  date: string
  notes?: string
  prescriptions?: string
}

export interface TimelineItem {
  id: string
  type: 'interaction' | 'appointment' | 'medical_record'
  timestamp: string
  data: InteractionData | AppointmentData | MedicalRecordData
}

export type CampaignType = 'SMS' | 'VOICE' | 'EMERGENCY'
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED'
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'

export interface CampaignStats {
  totalMessages: number
  sent: number
  delivered: number
  failed: number
}

export interface Campaign {
  id: string
  establishmentId: string
  name: string
  type: CampaignType
  status: CampaignStatus
  segment?: string | null
  message?: string | null
  flowId?: string | null
  scheduledAt?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  stats?: CampaignStats
}

export interface CampaignDetailResponse {
  campaign: Campaign
  stats: CampaignStats
}
