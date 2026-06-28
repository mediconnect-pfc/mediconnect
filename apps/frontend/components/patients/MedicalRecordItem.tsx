'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { MedicalRecordData } from '@/types'

type MedicalRecordItemProps = {
  data: MedicalRecordData
  canManage?: boolean
  onEdit?: () => void
}

export default function MedicalRecordItem({ data, canManage = false, onEdit }: MedicalRecordItemProps) {
  const dateSource = data.date || data.consultationDate
  const date = dateSource ? new Date(dateSource) : null
  const formattedDate =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Date inconnue'

  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-base">
          📋
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-green-600">Consultation</span>
              <span className="text-xs text-gray-400">{formattedDate}</span>
            </div>

            {canManage && onEdit && (
              <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Pencil size={13} /> Modifier
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{data.doctorName}</p>
            {canManage && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                Créé par vous
              </span>
            )}
          </div>

          {data.notes && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500">Notes :</p>
              <p className="mt-0.5 text-sm text-gray-700">{data.notes}</p>
            </div>
          )}

          {(data.prescriptions || data.ordonnance) && (
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-medium text-gray-500">Prescriptions :</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">
                {data.prescriptions || data.ordonnance}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
