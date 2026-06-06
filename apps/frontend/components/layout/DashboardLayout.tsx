'use client';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  userName?: string;
  userRole?: string;
}

export default function DashboardLayout({
  children, pageTitle, userName, userRole,
}: DashboardLayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar userName={userName} userRole={userRole} />
      <div style={{
        marginLeft: 'var(--mc-sidebar-width)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <Topbar pageTitle={pageTitle} />
        <main style={{ flex: 1, padding: 24, background: 'var(--mc-gray-50)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
