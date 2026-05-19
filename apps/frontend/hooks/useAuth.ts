'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
      .then((data) => setUser(data.user ?? data))
      .catch(() => {
        localStorage.removeItem('token')
        router.push('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    router.push('/login')
  }, [router])

  return { user, loading, logout }
}
