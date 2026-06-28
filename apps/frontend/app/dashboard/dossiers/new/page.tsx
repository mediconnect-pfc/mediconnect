'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Button from '@/components/ui/Button'
import { API_URL, createDossier, getAuthToken, authHeaders } from '@/lib/api'

type PatientOption = {
  id: string
  firstName: string
  lastName: string
  phone: string
}

export default function NewDossierPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [patientId, setPatientId] = useState('')
  const [notes, setNotes] = useState('')
  const [ordonnance, setOrdonnance] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getAuthToken()
    if (!token) return

    const fetchPatients = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_URL}/patients?limit=1000&page=1`, {
          headers: authHeaders(),
        })
        if (!res.ok) {
          setPatients([])
          return
        }

        const data = await res.json().catch(() => null)
        setPatients(Array.isArray(data?.data) ? data.data : [])
      } finally {
        setLoading(false)
      }
    }

    void fetchPatients()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!patientId) {
      setError('Veuillez choisir un patient')
      return
    }

    const token = getAuthToken()
    if (!token) {
      setError('Session expiree')
      return
    }

    setSaving(true)
    try {
      const dossier = await createDossier(token, {
        patientId,
        notes: notes.trim() || undefined,
        ordonnance: ordonnance.trim() || undefined,
      })
      router.push(`/dashboard/patients/${dossier.patientId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur creation dossier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => router.push('/dashboard/patients')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Retour aux patients
      </button>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Nouvelle consultation</h1>
          <p className="mt-1 text-sm text-gray-500">
            Creez un dossier medical avec les notes de consultation et l&apos;ordonnance.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="patientId" className="block text-sm font-medium text-gray-700">
              Patient
            </label>
            <select
              id="patientId"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Selectionner un patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} - {patient.phone}
                </option>
              ))}
            </select>
            {loading && <p className="mt-1 text-xs text-gray-500">Chargement des patients...</p>}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes de consultation
            </label>
            <textarea
              id="notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Constat, examen clinique, recommandations..."
            />
          </div>

          <div>
            <label htmlFor="ordonnance" className="block text-sm font-medium text-gray-700">
              Ordonnance
            </label>
            <textarea
              id="ordonnance"
              rows={6}
              value={ordonnance}
              onChange={(e) => setOrdonnance(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Medicaments, posologie, recommandations..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" onClick={() => router.push('/dashboard/patients')}>
              Annuler
            </Button>
            <Button type="submit" loading={saving} icon={<Save size={16} />}>
              Enregistrer la consultation
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
