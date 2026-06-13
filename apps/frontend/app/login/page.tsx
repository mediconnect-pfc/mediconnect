'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

function setCookie(token: string) {
  document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })

  const emailError = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordError = touched.password && password.length < 6
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6

  useEffect(() => {
    if (window.location.search.includes('expired=1')) {
      setError('Votre session a expiré. Veuillez vous reconnecter.')
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (!valid) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Email ou mot de passe incorrect')

      localStorage.setItem('token', data.token)
      setCookie(data.token)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f2f5] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-10 shadow-2xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f1f3d]">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <h1 className="text-xl font-bold text-[#0f1f3d]">MediConnect</h1>
          <p className="mt-1 text-sm text-gray-400">Connexion à votre espace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              placeholder="votre@email.com"
              className={`mt-1.5 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                emailError ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {emailError && <p className="mt-1 text-xs text-red-500">Email invalide</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              placeholder="••••••••"
              className={`mt-1.5 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                passwordError ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {passwordError && <p className="mt-1 text-xs text-red-500">Minimum 6 caractères</p>}
          </div>

          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-[#0f1f3d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#162d57] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">Mot de passe oublié ?</Link>
          <p className="text-gray-400">
            Pas encore de compte ?{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
