'use client'

import { useState } from 'react'
import { AlertCircle, Calendar, Check, Clock, MessageSquare, Phone, X } from 'lucide-react'

const PATIENT_PORTAL_API = '/api/patient/portal'

export interface PortalData {
  patient: { id: string; firstName: string; lastName: string; phone: string }
  currentAppointment: { id: string; doctorName: string; date: string; status: string } | null
  nextAppointment: { id: string; doctorName: string; date: string; status: string } | null
  appointments: { id: string; doctorName: string; date: string; status: string }[]
  smsHistory: { id: string; message: string; sentAt: string; type: string }[]
}

type PatientPortalClientProps = {
  token: string
  initialData: PortalData | null
  initialError: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'En attente', color: '#d97706', bg: '#fef3c7' },
  CONFIRMED: { label: 'Confirme', color: '#16a34a', bg: '#dcfce7' },
  CANCELLED: { label: 'Annule', color: '#dc2626', bg: '#fee2e2' },
  COMPLETED: { label: 'Termine', color: '#0891b2', bg: '#e0f2fe' },
  NO_SHOW: { label: 'No-show', color: '#64748b', bg: '#f1f5f9' },
}

function isUpcoming(date: string) {
  return new Date(date) > new Date()
}

function canPatientAct(status: string, date: string) {
  return status === 'SCHEDULED' && isUpcoming(date)
}

function actionUrl(id: string, action: 'confirm' | 'cancel', token: string) {
  return `${PATIENT_PORTAL_API}/rdv/${id}/${action}?t=${encodeURIComponent(token)}`
}

async function parseError(res: Response, fallback: string) {
  try {
    const body = await res.json()
    if (typeof body.message === 'string') return body.message
    if (Array.isArray(body.message)) return body.message.join(', ')
  } catch {
    // ignore malformed error bodies
  }
  return fallback
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

export default function PatientPortalClient({
  token,
  initialData,
  initialError,
}: PatientPortalClientProps) {
  const [data, setData] = useState<PortalData | null>(initialData)
  const [error, setError] = useState(initialError)
  const [actionMsg, setActionMsg] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPortalData = async () => {
    if (!token) {
      setError('Token manquant ou invalide.')
      return null
    }

    const res = await fetchWithTimeout(`${PATIENT_PORTAL_API}?t=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      throw new Error(await parseError(res, 'Token invalide ou expire'))
    }
    return res.json() as Promise<PortalData>
  }

  const handleAction = async (id: string, action: 'confirm' | 'cancel') => {
    if (!token || actionLoading) return

    setActionLoading(true)
    try {
      const res = await fetchWithTimeout(
        `${PATIENT_PORTAL_API}/rdv/${id}/${action}?t=${encodeURIComponent(token)}`,
        { method: 'PATCH' },
      )
      if (!res.ok) throw new Error(await parseError(res, 'Erreur'))

      const nextStatus = action === 'confirm' ? 'CONFIRMED' : 'CANCELLED'
      setData((prev) => {
        if (!prev) return prev
        const patchAppointment = (apt: { id: string; doctorName: string; date: string; status: string }) =>
          apt.id === id ? { ...apt, status: nextStatus } : apt

        return {
          ...prev,
          currentAppointment: prev.currentAppointment ? patchAppointment(prev.currentAppointment) : prev.currentAppointment,
          nextAppointment: prev.nextAppointment ? patchAppointment(prev.nextAppointment) : prev.nextAppointment,
          appointments: prev.appointments.map(patchAppointment),
        }
      })
      setActionMsg(action === 'confirm' ? 'RDV confirme.' : 'RDV annule.')
      const updated = await fetchPortalData()
      if (updated) setData(updated)
      setTimeout(() => setActionMsg(''), 3000)
    } catch {
      setActionMsg('Une erreur est survenue.')
    } finally {
      setActionLoading(false)
    }
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-sm text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-600" />
          <h2 className="mb-2 text-lg font-bold text-gray-900">Acces impossible</h2>
          <p className="text-sm text-gray-500">{error || 'Token invalide ou expire'}</p>
          <p className="mt-2 text-xs text-gray-400">
            Ce lien est peut-etre expire ou invalide. Contactez votre clinique.
          </p>
        </div>
      </div>
    )
  }

  const { patient, currentAppointment, nextAppointment, appointments, smsHistory } = data
  const mainAppointment = currentAppointment ?? nextAppointment
  const mainAppointmentActionable = mainAppointment?.status === 'SCHEDULED'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-3 bg-[#0f1f3d] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <span className="font-bold text-white">M</span>
        </div>
        <span className="text-base font-semibold text-white">MediConnect</span>
      </div>

      <div className="mx-auto max-w-md px-4 py-5">
        {actionMsg && (
          <div className="mb-4 rounded-lg border bg-white px-4 py-3 text-center text-sm font-medium text-gray-800">
            {actionMsg}
          </div>
        )}

        <div className="mb-4 rounded-2xl bg-[#0f1f3d] p-5 text-white">
          <p className="mb-1 text-sm opacity-70">Bonjour,</p>
          <h1 className="text-2xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm opacity-70">
            <Phone size={14} />
            <span>{patient.phone}</span>
          </div>
        </div>

        {mainAppointment ? (
          <div className="mb-4 rounded-2xl border bg-white p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Rendez-vous du lien
            </h2>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{mainAppointment.doctorName}</div>
                <div className="mt-1 text-sm text-gray-500">
                  {new Date(mainAppointment.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <span
                className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: STATUS_LABELS[mainAppointment.status]?.bg ?? '#f1f5f9',
                  color: STATUS_LABELS[mainAppointment.status]?.color ?? '#64748b',
                }}
              >
                {STATUS_LABELS[mainAppointment.status]?.label ?? mainAppointment.status}
              </span>
            </div>

            {mainAppointmentActionable ? (
              <div className="flex gap-3">
                <form
                  action={actionUrl(mainAppointment.id, 'confirm', token)}
                  method="post"
                  className="flex flex-1"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleAction(mainAppointment.id, 'confirm')
                  }}
                >
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f1f3d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Check size={16} /> Confirmer mon RDV
                  </button>
                </form>
                <form
                  action={actionUrl(mainAppointment.id, 'cancel', token)}
                  method="post"
                  className="flex flex-1"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleAction(mainAppointment.id, 'cancel')
                  }}
                >
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                  >
                    <X size={16} /> Annuler
                  </button>
                </form>
              </div>
            ) : mainAppointment.status === 'CONFIRMED' ? (
              <p className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
                Ce rendez-vous est deja confirme.
              </p>
            ) : mainAppointment.status === 'CANCELLED' ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
                Ce rendez-vous est annule.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border bg-white p-5 text-center">
            <Clock size={28} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Aucun rendez-vous a venir</p>
          </div>
        )}

        <div className="mb-4 rounded-2xl border bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Historique des RDV
          </h2>
          {appointments.length === 0 ? (
            <p className="text-center text-sm text-gray-400">Aucun historique</p>
          ) : (
            appointments.map((apt) => {
              const status = STATUS_LABELS[apt.status] ?? STATUS_LABELS.SCHEDULED
              const showActions = canPatientAct(apt.status, apt.date) && apt.id !== currentAppointment?.id
              return (
                <div
                  key={apt.id}
                  className="mb-3 border-b border-gray-100 pb-3 last:mb-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{apt.doctorName}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {new Date(apt.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                  {showActions && (
                    <div className="mt-3 flex gap-2">
                      <form
                        action={actionUrl(apt.id, 'confirm', token)}
                        method="post"
                        className="flex flex-1"
                        onSubmit={(event) => {
                          event.preventDefault()
                          void handleAction(apt.id, 'confirm')
                        }}
                      >
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#0f1f3d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          <Check size={13} /> Confirmer
                        </button>
                      </form>
                      <form
                        action={actionUrl(apt.id, 'cancel', token)}
                        method="post"
                        className="flex flex-1"
                        onSubmit={(event) => {
                          event.preventDefault()
                          void handleAction(apt.id, 'cancel')
                        }}
                      >
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="flex w-full items-center justify-center gap-1 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                        >
                          <X size={13} /> Annuler
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {smsHistory.length > 0 && (
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Historique SMS &amp; appels
            </h2>
            {smsHistory.map((item) => {
              const Icon = item.type === 'CALL' ? Phone : MessageSquare
              return (
                <div
                  key={item.id}
                  className="mb-3 flex gap-3 border-b border-gray-100 pb-3 last:mb-0 last:border-b-0 last:pb-0"
                >
                  <Icon size={15} className="mt-0.5 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-800">{item.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(item.sentAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
