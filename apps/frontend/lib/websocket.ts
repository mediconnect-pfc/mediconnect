import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

let socket: Socket | null = null

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket

  socket = io(`${WS_URL}/analytics/kpis`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 5000,
  })

  socket.on('connect', () => console.log('[WS] Connected'))
  socket.on('disconnect', (reason) => console.log('[WS] Disconnected:', reason))
  socket.on('connect_error', (err) => console.error('[WS] Error:', err.message))

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
