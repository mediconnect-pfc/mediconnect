'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { date: string; confirmations: number }[]
  title: string
  color?: string
}

export default function ConfirmationsChart({ data, title, color = '#16a34a' }: Props) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
            labelFormatter={(v) => `Date: ${v}`}
          />
          <Legend />
          <Bar dataKey="confirmations" fill={color} radius={[4, 4, 0, 0]} name="Confirmations" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
