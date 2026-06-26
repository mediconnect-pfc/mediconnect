'use client'

import type { MedicalRecordData } from '@/types'

export default function MedicalRecordItem({ data }: { data: MedicalRecordData }) {
  const date = new Date(data.date)

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-base">
          📋
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-green-600">Consultation</span>
            <span className="text-xs text-gray-400">
              {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          <p className="mt-1 text-sm font-medium text-gray-900">{data.doctorName}</p>

          {data.notes && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500">Notes :</p>
              <p className="mt-0.5 text-sm text-gray-700">{data.notes}</p>
            </div>
          )}

          {data.prescriptions && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500">Prescriptions :</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">{data.prescriptions}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
