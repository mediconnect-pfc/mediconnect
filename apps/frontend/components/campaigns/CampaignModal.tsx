'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { ArrowLeft, ArrowRight, Download, Upload } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { CampaignInput } from '@/lib/api'
import type { CampaignType } from '@/types'

interface CampaignLaunchPayload {
  campaign: CampaignInput
  file: File
  contactsCount: number
}

interface CampaignModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CampaignLaunchPayload) => Promise<void>
  loading?: boolean
  disabled?: boolean
}

type CsvContact = {
  phone: string
  name: string
}

const campaignTypes: Array<{ value: CampaignType; label: string; description: string }> = [
  { value: 'SMS', label: 'SMS', description: 'Message texte' },
  { value: 'VOICE', label: 'VOICE', description: 'Appel vocal automatique' },
  { value: 'EMERGENCY', label: 'EMERGENCY', description: 'Diffusion urgence immediate' },
]

const SAMPLE_CSV = `phone,name
+212661234567,Karima Alaoui
+212672345678,Mohamed El Fassi
+212683456789,Salma Ouazzani`

function splitCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells.map((cell) => cell.trim())
}

function parseCsvContacts(text: string): CsvContact[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const lines = normalized.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase())
  const phoneIndex = headers.indexOf('phone')
  const nameIndex = headers.indexOf('name')

  if (phoneIndex === -1) return []

  return lines
    .slice(1)
    .map((line) => {
      const values = splitCsvLine(line)
      return {
        phone: (values[phoneIndex] ?? '').trim(),
        name: nameIndex >= 0 ? (values[nameIndex] ?? '').trim() : '',
      }
    })
    .filter((contact) => contact.phone.length > 0)
}

export default function CampaignModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  disabled = false,
}: CampaignModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [type, setType] = useState<CampaignType>('SMS')
  const [message, setMessage] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [contacts, setContacts] = useState<CsvContact[]>([])
  const [error, setError] = useState('')
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    if (!open) return
    setStep(1)
    setName('')
    setType('SMS')
    setMessage('')
    setScheduledAt('')
    setFile(null)
    setContacts([])
    setError('')
    setFileError('')
  }, [open])

  useEffect(() => {
    if (type === 'EMERGENCY') {
      setScheduledAt('')
    }
  }, [type])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null
    setFileError('')
    setFile(selectedFile)
    setContacts([])

    if (!selectedFile) {
      return
    }

    try {
      const text = await selectedFile.text()
      const parsed = parseCsvContacts(text)
      setContacts(parsed)
      if (parsed.length === 0) {
        setFileError('Aucun contact valide trouve dans le CSV')
      }
    } catch {
      setFileError('Impossible de lire le fichier CSV')
    }
  }

  function downloadSampleCsv() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'sample-campaign-contacts.csv'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  async function handleNext() {
    setError('')
    if (!name.trim() || !message.trim()) {
      setError('Nom et message requis')
      return
    }

    setStep(2)
  }

  async function handleSubmit() {
    setError('')
    if (!file) {
      setError('Fichier CSV requis')
      return
    }

    if (contacts.length === 0) {
      setError('Aucun contact valide trouve dans le fichier CSV')
      return
    }

    try {
      await onSubmit({
        campaign: {
          name: name.trim(),
          type,
          message: message.trim(),
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        },
        file,
        contactsCount: contacts.length,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur creation campagne')
    }
  }

  const selectedType = campaignTypes.find((option) => option.value === type)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle campagne"
      className="max-w-2xl"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>

          {step === 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              icon={<ArrowRight size={16} />}
              disabled={disabled || !name.trim() || !message.trim()}
            >
              Suivant
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                icon={<ArrowLeft size={16} />}
              >
                Retour
              </Button>
              <Button
                type="button"
                loading={loading}
                onClick={handleSubmit}
                disabled={disabled || !file || contacts.length === 0}
                icon={<Upload size={16} />}
              >
                Lancer la campagne
              </Button>
            </>
          )}
        </>
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="campaign-name" className="mb-1 block text-sm font-medium text-gray-700">
              Nom de la campagne
            </label>
            <input
              id="campaign-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
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
              disabled={disabled}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              {campaignTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} - {option.description}
                </option>
              ))}
            </select>
            {selectedType && (
              <p className="mt-1 text-xs text-gray-500">{selectedType.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="campaign-message" className="mb-1 block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="campaign-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={disabled}
              rows={5}
              maxLength={160}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Bonjour, ..."
            />
            <p className="mt-1 text-xs text-gray-500">{message.length}/160</p>
          </div>

          {type !== 'EMERGENCY' && (
            <div>
              <label htmlFor="campaign-scheduledAt" className="mb-1 block text-sm font-medium text-gray-700">
                Date d'envoi
              </label>
              <input
                id="campaign-scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={disabled}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Importer vos contacts</h3>
            <p className="mt-1 text-sm text-gray-500">
              Telechargez un fichier CSV avec les colonnes <code className="rounded bg-gray-100 px-1 py-0.5">phone</code> et <code className="rounded bg-gray-100 px-1 py-0.5">name</code>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={<Download size={16} />}
              onClick={downloadSampleCsv}
            >
              Telecharger un exemple CSV
            </Button>
          </div>

          <div>
            <label htmlFor="campaign-csv" className="mb-1 block text-sm font-medium text-gray-700">
              Fichier CSV
            </label>
            <input
              id="campaign-csv"
              type="file"
              accept=".csv"
              disabled={disabled}
              onChange={handleFileChange}
              className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <p className="text-sm text-gray-600">{contacts.length} contacts charges</p>
          )}

          {fileError && <p className="text-sm text-amber-700">{fileError}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {contacts.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Telephone</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Nom</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {contacts.slice(0, 5).map((contact, index) => (
                    <tr key={`${contact.phone}-${index}`}>
                      <td className="px-4 py-2 text-gray-700">{contact.phone}</td>
                      <td className="px-4 py-2 text-gray-700">{contact.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {file && contacts.length === 0 && (
            <p className="text-sm text-amber-700">
              Aucun contact valide trouve. Verifiez que le CSV contient bien les colonnes phone et name.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
