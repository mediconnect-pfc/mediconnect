'use client'

import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'

interface TopbarProps {
  onToggleSidebar: () => void
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/patients': 'Patients',
  '/dashboard/rdv': 'Rendez-vous',
  '/dashboard/campagnes': 'Campagnes',
  '/dashboard/analytics': 'Analytiques',
  '/dashboard/settings': 'Paramètres',
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'Dashboard'

  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-4 sm:px-6">
      <button
        onClick={onToggleSidebar}
        className="text-gray-500 hover:text-gray-700 lg:hidden"
      >
        <Menu size={24} />
      </button>

      <div className="flex flex-1 items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-gray-500 sm:block">{dateStr}</span>
          <button className="relative text-gray-500 hover:text-gray-700">
            <Bell size={20} />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              3
            </span>
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            D
          </div>
        </div>
      </div>
    </header>
  )
}
