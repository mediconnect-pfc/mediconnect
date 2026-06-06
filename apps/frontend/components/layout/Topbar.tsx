'use client';

import { Bell, Settings, Search } from 'lucide-react';

interface TopbarProps {
  pageTitle: string;
  userAvatar?: string;
}

export default function Topbar({ pageTitle, userAvatar }: TopbarProps) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div style={{
      height: 64,
      background: 'white',
      borderBottom: '1px solid var(--mc-gray-200)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      {/* Titre + date */}
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--mc-gray-800)' }}>
          {pageTitle}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--mc-gray-400)', textTransform: 'capitalize' }}>
          {today}
        </p>
      </div>

      {/* Barre de recherche + icônes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Recherche */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--mc-gray-100)', borderRadius: 8,
          padding: '6px 12px', width: 220,
        }}>
          <Search size={15} color="var(--mc-gray-400)" />
          <input
            type="text"
            placeholder="Rechercher..."
            style={{
              border: 'none', background: 'transparent',
              fontSize: 13, color: 'var(--mc-gray-800)',
              outline: 'none', width: '100%',
            }}
          />
        </div>

        {/* Notifications */}
        <button style={{
          position: 'relative', background: 'var(--mc-gray-100)',
          border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer',
        }}>
          <Bell size={18} color="var(--mc-gray-600)" />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 8, height: 8, background: 'var(--mc-red)',
            borderRadius: '50%', border: '2px solid white',
          }} />
        </button>

        {/* Settings */}
        <button style={{
          background: 'var(--mc-gray-100)',
          border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer',
        }}>
          <Settings size={18} color="var(--mc-gray-600)" />
        </button>

        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--mc-blue)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>
          A
        </div>
      </div>
    </div>
  );
}
