'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // TODO: connecter à l'API auth
    router.push('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--mc-gray-50)',
    }}>
      <div style={{
        background: 'white', borderRadius: 16,
        padding: 40, width: '100%', maxWidth: 400,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, background: 'var(--mc-navy)',
            borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>M</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--mc-navy)' }}>MediConnect</h1>
          <p style={{ fontSize: 13, color: 'var(--mc-gray-400)', marginTop: 4 }}>Connexion à votre espace</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--mc-gray-600)', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--mc-gray-200)',
                borderRadius: 8, fontSize: 14, outline: 'none',
              }}
              placeholder="votre@email.com"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--mc-gray-600)', display: 'block', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--mc-gray-200)',
                borderRadius: 8, fontSize: 14, outline: 'none',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p style={{ color: 'var(--mc-red)', fontSize: 13, marginBottom: 16 }}>{error}</p>
          )}

          <button type="submit" style={{
            width: '100%', padding: '11px',
            background: 'var(--mc-navy)', color: 'white',
            border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
