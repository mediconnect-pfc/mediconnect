'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Check, Clock, Copy, Link2, Plus, RefreshCw, X } from 'lucide-react'
import { io } from 'socket.io-client'
import { API_URL, authHeaders, getAuthToken, handleAuthResponse } from '@/lib/api'
import { toast } from '@/components/ui'
import Button from '@/components/ui/Button'

type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

interface Appointment {
  id: string
  doctorId: string
  doctorName: string
  date: string
  status: AppointmentStatus
  patient: { id: string; firstName: string; lastName: string; phone: string }
  portalLink?: string
}

interface PatientOption {
  id: string
  firstName: string
  lastName: string
  phone: string
}

interface DoctorOption {
  id: string
  name: string
}

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  SCHEDULED: { label: 'Planifié', className: 'bg-slate-100 text-slate-700' },
  CONFIRMED: { label: 'Confirmé', className: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Terminé', className: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'Annulé', className: 'bg-red-100 text-red-700' },
  NO_SHOW: { label: 'Absent', className: 'bg-amber-100 text-amber-700' },
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function LoadingRow() {
  return (
    <div className="animate-pulse border-b px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-4 w-14 rounded bg-gray-200" />
          <div>
            <div className="h-4 w-48 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-20 rounded-full bg-gray-200" />
          <div className="h-7 w-20 rounded-full bg-gray-200" />
          <div className="h-7 w-20 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  )
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [filterDoctorId, setFilterDoctorId] = useState('')
  const [filterDate, setFilterDate] = useState(todayValue())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: todayValue(), time: '09:00' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdPortalLink, setCreatedPortalLink] = useState('')
  const [copiedLink, setCopiedLink] = useState('')

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterDoctorId) params.set('doctorId', filterDoctorId)
      if (filterDate) params.set('date', filterDate)

      const res = await handleAuthResponse(await fetch(`${API_URL}/appointments?${params}`, { headers: authHeaders() }))
      if (!res.ok) throw new Error('Erreur chargement RDV')
      setAppointments(await res.json())
    } catch (err) {
      setAppointments([])
      setError(err instanceof Error ? err.message : 'Erreur chargement RDV')
    } finally {
      setLoading(false)
    }
  }, [filterDoctorId, filterDate])

  const fetchOptions = useCallback(async () => {
    try {
      const res = await handleAuthResponse(await fetch(`${API_URL}/appointments/options`, { headers: authHeaders() }))
      if (!res.ok) return
      const data: { patients?: PatientOption[]; doctors?: DoctorOption[] } = await res.json()
      setPatients(data.patients ?? [])
      setDoctors(data.doctors ?? [])
    } catch {
      setPatients([])
      setDoctors([])
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  useEffect(() => {
    if (!API_URL) return
    const token = getAuthToken()
    if (!token) return

    const socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token },
      withCredentials: true,
      reconnection: true,
    })
    socket.on('appointments:updated', fetchAppointments)

    return () => {
      socket.disconnect()
    }
  }, [fetchAppointments])

  const selectedDateLabel = useMemo(() => {
    const value = filterDate ? new Date(`${filterDate}T00:00:00`) : new Date()
    return value.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }, [filterDate])

  async function updateStatus(id: string, action: 'confirm' | 'cancel') {
    setError('')
    const res = await handleAuthResponse(await fetch(`${API_URL}/appointments/${id}/${action}`, {
      method: 'PATCH',
      headers: authHeaders(),
    }))

    if (!res.ok) {
      setError(action === 'confirm' ? 'Erreur confirmation RDV' : 'Erreur annulation RDV')
      return
    }

    toast({
      type: action === 'confirm' ? 'success' : 'warning',
      message: action === 'confirm' ? 'Rendez-vous confirmé' : 'Rendez-vous annulé',
    })
    fetchAppointments()
  }

  async function copyPortalLink(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(link)
      setTimeout(() => setCopiedLink(''), 2000)
    } catch {
      setError('Impossible de copier le lien')
    }
  }

  async function createAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setCreatedPortalLink('')

    try {
      const res = await handleAuthResponse(await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      }))

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Session expirée. Reconnectez-vous.')
      }

      const created: Appointment & { portalLink?: string } = await res.json()
      setShowForm(false)
      setForm({ patientId: '', doctorId: '', date: form.date, time: '09:00' })
      setFilterDate(form.date)
      if (created.portalLink) setCreatedPortalLink(created.portalLink)
      toast({ type: 'success', message: 'Rendez-vous créé avec succès' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création RDV')
    } finally {
      setSaving(false)
    }
  }

  const isEmpty = !loading && appointments.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Planning du Jour</h1>
          <p className="mt-1 text-sm capitalize text-gray-500">{selectedDateLabel}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} /> Nouveau RDV
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-gray-600">Filtrer :</span>
          <select
            value={filterDoctorId}
            onChange={(event) => setFilterDoctorId(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Tous les médecins</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={() => {
              setFilterDoctorId('')
              setFilterDate(todayValue())
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            <RefreshCw size={14} /> Réinitialiser
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={createAppointment} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Créer un RDV</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <select
              required
              value={form.patientId}
              onChange={(event) => setForm((prev) => ({ ...prev, patientId: event.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} - {patient.phone}
                </option>
              ))}
            </select>
            <select
              required
              value={form.doctorId}
              onChange={(event) => setForm((prev) => ({ ...prev, doctorId: event.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Médecin</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
              ))}
            </select>
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <input
              required
              type="time"
              value={form.time}
              onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Création...' : 'Créer le RDV'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {createdPortalLink && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">RDV créé. Lien patient :</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <a
              href={createdPortalLink}
              target="_blank"
              rel="noreferrer"
              className="truncate text-blue-700 underline"
            >
              {createdPortalLink}
            </a>
            <button
              type="button"
              onClick={() => copyPortalLink(createdPortalLink)}
              className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-green-800 ring-1 ring-green-200"
            >
              <Copy size={13} /> Copier
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div>
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingRow key={`loading-row-${index}`} />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-gray-400">
            <Calendar size={32} className="mb-3" />
            <p className="text-gray-500">Aucun rendez-vous aujourd&apos;hui.</p>
            <Button className="mt-4" onClick={() => setShowForm(true)} icon={<Plus size={16} />}>
              Nouveau RDV
            </Button>
          </div>
        ) : (
          appointments.map((appointment, index) => {
            const status = statusConfig[appointment.status]
            const time = new Date(appointment.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={appointment.id}
                className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                  index < appointments.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="flex flex-1 items-center gap-4">
                  <div className="w-14 shrink-0 text-base font-semibold text-[#0f1f3d]">{time}</div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {appointment.doctorName} • {appointment.patient.phone}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  {appointment.portalLink && (
                    <button
                      type="button"
                      onClick={() => copyPortalLink(appointment.portalLink!)}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      title="Copier le lien portail patient"
                    >
                      <Link2 size={13} /> {copiedLink === appointment.portalLink ? 'Copié' : 'Lien patient'}
                    </button>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                  {appointment.status === 'SCHEDULED' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(appointment.id, 'confirm')}
                        className="inline-flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                      >
                        <Check size={13} /> Confirmer
                      </button>
                      <button
                        onClick={() => updateStatus(appointment.id, 'cancel')}
                        className="inline-flex items-center gap-1 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                      >
                        <X size={13} /> Annuler
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
