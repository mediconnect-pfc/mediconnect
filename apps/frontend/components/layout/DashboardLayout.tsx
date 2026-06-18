'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardRealtimeProvider, useDashboardRealtime } from '@/components/dashboard/DashboardRealtimeProvider'
import ToastContainer from '@/components/ui/Toast'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardRealtimeProvider>
      <DashboardContent user={user} logout={logout}>{children}</DashboardContent>
    </DashboardRealtimeProvider>
  )
}

function DashboardContent({
  children,
  user,
  logout,
}: {
  children: React.ReactNode
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  logout: () => void
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { notificationCount, clearNotifications } = useDashboardRealtime()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        user={user}
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col lg:ml-64">
        <Topbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          notificationCount={notificationCount}
          onNotificationsClick={clearNotifications}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <ToastContainer />
    </div>
  )
}
