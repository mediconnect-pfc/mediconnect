export const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  const fromStorage = localStorage.getItem('token')
  if (fromStorage) return fromStorage

  const match = document.cookie.match(/(?:^|; )token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function clearAuthToken() {
  localStorage.removeItem('token')
  document.cookie = 'token=; path=/; max-age=0'
}

export function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export function redirectToLogin(expired = false) {
  clearAuthToken()
  const url = expired ? '/login?expired=1' : '/login'
  window.location.href = url
}

export async function handleAuthResponse(res: Response): Promise<Response> {
  if (res.status === 401) {
    redirectToLogin(true)
    throw new Error('Session expirée')
  }
  return res
}
