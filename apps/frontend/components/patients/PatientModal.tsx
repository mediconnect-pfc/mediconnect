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
}

interface PatientModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: PatientFormData) => Promise<string | void>
  initial?: Partial<PatientFormData>
}

export default function PatientModal({ open, onClose, onSave, initial }: PatientModalProps) {
  const [form, setForm] = useState<PatientFormData>({
    firstName: initial?.firstName || '',
    lastName: initial?.lastName || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    birthDate: initial?.birthDate || '',
    address: initial?.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.phone) {
      setError('Prénom, nom et téléphone sont requis')
      return
    }
    setSaving(true)
    setError('')
    try {
      const err = await onSave(form)
      if (err) {
        setError(err)
        setSaving(false)
        return
      }
      onClose()
    } catch {
      setError('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Modifier le patient' : 'Nouveau patient'}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
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
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            error={error && !form.firstName ? 'Requis' : undefined}
          />
          <Input
            id="lastName"
            label="Nom"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            error={error && !form.lastName ? 'Requis' : undefined}
          />
        </div>
        <Input
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          id="phone"
          label="Téléphone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          error={error && !form.phone ? 'Requis' : undefined}
        />
        <Input
          id="birthDate"
          label="Date de naissance"
          type="date"
          value={form.birthDate}
          onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
        />
        <Input
          id="address"
          label="Adresse"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
