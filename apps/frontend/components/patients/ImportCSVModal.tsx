'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Upload, FileText } from 'lucide-react'

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
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    if (!f.name.endsWith('.csv')) return
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
    try {
      await onImport(file)
      onClose()
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importer des patients (CSV)"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button loading={importing} disabled={!file} onClick={handleImport}>
            Importer
          </Button>
        </>
      }
    >
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

      {preview.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <FileText size={16} /> Aperçu ({preview.length} lignes)
          </h4>
          <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            {preview.map((line, i) => (
              <div key={i}>{line || '\u00A0'}</div>
            ))}
          </pre>
        </div>
      )}
    </Modal>
  )
}
