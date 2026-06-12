'use client'

import { usePathname } from 'next/navigation'
import { Bell, Menu, Search, Settings } from 'lucide-react'

interface TopbarProps {
  onToggleSidebar: () => void
}

const pageTitles: Record<string, string> = {
  '/dashboard':                  'Dashboard',
  '/dashboard/patients':         'Patients',
  '/dashboard/clinics':          'Clinics',
  '/dashboard/appointments':     'Appointments',
  '/dashboard/financials':       'Financials',
  '/dashboard/ia-monitoring':    'IA Monitoring',
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Dashboard'

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-gray-500 hover:text-gray-700 lg:hidden"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <p className="hidden text-xs capitalize text-gray-400 sm:block">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 sm:flex">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-44 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </button>

        {/* Settings */}
        <button className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
          <Settings size={18} />
        </button>

        {/* Avatar placeholder */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          A
        </div>
      </div>
    </header>
  )
}
