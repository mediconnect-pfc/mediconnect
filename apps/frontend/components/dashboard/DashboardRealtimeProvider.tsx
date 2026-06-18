'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { API_URL, getAuthToken } from '@/lib/api'
import { toast } from '@/components/ui'

type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

interface PatientPayload {
  id: string
  firstName: string
  lastName: string
  phone: string
}

export interface TodayCounts {
  total: number
  scheduled: number
  confirmed: number
  cancelled: number
  completed: number
  noShow: number
}

interface AppointmentEvent {
  appointmentId: string
  establishmentId: string
  status: AppointmentStatus
  action: string
  date: string
  doctorName: string
  patient: PatientPayload
  todayCounts?: TodayCounts
  badge?: { label: string; variant: 'success' | 'danger' | 'info' | 'warning' }
  notification?: { title: string; message: string }
}

interface InteractionEvent {
  interactionId: string
  establishmentId: string
  patient: PatientPayload
  type: 'CALL' | 'SMS'
  direction: string
  transcript: string | null
  intent?: string | null
  createdAt: string
}

export interface ActivityItem {
  id: string
  type: 'appointment' | 'interaction'
  title: string
  description: string
  createdAt: string
  tone: 'success' | 'danger' | 'info' | 'warning'
}

interface DashboardRealtimeState {
  connected: boolean
  notificationCount: number
  todayCounts: TodayCounts | null
  activityFeed: ActivityItem[]
  clearNotifications: () => void
}

const DashboardRealtimeContext = createContext<DashboardRealtimeState | null>(null)

function patientName(patient: PatientPayload) {
  return `${patient.firstName} ${patient.lastName}`.trim()
}

function prependActivity(items: ActivityItem[], item: ActivityItem) {
  return [item, ...items.filter((existing) => existing.id !== item.id)].slice(0, 20)
}

function appointmentActivity(event: AppointmentEvent, tone: ActivityItem['tone']): ActivityItem {
  const name = patientName(event.patient)
  return {
    id: `appointment-${event.appointmentId}-${event.status}-${Date.now()}`,
    type: 'appointment',
    title: event.status === 'CONFIRMED' ? 'Rendez-vous confirmé' : 'Rendez-vous annulé',
    description: `${name} - ${event.doctorName}`,
    createdAt: new Date().toISOString(),
    tone,
  }
}

function interactionActivity(event: InteractionEvent): ActivityItem {
  const name = patientName(event.patient)
  return {
    id: `interaction-${event.interactionId}`,
    type: 'interaction',
    title: event.type === 'CALL' ? 'Nouvel appel' : 'Nouveau SMS',
    description: event.transcript ? `${name}: ${event.transcript}` : name,
    createdAt: event.createdAt,
    tone: 'info',
  }
}

export function DashboardRealtimeProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [todayCounts, setTodayCounts] = useState<TodayCounts | null>(null)
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])

  useEffect(() => {
    const token = getAuthToken()
    if (!API_URL || !token) return

    const socket: Socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('appointment:updated', (event: AppointmentEvent) => {
      if (event.todayCounts) setTodayCounts(event.todayCounts)
    })

    socket.on('appointment:confirmed', (event: AppointmentEvent) => {
      if (event.todayCounts) setTodayCounts(event.todayCounts)
      setNotificationCount((count) => count + 1)
      setActivityFeed((items) => prependActivity(items, appointmentActivity(event, 'success')))
      toast({
        type: 'success',
        message: `${patientName(event.patient)} a confirmé son rendez-vous.`,
      })
    })

    socket.on('appointment:cancelled', (event: AppointmentEvent) => {
      if (event.todayCounts) setTodayCounts(event.todayCounts)
      setNotificationCount((count) => count + 1)
      setActivityFeed((items) => prependActivity(items, appointmentActivity(event, 'danger')))
      toast({
        type: 'warning',
        message: event.notification?.message || `${patientName(event.patient)} a annulé son rendez-vous.`,
      })
    })

    socket.on('interaction:new', (event: InteractionEvent) => {
      setNotificationCount((count) => count + 1)
      setActivityFeed((items) => prependActivity(items, interactionActivity(event)))
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const value = useMemo<DashboardRealtimeState>(
    () => ({
      connected,
      notificationCount,
      todayCounts,
      activityFeed,
      clearNotifications: () => setNotificationCount(0),
    }),
    [activityFeed, connected, notificationCount, todayCounts],
  )

  return (
    <DashboardRealtimeContext.Provider value={value}>
      {children}
    </DashboardRealtimeContext.Provider>
  )
}

export function useDashboardRealtime() {
  const context = useContext(DashboardRealtimeContext)
  if (!context) {
    return {
      connected: false,
      notificationCount: 0,
      todayCounts: null,
      activityFeed: [],
      clearNotifications: () => undefined,
    } satisfies DashboardRealtimeState
  }
  return context
}
