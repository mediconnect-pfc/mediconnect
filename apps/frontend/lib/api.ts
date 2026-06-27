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

export function authHeadersWithToken(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
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

export interface CampaignInput {
  name: string
  type: 'SMS' | 'VOICE' | 'EMERGENCY'
  message: string
  segment?: string | null
  scheduledAt?: string | null
}

export async function getCampaigns(token?: string) {
  const headers = token ? authHeadersWithToken(token) : authHeaders()
  const res = await handleAuthResponse(await fetch(`${API_URL}/campaigns`, { headers }))
  if (!res.ok) throw new Error('Erreur chargement campagnes')
  return res.json()
}

export async function getCampaignStats(id: string, token?: string) {
  const headers = token ? authHeadersWithToken(token) : authHeaders()
  const res = await handleAuthResponse(await fetch(`${API_URL}/campaigns/${id}`, { headers }))
  if (!res.ok) throw new Error('Erreur chargement campagne')
  return res.json()
}

export async function createCampaign(token: string, data: CampaignInput) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/campaigns`, {
    method: 'POST',
    headers: authHeadersWithToken(token),
    body: JSON.stringify(data),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur creation campagne')
  }

  return res.json()
}

export async function launchCampaign(token: string, id: string) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/campaigns/${id}/launch`, {
    method: 'POST',
    headers: authHeadersWithToken(token),
    body: JSON.stringify({}),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur lancement campagne')
  }

  return res.json()
}

export async function pauseCampaign(token: string, id: string) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/campaigns/${id}/pause`, {
    method: 'PATCH',
    headers: authHeadersWithToken(token),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur pause campagne')
  }

  return res.json()
}
