'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface PatientFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  address: string
  status: string
}

interface PatientModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: PatientFormData) => Promise<string | void>
  initial?: Partial<PatientFormData>
}

const statusOptions = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'NO_SHOW', label: 'No-show' },
]

const phoneRegex = /^\+212\d{9}$/

function getInitialForm(initial?: Partial<PatientFormData>): PatientFormData {
  return {
    firstName: initial?.firstName || '',
    lastName: initial?.lastName || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    birthDate: initial?.birthDate || '',
    address: initial?.address || '',
    status: initial?.status || 'ACTIF',
  }
}

export default function PatientModal({ open, onClose, onSave, initial }: PatientModalProps) {
  const [form, setForm] = useState<PatientFormData>(() => getInitialForm(initial))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.firstName) errs.firstName = 'Requis'
    if (!form.lastName) errs.lastName = 'Requis'
    if (!form.phone) errs.phone = 'Requis'
    else if (!phoneRegex.test(form.phone)) errs.phone = 'Telephone invalide'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const err = await onSave(form)
      if (err) {
        setErrors({ general: err })
        setSaving(false)
        return
      }
      handleClose()
    } catch {
      setErrors({ general: 'Erreur lors de la sauvegarde' })
    } finally {
      setSaving(false)
    }
  }

  function set<K extends keyof PatientFormData>(field: K, value: PatientFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function handleClose() {
    setForm(getInitialForm(initial))
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={initial ? 'Modifier le patient' : 'Nouveau patient'}
      actions={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Annuler
          </Button>
          <Button loading={saving} onClick={handleSubmit}>
            {initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="firstName"
            label="Prénom"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            error={errors.firstName}
          />
          <Input
            id="lastName"
            label="Nom"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            error={errors.lastName}
          />
        </div>
        <Input
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
        />
        <Input
          id="phone"
          label="Téléphone"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => {
            const cleaned = e.target.value
              .replace(/[^\d+]/g, '')
              .replace(/(?!^)\+/g, '')
              .slice(0, 16)
            set('phone', cleaned.startsWith('+212') ? cleaned : cleaned)
          }}
          error={errors.phone}
        />
        <Input
          id="birthDate"
          label="Date de naissance"
          type="date"
          value={form.birthDate}
          onChange={(e) => set('birthDate', e.target.value)}
        />
        <Input
          id="address"
          label="Adresse"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
        />
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Statut
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {errors.general && <p className="text-sm text-red-500">{errors.general}</p>}
      </form>
    </Modal>
  )
}
