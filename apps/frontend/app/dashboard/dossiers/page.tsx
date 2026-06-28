'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, FileText, Plus, Stethoscope } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { API_URL, authHeaders, getAuthToken } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

type PatientSummary = {
  id: string
  firstName: string
  lastName: string
  phone?: string | null
}

type DossierApiItem = {
  id: string
  patientId: string
  medecinId?: string | null
  notes?: string | null
  ordonnance?: string | null
  consultationDate?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  medecin?: {
    id: string
    name?: string | null
    email?: string | null
  } | null
}

type ConsultationItem = {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  doctorName: string
  consultationDate: string
  notes: string
  ordonnance: string
  isMine: boolean
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}

function snippet(value: string, max = 180) {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned) return '—'
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="h-4 w-40 rounded bg-gray-200" />
      <div className="mt-3 h-6 w-64 rounded bg-gray-100" />
      <div className="mt-4 h-4 w-full rounded bg-gray-100" />
      <div className="mt-2 h-4 w-5/6 rounded bg-gray-100" />
      <div className="mt-5 h-9 w-28 rounded-lg bg-gray-200" />
    </div>
  )
}

export default function ConsultationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [consultations, setConsultations] = useState<ConsultationItem[]>([])

  const loadConsultations = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setError('Session expirée')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const patientsRes = await fetch(`${API_URL}/patients?limit=1000&page=1`, {
        headers: authHeaders(),
      })

      if (!patientsRes.ok) {
        throw new Error('Impossible de charger les patients')
      }

      const patientsJson = await patientsRes.json().catch(() => null)
      const patients = asArray<PatientSummary>(patientsJson?.data ?? patientsJson)

      const dossierResponses = await Promise.allSettled(
        patients.map(async (patient) => {
          const res = await fetch(`${API_URL}/dossiers/patient/${patient.id}`, {
            headers: authHeaders(),
          })

          if (!res.ok) return [] as DossierApiItem[]

          const data = await res.json().catch(() => [])
          return asArray<DossierApiItem>(data)
        }),
      )

      const items: ConsultationItem[] = dossierResponses.flatMap((result, patientIndex) => {
        const patient = patients[patientIndex]
        if (!patient || result.status !== 'fulfilled') return []

        return result.value.map((record) => {
          const consultationDate = record.consultationDate ?? record.createdAt ?? new Date().toISOString()
          const doctorName = record.medecin?.name || record.medecin?.email || 'Médecin'
          const fullName = `${patient.firstName} ${patient.lastName}`.trim()

          return {
            id: record.id,
            patientId: patient.id,
            patientName: fullName,
            patientPhone: patient.phone || '—',
            doctorName,
            consultationDate,
            notes: record.notes || '',
            ordonnance: record.ordonnance || '',
            isMine: Boolean(user?.role === 'DOCTOR' && user?.id && record.medecinId === user.id),
          }
        })
      })

      items.sort((a, b) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime())
      setConsultations(items.slice(0, 20))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des consultations')
      setConsultations([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    void loadConsultations()
  }, [loadConsultations])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Consultations</h1>
          <p className="mt-1 text-sm text-gray-500">Historique des consultations médicales et ordonnances</p>
        </div>

        <Link
          href="/dashboard/dossiers/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Nouvelle consultation
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : consultations.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <FileText size={22} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Aucune consultation</h2>
          <p className="mt-1 text-sm text-gray-500">Créez votre première consultation pour remplir cet historique.</p>
          <div className="mt-6">
            <Link
              href="/dashboard/dossiers/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus size={16} />
              Nouvelle consultation
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((item) => (
            <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Stethoscope size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        {item.patientName}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(item.consultationDate)} · {item.doctorName}
                      </p>
                    </div>
                    {item.isMine && <Badge variant="success">Créé par vous</Badge>}
                    {item.ordonnance && <Badge variant="info">Ordonnance</Badge>}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Notes</p>
                      <p className="mt-2 text-sm leading-6 text-gray-700">{snippet(item.notes || 'Aucune note')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Ordonnance</p>
                      <p className="mt-2 text-sm leading-6 text-gray-700">{snippet(item.ordonnance || 'Aucune ordonnance')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                  <Link
                    href={`/dashboard/patients/${item.patientId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Voir le patient <ArrowRight size={16} />
                  </Link>
                  <div className="text-xs text-gray-500">Tél. {item.patientPhone}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
