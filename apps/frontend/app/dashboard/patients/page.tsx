'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Upload, Search, ChevronDown } from 'lucide-react'
import { usePatients } from '@/hooks/usePatients'
import PatientModal from '@/components/patients/PatientModal'
import ImportCSVModal from '@/components/patients/ImportCSVModal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import type { Patient } from '@/types'

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIF: 'success',
  PENDING: 'warning',
  NO_SHOW: 'danger',
}

const statusLabel: Record<string, string> = {
  ACTIF: 'Actif',
  PENDING: 'En attente',
  NO_SHOW: 'No-show',
}

const filters = [
  { label: 'Tous', value: '' },
  { label: 'Actifs', value: 'ACTIF' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'No-shows', value: 'NO_SHOW' },
]

export default function PatientsPage() {
  const { patients, totalPages, loading, fetchPatients, createPatient, importCSV } = usePatients()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchPatients(1, search, status)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, status, fetchPatients])

  useEffect(() => {
    fetchPatients(page, search, status)
  }, [page, fetchPatients, search, status])

  async function handleCreate(data: Partial<Patient>) {
    const p = await createPatient(data)
    if (p) fetchPatients(page, search, status)
  }

  async function handleImport(file: File) {
    const ok = await importCSV(file)
    if (ok) fetchPatients(page, search, status)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload size={16} /> Importer CSV
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nouveau patient
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            {status ? statusLabel[status] : 'Filtres'} <ChevronDown size={16} />
          </button>
          {showFilters && (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border bg-white shadow-lg">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setStatus(f.value); setShowFilters(false) }}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    status === f.value ? 'font-medium text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-3 sm:px-6">Nom</th>
              <th className="px-4 py-3 sm:px-6">Téléphone</th>
              <th className="hidden px-4 py-3 sm:table-cell sm:px-6">Dernier RDV</th>
              <th className="hidden px-4 py-3 md:table-cell md:px-6">Médecin</th>
              <th className="px-4 py-3 sm:px-6">Statut</th>
              <th className="px-4 py-3 text-right sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Chargement...</td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Aucun patient trouvé</td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 sm:px-6">
                    <Link href={`/dashboard/patients/${p.id}`} className="hover:text-blue-700">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 sm:px-6">{p.phone}</td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell sm:px-6">{p.lastAppointment || '—'}</td>
                  <td className="hidden px-4 py-3 text-gray-600 md:table-cell md:px-6">{p.doctorName || '—'}</td>
                  <td className="px-4 py-3 sm:px-6">
                    <Badge variant={statusBadge[p.status]}>{statusLabel[p.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right sm:px-6">
                    <Link href={`/dashboard/patients/${p.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-900">
                      Voir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <PatientModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} />
      <ImportCSVModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
    </div>
  )
}
