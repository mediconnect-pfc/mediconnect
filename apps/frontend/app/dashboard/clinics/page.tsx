'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, Plus, RefreshCw, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  createEstablishment,
  deactivateEstablishment,
  getAuthToken,
  getEstablishments,
  updateEstablishment,
  type CreateEstablishmentInput,
} from '@/lib/api'
import { toast } from '@/components/ui'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

type EstablishmentType = 'CLINIC' | 'HOSPITAL' | 'PHARMACY'
type PlanType = 'FREE' | 'BASIC' | 'PREMIUM'

type Establishment = {
  id: string
  name: string
  type: EstablishmentType
  plan: PlanType
  phone: string
  address?: string | null
  isActive: boolean
  createdAt: string
}

type FormState = {
  name: string
  type: EstablishmentType
  plan: PlanType
  phone: string
  address: string
}

const initialForm: FormState = {
  name: '',
  type: 'CLINIC',
  plan: 'FREE',
  phone: '+212',
  address: '',
}

const typeOptions: EstablishmentType[] = ['CLINIC', 'HOSPITAL', 'PHARMACY']
const planOptions: PlanType[] = ['FREE', 'BASIC', 'PREMIUM']

function PlanBadge({ plan }: { plan: PlanType }) {
  const map: Record<PlanType, string> = {
    FREE: 'bg-gray-100 text-gray-700',
    BASIC: 'bg-blue-100 text-blue-700',
    PREMIUM: 'bg-purple-100 text-purple-700',
  }

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[plan]}`}>{plan}</span>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function ClinicsPage() {
  const { user, loading: authLoading } = useAuth()
  const token = useMemo(() => getAuthToken(), [])
  const [clinics, setClinics] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const canAccess = user?.role === 'SUPER_ADMIN'

  const loadClinics = useCallback(async () => {
    if (!token || !canAccess) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await getEstablishments(token)
      setClinics(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erreur chargement etablissements')
      setClinics([])
    } finally {
      setLoading(false)
    }
  }, [canAccess, token])

  useEffect(() => {
    if (authLoading) return
    const timeout = window.setTimeout(() => {
      void loadClinics()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [authLoading, loadClinics])

  function openCreateModal() {
    setForm(initialForm)
    setFormErrors({})
    setModalOpen(true)
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = 'Nom requis'
    if (!form.phone.trim()) nextErrors.phone = 'Telephone requis'
    if (!form.phone.trim().startsWith('+212')) nextErrors.phone = 'Format attendu : +212XXXXXXXXX'
    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleCreate() {
    if (!token || !validateForm()) return

    const payload: CreateEstablishmentInput = {
      name: form.name.trim(),
      type: form.type,
      plan: form.plan,
      phone: form.phone.trim(),
      address: form.address.trim() || null,
    }

    setSaving(true)
    try {
      await createEstablishment(token, payload)
      setModalOpen(false)
      toast({ type: 'success', message: 'Etablissement cree avec succes' })
      await loadClinics()
    } catch (createError) {
      setFormErrors({
        general: createError instanceof Error ? createError.message : 'Erreur creation etablissement',
      })
    } finally {
      setSaving(false)
    }
  }

  async function changePlan(clinic: Establishment, plan: PlanType) {
    if (!token || clinic.plan === plan) return

    setBusyId(clinic.id)
    try {
      const updated = await updateEstablishment(token, clinic.id, { plan })
      setClinics((prev) => prev.map((item) => (item.id === clinic.id ? updated : item)))
      toast({ type: 'success', message: 'Plan mis a jour' })
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Erreur mise a jour plan')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleStatus(clinic: Establishment) {
    if (!token) return

    setBusyId(clinic.id)
    try {
      const updated = clinic.isActive
        ? await deactivateEstablishment(token, clinic.id)
        : await updateEstablishment(token, clinic.id, { isActive: true })
      setClinics((prev) => prev.map((item) => (item.id === clinic.id ? updated : item)))
      toast({
        type: clinic.isActive ? 'warning' : 'success',
        message: clinic.isActive ? 'Etablissement desactive' : 'Etablissement reactive',
      })
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Erreur changement statut')
    } finally {
      setBusyId(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-5">
        <div className="h-9 w-72 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border bg-gray-100" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl border bg-gray-100" />
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert size={20} />
          <h1 className="text-xl font-semibold text-gray-900">Acces reserve</h1>
        </div>
        <p className="text-sm">Cette page est reservee au Super Administrateur.</p>
      </div>
    )
  }

  const activeCount = clinics.filter((clinic) => clinic.isActive).length
  const premiumCount = clinics.filter((clinic) => clinic.plan === 'PREMIUM').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestion des etablissements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vue globale Super Admin pour creer, superviser et administrer les cliniques.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => void loadClinics()}>
            Actualiser
          </Button>
          <Button icon={<Plus size={16} />} onClick={openCreateModal}>
            Nouvelle clinique
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Building2 size={20} />
          </div>
          <p className="text-2xl font-semibold text-gray-900">{clinics.length}</p>
          <p className="text-sm text-gray-500">Etablissements inscrits</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <CheckCircle2 size={20} />
          </div>
          <p className="text-2xl font-semibold text-gray-900">{activeCount}</p>
          <p className="text-sm text-gray-500">Etablissements actifs</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Building2 size={20} />
          </div>
          <p className="text-2xl font-semibold text-gray-900">{premiumCount}</p>
          <p className="text-sm text-gray-500">Plans premium</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Etablissements</h2>
          <p className="text-sm text-gray-500">Creation, plans et statut global de la plateforme.</p>
        </div>

        {clinics.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Aucun etablissement trouve.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Etablissement</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Creation</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clinics.map((clinic) => (
                  <tr key={clinic.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{clinic.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{clinic.phone}</p>
                      {clinic.address && <p className="mt-1 text-xs text-gray-400">{clinic.address}</p>}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{clinic.type}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <PlanBadge plan={clinic.plan} />
                        <select
                          value={clinic.plan}
                          disabled={busyId === clinic.id}
                          onChange={(event) => void changePlan(clinic, event.target.value as PlanType)}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          {planOptions.map((plan) => (
                            <option key={plan} value={plan}>
                              {plan}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={clinic.isActive ? 'success' : 'danger'}>
                        {clinic.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{formatDate(clinic.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant={clinic.isActive ? 'danger' : 'secondary'}
                        loading={busyId === clinic.id}
                        onClick={() => void toggleStatus(clinic)}
                      >
                        {clinic.isActive ? 'Desactiver' : 'Reactiver'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle clinique"
        actions={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button loading={saving} onClick={handleCreate}>
              Creer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            id="clinic-name"
            label="Nom"
            value={form.name}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, name: event.target.value }))
              setFormErrors((prev) => ({ ...prev, name: '' }))
            }}
            error={formErrors.name}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="clinic-type" className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                id="clinic-type"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as EstablishmentType }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="clinic-plan" className="block text-sm font-medium text-gray-700">
                Plan
              </label>
              <select
                id="clinic-plan"
                value={form.plan}
                onChange={(event) => setForm((prev) => ({ ...prev, plan: event.target.value as PlanType }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                {planOptions.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Input
            id="clinic-phone"
            label="Telephone"
            value={form.phone}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, phone: event.target.value }))
              setFormErrors((prev) => ({ ...prev, phone: '' }))
            }}
            error={formErrors.phone}
          />
          <Input
            id="clinic-address"
            label="Adresse"
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          />
          {formErrors.general && <p className="text-sm text-red-500">{formErrors.general}</p>}
        </div>
      </Modal>
    </div>
  )
}
