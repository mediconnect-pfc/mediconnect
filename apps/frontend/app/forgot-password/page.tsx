'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)

  const emailError = touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!valid) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Une erreur est survenue')
        return
      }

      setSuccess(true)
    } catch {
      setError('Erreur de connexion au serveur')
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
          <h2 className="text-xl font-semibold text-gray-800">Email envoyé</h2>
          <p className="text-sm text-gray-500">
            Si un compte existe avec cette adresse, vous recevrez un lien pour réinitialiser votre mot de passe.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Retour à la connexion
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
          <p className="mt-2 text-gray-500">Mot de passe oublié</p>
        </div>

        <p className="text-sm text-gray-500">
          Saisissez votre adresse email. Vous recevrez un lien pour réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
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
              'Envoyer le lien'
            )}
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
