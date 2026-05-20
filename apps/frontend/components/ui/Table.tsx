'use client'

interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => React.ReactNode
  className?: string
  hideOn?: 'sm' | 'md'
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyMessage = 'Aucune donnée',
  onRowClick,
}: TableProps<T>) {
  const hideClass = (hideOn?: 'sm' | 'md') => {
    if (hideOn === 'sm') return 'hidden sm:table-cell'
    if (hideOn === 'md') return 'hidden md:table-cell'
    return ''
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 sm:px-6 ${hideClass(col.hideOn)} ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                Chargement...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-gray-50`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-gray-600 sm:px-6 ${hideClass(col.hideOn)} ${col.className || ''}`}>
                    {col.render ? col.render(row, i) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
