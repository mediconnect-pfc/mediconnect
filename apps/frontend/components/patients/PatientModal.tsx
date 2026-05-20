'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { Patient } from '@/types'

interface PatientModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Patient>) => Promise<void>
  patient?: Patient | null
}

export default function PatientModal({ open, onClose, onSave, patient }: PatientModalProps) {
  const [form, setForm] = useState({
    name: patient?.name || '',
    email: patient?.email || '',
    phone: patient?.phone || '',
    birthDate: patient?.birthDate || '',
    address: patient?.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.phone) {
      setError('Nom et téléphone sont requis')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
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
      title={patient ? 'Modifier le patient' : 'Nouveau patient'}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button loading={saving} onClick={handleSubmit}>
            {patient ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label="Nom complet"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={error && !form.name ? 'Nom requis' : undefined}
        />
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
          error={error && !form.phone ? 'Téléphone requis' : undefined}
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
