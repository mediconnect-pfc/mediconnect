'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Phone, Mail, Calendar, MapPin } from 'lucide-react'
import { usePatients } from '@/hooks/usePatients'
import PatientModal from '@/components/patients/PatientModal'
import Timeline from '@/components/patients/Timeline'
import TimelineSkeleton from '@/components/patients/TimelineSkeleton'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Patient, TimelineItem, InteractionData, AppointmentData, MedicalRecordData } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIF: 'success',
  PENDING: 'warning',
  NO_SHOW: 'danger',
}

const MOCK_INTERACTIONS: InteractionData[] = [
  { id: 'i1', type: 'CALL', direction: 'OUTBOUND', duration: 45, intent: 'confirmed', sentiment: 'POSITIVE', transcript: 'Patient a confirme le rendez-vous de suivi pour demain a 14h. Il se dit satisfait du traitement.', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'i2', type: 'SMS', direction: 'OUTBOUND', intent: 'confirmed', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'i3', type: 'CALL', direction: 'INBOUND', duration: 120, intent: 'cancelled', sentiment: 'NEGATIVE', transcript: 'Patient annule le rendez-vous pour raison familiale. A recontacter pour reprogrammer.', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'i4', type: 'CALL', direction: 'OUTBOUND', duration: 30, intent: 'no_response', sentiment: 'NEUTRAL', transcript: 'Appel sans reponse. Boite vocale laissee.', createdAt: new Date(Date.now() - 172800000).toISOString() },
]

const MOCK_APPOINTMENTS: AppointmentData[] = [
  { id: 'a1', status: 'confirmed', doctorName: 'Dr. Benali', specialty: 'Cardiologie', dateTime: new Date(Date.now() + 86400000).toISOString(), source: 'call' },
  { id: 'a2', status: 'confirmed', doctorName: 'Dr. Alaoui', specialty: 'Medecine generale', dateTime: new Date(Date.now() - 604800000).toISOString(), source: 'manual' },
  { id: 'a3', status: 'cancelled', doctorName: 'Dr. Benali', specialty: 'Cardiologie', dateTime: new Date(Date.now() - 1209600000).toISOString(), source: 'portal' },
]

const MOCK_RECORDS: MedicalRecordData[] = [
  { id: 'r1', doctorName: 'Dr. Benali', date: new Date(Date.now() - 86400000).toISOString(), notes: 'Tension arterielle stable : 12/8. Patient en bonne sante generale. Poursuite du traitement antihypertenseur.', prescriptions: 'Amlodipine 5mg - 1 comprime/jour\nEnalapril 10mg - 1 comprime/jour' },
  { id: 'r2', doctorName: 'Dr. Alaoui', date: new Date(Date.now() - 604800000).toISOString(), notes: 'Consultation de routine. Bilan sanguin recommande.' },
]

function buildTimeline(
  interactions: InteractionData[],
  appointments: AppointmentData[],
  records: MedicalRecordData[],
): TimelineItem[] {
  return [
    ...interactions.map((d) => ({ id: `int-${d.id}`, type: 'interaction' as const, timestamp: d.createdAt, data: d })),
    ...appointments.map((d) => ({ id: `apt-${d.id}`, type: 'appointment' as const, timestamp: d.dateTime, data: d })),
    ...records.map((d) => ({ id: `rec-${d.id}`, type: 'medical_record' as const, timestamp: d.date, data: d })),
  ]
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { getPatient, updatePatient, deletePatient } = usePatients()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [timelineLoading, setTimelineLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)

  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`

      let interactions: InteractionData[] = []
      let appointments: AppointmentData[] = []
      let records: MedicalRecordData[] = []

      try {
        const res = await fetch(`${API_URL}/patients/${id}/interactions`, { headers })
        if (res.ok) interactions = await res.json()
      } catch {
        interactions = []
      }
      if (interactions.length === 0) interactions = MOCK_INTERACTIONS

      try {
        const res = await fetch(`${API_URL}/patients/${id}/appointments`, { headers })
        if (res.ok) appointments = await res.json()
      } catch {
        appointments = []
      }
      if (appointments.length === 0) appointments = MOCK_APPOINTMENTS

      try {
        const res = await fetch(`${API_URL}/dossiers/patient/${id}`, { headers })
        if (res.ok) records = await res.json()
      } catch {
        records = []
      }
      if (records.length === 0) records = MOCK_RECORDS

      setTimelineItems(buildTimeline(interactions, appointments, records))
    } finally {
      setTimelineLoading(false)
    }
  }, [id])

  useEffect(() => {
    getPatient(id).then((p) => {
      setPatient(p)
      setLoading(false)
    })
    fetchTimeline()
  }, [id, getPatient, fetchTimeline])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const ws = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/patients/${id}/interactions`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const interaction: InteractionData = JSON.parse(event.data)
        setTimelineItems((prev) => buildTimeline([interaction, ...prev.filter((t) => t.type === 'interaction').map((t) => t.data as InteractionData)], prev.filter((t) => t.type === 'appointment').map((t) => t.data as AppointmentData), prev.filter((t) => t.type === 'medical_record').map((t) => t.data as MedicalRecordData)))
      } catch {
        // ignore invalid payloads
      }
    }

    return () => ws.close()
  }, [id])

  async function handleEdit(data: { firstName: string; lastName: string; phone: string; email: string; birthDate: string; address: string }) {
    const { error } = await updatePatient(id, data)
    if (error) return error
    const updated = await getPatient(id)
    if (updated) setPatient(updated)
  }

  async function handleDelete() {
    const ok = await deletePatient(id)
    if (ok) router.push('/dashboard/patients')
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500">Chargement...</div>
  }

  if (!patient) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Patient introuvable</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push('/dashboard/patients')}>
          Retour a la liste
        </Button>
      </div>
    )
  }

  const fullName = `${patient.firstName} ${patient.lastName}`

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/dashboard/patients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Retour aux patients
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
            {patient.firstName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            <Badge variant={statusVariant[patient.status || 'ACTIF']}>
              {patient.status === 'ACTIF' ? 'Actif' : patient.status === 'PENDING' ? 'En attente' : 'No-show'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil size={16} /> Modifier
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} /> Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Informations</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail size={16} className="text-gray-400" /> {patient.email || '—'}
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Phone size={16} className="text-gray-400" /> {patient.phone}
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar size={16} className="text-gray-400" /> {patient.birthDate || '—'}
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin size={16} className="text-gray-400" /> {patient.address || '—'}
            </div>
          </div>
          {patient.doctorName && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs text-gray-500">Medecin traitant</p>
              <p className="text-sm font-medium text-gray-900">{patient.doctorName}</p>
            </div>
          )}
          {patient.tags && patient.tags.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs text-gray-500">Tags</p>
              <div className="flex flex-wrap gap-1">
                {patient.tags.map((t) => (
                  <span key={t} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-3">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Historique des interactions</h2>
          {timelineLoading ? <TimelineSkeleton /> : <Timeline items={timelineItems} />}
        </div>
      </div>

      <PatientModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleEdit}
        initial={{
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email || '',
          phone: patient.phone,
          birthDate: patient.birthDate || '',
          address: patient.address || '',
        }}
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer le patient"
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Annuler</Button>
            <Button variant="danger" onClick={handleDelete}>Confirmer la suppression</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Etes-vous sur de vouloir supprimer <strong>{fullName}</strong> ? Cette action est irreversible.
        </p>
      </Modal>
    </div>
  )
}
