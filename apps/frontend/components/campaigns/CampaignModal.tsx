'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { CampaignInput } from '@/lib/api'
import type { CampaignType } from '@/types'

interface CampaignModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CampaignInput) => Promise<void>
  loading?: boolean
}

const campaignTypes: { value: CampaignType; label: string }[] = [
  { value: 'SMS', label: 'SMS' },
  { value: 'VOICE', label: 'VOICE' },
  { value: 'EMERGENCY', label: 'EMERGENCY' },
]

export default function CampaignModal({ open, onClose, onSubmit, loading = false }: CampaignModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<CampaignType>('SMS')
  const [message, setMessage] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setType('SMS')
    setMessage('')
    setScheduledAt('')
    setError('')
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !message.trim()) {
      setError('Nom et message requis')
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        type,
        message: message.trim(),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur creation campagne')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle campagne"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading} onClick={handleSubmit}>
            Créer
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="campaign-name" className="mb-1 block text-sm font-medium text-gray-700">
            Nom
          </label>
          <input
            id="campaign-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Campagne de rappel vaccination"
          />
        </div>

        <div>
          <label htmlFor="campaign-type" className="mb-1 block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            id="campaign-type"
            value={type}
            onChange={(e) => setType(e.target.value as CampaignType)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {campaignTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="campaign-message" className="mb-1 block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            id="campaign-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Bonjour, ..."
          />
        </div>

        <div>
          <label htmlFor="campaign-scheduledAt" className="mb-1 block text-sm font-medium text-gray-700">
            Date et heure de lancement
          </label>
          <input
            id="campaign-scheduledAt"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  )
}
