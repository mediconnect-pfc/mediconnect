'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Phone, Mail, Calendar, MapPin, PhoneCall, MessageSquare } from 'lucide-react'
import { usePatients } from '@/hooks/usePatients'
import PatientModal from '@/components/patients/PatientModal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Patient } from '@/types'

const typeIcon: Record<string, React.ReactNode> = {
  CALL: <PhoneCall size={16} />,
  SMS: <MessageSquare size={16} />,
}

const typeLabel: Record<string, string> = {
  CALL: 'Appel',
  SMS: 'SMS',
}

const sentimentBadge: Record<string, string> = {
  POSITIVE: 'text-green-600',
  NEUTRAL: 'text-gray-500',
  NEGATIVE: 'text-red-500',
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIF: 'success',
  PENDING: 'warning',
  NO_SHOW: 'danger',
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { getPatient, updatePatient, deletePatient } = usePatients()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    getPatient(id).then((p) => {
      setPatient(p)
      setLoading(false)
    })
  }, [id, getPatient])

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
          Retour à la liste
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm lg:col-span-1">
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
              <p className="text-xs text-gray-500">Médecin traitant</p>
              <p className="text-sm font-medium text-gray-900">{patient.doctorName}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Dernières interactions</h2>
          {!patient.interactions || patient.interactions.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune interaction enregistrée.</p>
          ) : (
            <div className="space-y-3">
              {patient.interactions.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-lg border p-4">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    {typeIcon[item.type] ?? <Phone size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          {typeLabel[item.type] ?? item.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.direction === 'INBOUND' ? '↙ Entrant' : '↗ Sortant'}
                        </span>
                        {item.sentiment && (
                          <span className={`text-xs font-medium ${sentimentBadge[item.sentiment]}`}>
                            {item.sentiment === 'POSITIVE' ? '😊' : item.sentiment === 'NEGATIVE' ? '😞' : '😐'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {item.transcript && (
                      <p className="mt-1 text-sm text-gray-700">{item.transcript}</p>
                    )}
                    {item.duration != null && (
                      <p className="mt-0.5 text-xs text-gray-400">{item.duration}s</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
          Êtes-vous sûr de vouloir supprimer <strong>{fullName}</strong> ? Cette action est irréversible.
        </p>
      </Modal>
    </div>
  )
}
