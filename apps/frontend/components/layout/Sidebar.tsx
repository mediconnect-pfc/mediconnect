'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  CreditCard,
  Bot,
  BarChart3,
  Megaphone,
  Settings,
  LogOut,
  HelpCircle,
  Plus,
  X,
} from 'lucide-react'
import type { User } from '@/types'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Patients', href: '/dashboard/patients', icon: Users },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Campagnes', href: '/dashboard/campaigns', icon: Megaphone },
  { label: 'Paramètres', href: '/dashboard/settings', icon: Settings },
  { label: 'Clinics', href: '/dashboard/clinics', icon: Building2 },
  { label: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
  { label: 'Financials', href: '/dashboard/financials', icon: CreditCard },
  { label: 'IA Monitoring', href: '/dashboard/ia-monitoring', icon: Bot },
]

interface SidebarProps {
  user: User
  onLogout: () => void
  open: boolean
  onClose: () => void
}

function SidebarContent({ user, onLogout, onClose }: Omit<SidebarProps, 'open'>) {
  const pathname = usePathname()
  const canManageCampaigns = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
  const canManageSettings = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'

  return (
    <div className="flex h-full w-64 flex-col bg-[#0f1f3d]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-base font-bold text-white">M</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">MediConnect</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">Clinical Portal</div>
          </div>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white md:hidden" aria-label="Fermer le menu">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navItems
          .filter((item) => item.href !== '/dashboard/campaigns' || canManageCampaigns)
          .filter((item) => item.href !== '/dashboard/settings' || canManageSettings)
          .map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} onClick={onClose}>
                <div
                  className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                    active
                      ? 'bg-blue-600/80 font-medium text-white'
                      : 'text-white/60 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </div>
              </Link>
            )
          })}

        <div className="mt-4">
          <Link
            href="/dashboard/dossiers/new"
            onClick={onClose}
            className="flex w-full items-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus size={16} /> Nouvelle consultation
          </Link>
        </div>
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <Link href="/dashboard/help">
          <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 hover:text-white/80">
            <HelpCircle size={16} /> Centre d&apos;aide
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="mb-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 hover:text-red-400"
        >
          <LogOut size={16} /> Déconnexion
        </button>

        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{user.name}</div>
            <div className="truncate text-xs text-white/40">{user.role}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ user, onLogout, open, onClose }: SidebarProps) {
  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-full md:block">
        <SidebarContent user={user} onLogout={onLogout} onClose={onClose} />
      </aside>

      {open && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-0 z-30 h-full transition-transform duration-300 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent user={user} onLogout={onLogout} onClose={onClose} />
      </aside>
    </>
  )
}
