'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, Phone, Check, X, Clock, MessageSquare, AlertCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface PortalData {
  patient: { id: string; firstName: string; lastName: string; phone: string }
  nextAppointment: { id: string; doctorName: string; date: string; status: string } | null
  appointments: { id: string; doctorName: string; date: string; status: string }[]
  smsHistory: { id: string; message: string; sentAt: string; type: string }[]
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'En attente', color: '#d97706', bg: '#fef3c7' },
  CONFIRMED: { label: 'Confirmé', color: '#16a34a', bg: '#dcfce7' },
  CANCELLED: { label: 'Annulé', color: '#dc2626', bg: '#fee2e2' },
  COMPLETED: { label: 'Terminé', color: '#0891b2', bg: '#e0f2fe' },
  NO_SHOW: { label: 'No-show', color: '#64748b', bg: '#f1f5f9' },
}

async function parseError(res: Response, fallback: string) {
  try {
    const body = await res.json()
    if (typeof body.message === 'string') return body.message
    if (Array.isArray(body.message)) return body.message.join(', ')
  } catch {
    // ignore
  }
  return fallback
}

function PatientPortalContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  const fetchPortalData = async () => {
    if (!token) {
      setError('Token manquant ou invalide.')
      setLoading(false)
      return
    }

    const res = await fetch(`${API_URL}/patient/portal?token=${encodeURIComponent(token)}`)
    if (!res.ok) {
      throw new Error(await parseError(res, 'Token invalide ou expiré'))
    }
    return res.json() as Promise<PortalData>
  }

  useEffect(() => {
    fetchPortalData()
      .then((portalData) => {
        if (portalData) setData(portalData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Token invalide ou expiré'))
      .finally(() => setLoading(false))
  }, [token])

  const handleAction = async (id: string, action: 'confirm' | 'cancel') => {
    if (!token) return

    try {
      const res = await fetch(
        `${API_URL}/patient/portal/rdv/${id}/${action}?token=${encodeURIComponent(token)}`,
        { method: 'PATCH' },
      )
      if (!res.ok) throw new Error(await parseError(res, 'Erreur'))

      setActionMsg(action === 'confirm' ? 'RDV confirmé.' : 'RDV annulé.')
      const updated = await fetchPortalData()
      if (updated) setData(updated)
      setTimeout(() => setActionMsg(''), 3000)
    } catch {
      setActionMsg('Une erreur est survenue.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-sm text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-600" />
          <h2 className="mb-2 text-lg font-bold text-gray-900">Accès impossible</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="mt-2 text-xs text-gray-400">
            Ce lien est peut-être expiré ou invalide. Contactez votre clinique.
          </p>
        </div>
      </div>
    )
  }

  const { patient, nextAppointment, appointments, smsHistory } = data!

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

        {nextAppointment ? (
          <div className="mb-4 rounded-2xl border bg-white p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Prochain rendez-vous
            </h2>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{nextAppointment.doctorName}</div>
                <div className="mt-1 text-sm text-gray-500">
                  {new Date(nextAppointment.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>

            {nextAppointment.status === 'SCHEDULED' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction(nextAppointment.id, 'confirm')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0f1f3d] px-4 py-3 text-sm font-semibold text-white"
                >
                  <Check size={16} /> Confirmer mon RDV
                </button>
                <button
                  onClick={() => handleAction(nextAppointment.id, 'cancel')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700"
                >
                  <X size={16} /> Annuler
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border bg-white p-5 text-center">
            <Clock size={28} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Aucun rendez-vous à venir</p>
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
              return (
                <div
                  key={apt.id}
                  className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 last:mb-0 last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{apt.doctorName}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(apt.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
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

export default function PatientPortalPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-gray-500">Chargement...</div>}>
      <PatientPortalContent />
    </Suspense>
  )
}
