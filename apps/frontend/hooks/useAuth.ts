'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

function setCookie(token: string) {
  document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`
}

function clearCookie() {
  document.cookie = 'token=; path=/; max-age=0'
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = useMemo(() => !!user, [user])

  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetch(`${API_URL}/auth/me`, {
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
          localStorage.removeItem('token')
          clearCookie()
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [router])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/auth/login`, {
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
    localStorage.removeItem('token')
    clearCookie()
    setUser(null)
    router.push('/login')
  }, [router])

  return { user, loading, login, logout, isAuthenticated }
}
