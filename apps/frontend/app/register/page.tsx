'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  })

  const nameError = touched.name && name.trim().length === 0
  const emailError = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordError = touched.password && password.length < 6
  const confirmError =
    touched.confirmPassword && confirmPassword !== password

  const valid =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 6 &&
    confirmPassword === password

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    })
    if (!valid) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Erreur lors de l'inscription")
        return
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
        document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`
      }
      router.push('/dashboard')
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-800">MediConnect</h1>
          <p className="mt-2 text-gray-500">Créez votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, name: true }))}
              placeholder="Dr. Dupont"
              className={`mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                nameError
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
            />
            {nameError && (
              <p className="mt-1 text-xs text-red-500">Nom requis</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              placeholder="vous@exemple.com"
              className={`mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                emailError
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
            />
            {emailError && (
              <p className="mt-1 text-xs text-red-500">Email invalide</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              placeholder="••••••••"
              className={`mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                passwordError
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
            />
            {passwordError && (
              <p className="mt-1 text-xs text-red-500">Minimum 6 caractères</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
              placeholder="••••••••"
              className={`mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                confirmError
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
            />
            {confirmError && (
              <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              "S'inscrire"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
