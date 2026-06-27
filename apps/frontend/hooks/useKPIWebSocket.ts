'use client'

import { useState, useEffect, useCallback } from 'react'
import { connectSocket, disconnectSocket } from '@/lib/websocket'
import type { Socket } from 'socket.io-client'

export interface KpiData {
  activeUsers: number
  requestsToday: number
  successRate: number
  avgResponseTime: number
  errorCount: number
  transactionsPerMin: number
  uptime: number
  timestamp: string
}

interface UseKpiWebSocketReturn {
  kpis: KpiData | null
  loading: boolean
  connected: boolean
  lastUpdated: string | null
  refresh: () => void
}

export function useKPIWebSocket(): UseKpiWebSocketReturn {
  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const s = connectSocket(token)
    setSocket(s)

    function onConnect() { setConnected(true) }
    function onDisconnect() { setConnected(false) }
    function onKpiUpdate(data: KpiData) {
      setKpis(data)
      setLastUpdated(data.timestamp)
      setLoading(false)
    }
    function onError() { setLoading(false) }

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('kpi_update', onKpiUpdate)
    s.on('error', onError)

    if (s.connected) setConnected(true)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('kpi_update', onKpiUpdate)
      s.off('error', onError)
      disconnectSocket()
    }
  }, [])

  const refresh = useCallback(() => {
    if (socket?.connected) {
      socket.emit('refresh')
    } else {
      const token = localStorage.getItem('token')
      if (token) {
        const s = connectSocket(token)
        setSocket(s)
      }
    }
  }, [socket])

  return { kpis, loading, connected, lastUpdated, refresh }
}
