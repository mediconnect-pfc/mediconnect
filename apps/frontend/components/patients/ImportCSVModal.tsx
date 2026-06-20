'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Upload, FileText, AlertCircle } from 'lucide-react'

interface ImportCSVModalProps {
  open: boolean
  onClose: () => void
  onImport: (file: File) => Promise<void>
}

export default function ImportCSVModal({ open, onClose, onImport }: ImportCSVModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<string[]>([])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setError('')
    if (!f.name.endsWith('.csv')) {
      setError('Le fichier doit être au format .csv')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setPreview(text.split('\n').slice(0, 4))
    }
    reader.readAsText(f)
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setError('')
    try {
      await onImport(file)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import')
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    if (!importing) {
      setFile(null)
      setPreview([])
      setError('')
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importer des patients (CSV)"
      actions={
        <>
          <Button variant="secondary" onClick={handleClose}>Annuler</Button>
          <Button loading={importing} disabled={!file} onClick={handleImport}>
            Importer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Colonnes attendues : <code className="rounded bg-gray-100 px-1">firstName, lastName, phone, birthDate, tags</code>
        </p>

        <div
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="text-gray-400" size={32} />
          <p className="text-sm text-gray-500">
            {file ? file.name : 'Cliquez ou glissez un fichier CSV ici'}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        {preview.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileText size={16} /> Aperçu
            </h4>
            <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              {preview.map((line, i) => (
                <div key={i}>{line || '\u00A0'}</div>
              ))}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  )
}
