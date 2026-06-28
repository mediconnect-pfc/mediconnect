'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
export default function ResetPasswordPage() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get('token') || '')
  }, [])

  const passwordError = touched && password.length < 6
  const confirmError = touched && confirmPassword !== password
  const valid = token && password.length >= 6 && confirmPassword === password

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!valid) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || 'Lien invalide ou expiré')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Mot de passe modifié</h2>
          <p className="text-sm text-gray-500">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-800">MediConnect</h1>
          <p className="mt-2 text-gray-500">Nouveau mot de passe</p>
        </div>

        {!token && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            Lien de réinitialisation manquant.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setTouched(true)}
              className={`mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                passwordError
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
            />
            {passwordError && <p className="mt-1 text-xs text-red-500">Minimum 6 caractères</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setTouched(true)}
              className={`mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                confirmError
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
            />
            {confirmError && <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas</p>}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
