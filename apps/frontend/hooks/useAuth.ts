'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
import { clearAuthToken, getAuthToken } from '@/lib/api'

function setCookie(token: string) {
  document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = useMemo(() => !!user, [user])

  useEffect(() => {
    let cancelled = false
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          const u = data.user ?? data
          setUser(u)
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthToken()
          router.push('/login?expired=1')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [router])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Email ou mot de passe incorrect')
      localStorage.setItem('token', data.token)
      setCookie(data.token)
      setUser(data.user)
      router.push('/dashboard')
    },
    [router],
  )

  const logout = useCallback(() => {
    clearAuthToken()
    setUser(null)
    router.push('/login')
  }, [router])

  return { user, loading, login, logout, isAuthenticated }
}
