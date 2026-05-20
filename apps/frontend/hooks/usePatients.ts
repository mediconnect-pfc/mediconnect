'use client'

import { useState, useCallback } from 'react'
import type { Patient, PaginatedResponse } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchPatients = useCallback(async (page = 1, search = '', status = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)

      const res = await fetch(`${API_URL}/patients?${params}`, { headers: authHeaders() })
      const data: PaginatedResponse<Patient> = await res.json()

      setPatients(data.data ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 0)
    } catch {
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  const getPatient = useCallback(async (id: string): Promise<Patient | null> => {
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, { headers: authHeaders() })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }, [])

  const createPatient = useCallback(async (data: Record<string, JsonValue>): Promise<{ patient?: Patient; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return { error: body.message || JSON.stringify(body) || 'Erreur création patient' }
      }
      return { patient: await res.json() }
    } catch {
      return { error: 'Erreur de connexion au serveur' }
    }
  }, [])

  const updatePatient = useCallback(async (id: string, data: Record<string, JsonValue>): Promise<{ patient?: Patient; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return { error: body.message || 'Erreur modification patient' }
      }
      return { patient: await res.json() }
    } catch {
      return { error: 'Erreur de connexion au serveur' }
    }
  }, [])

  const deletePatient = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, { method: 'DELETE', headers: authHeaders() })
      return res.ok
    } catch {
      return false
    }
  }, [])

  const importCSV = useCallback(async (file: File): Promise<boolean> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/patients/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  return { patients, total, totalPages, loading, fetchPatients, getPatient, createPatient, updatePatient, deletePatient, importCSV }
}
