'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Building2, Calendar,
  CreditCard, Bot, HelpCircle, LogOut, Plus, Menu, X
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/clinics', label: 'Clinics', icon: Building2 },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/financials', label: 'Financials', icon: CreditCard },
  { href: '/ia-monitoring', label: 'IA Monitoring', icon: Bot },
];

interface SidebarProps {
  userName?: string;
  userRole?: string;
}

export default function Sidebar({ userName = 'Admin', userRole = 'Super Admin' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const SidebarContent = () => (
    <div style={{
      width: 'var(--mc-sidebar-width)',
      background: 'var(--mc-navy)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--mc-blue)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>M</span>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>MediConnect</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>CLINICAL PORTAL</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                background: isActive ? 'rgba(37,99,235,0.8)' : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Icon size={18} />
                <span style={{ fontSize: 14, fontWeight: isActive ? 500 : 400 }}>{label}</span>
              </div>
            </Link>
          );
        })}

        {/* Bouton New Consultation */}
        <div style={{ marginTop: 16 }}>
          <button style={{
            width: '100%', padding: '10px 12px',
            background: 'var(--mc-blue)', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 500,
          }}>
            <Plus size={16} /> New Consultation
          </button>
        </div>
      </nav>

      {/* Footer — utilisateur + logout */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Link href="/help" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 8, marginBottom: 4,
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
          }}>
            <HelpCircle size={16} />
            <span style={{ fontSize: 13 }}>Help Center</span>
          </div>
        </Link>
        <div
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 8, marginBottom: 12,
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
          }}
        >
          <LogOut size={16} />
          <span style={{ fontSize: 13 }}>Logout</span>
        </div>

        {/* Nom et rôle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--mc-blue)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 600, fontSize: 13, flexShrink: 0,
          }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>{userName}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{userRole}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <SidebarContent />
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden"
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 100,
          background: 'var(--mc-navy)', color: 'white',
          border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer',
        }}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 40,
            }}
          />
          <div className="md:hidden">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
