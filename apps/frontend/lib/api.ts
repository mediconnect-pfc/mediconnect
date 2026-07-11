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

export interface DossierInput {
  patientId: string
  notes?: string
  ordonnance?: string
}

export interface DossierUpdateInput {
  notes?: string
  ordonnance?: string
}

export interface EstablishmentInput {
  name?: string
  type?: 'CLINIC' | 'HOSPITAL' | 'PHARMACY'
  plan?: 'FREE' | 'BASIC' | 'PREMIUM'
  phone?: string
  address?: string | null
  isActive?: boolean
  settings?: unknown
}

export interface CreateEstablishmentInput {
  name: string
  type: 'CLINIC' | 'HOSPITAL' | 'PHARMACY'
  plan: 'FREE' | 'BASIC' | 'PREMIUM'
  phone: string
  address?: string | null
  settings?: unknown
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: 'DOCTOR' | 'RECEPTIONIST' | 'CAISSIER'
  specialty?: string | null
}

export interface UpdateUserInput {
  name?: string
  email?: string
  password?: string
  role?: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'CAISSIER'
  specialty?: string | null
  isActive?: boolean
}

export async function getEstablishment(token: string, id: string) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/establishments/${id}`, {
    headers: authHeadersWithToken(token),
  }))

  if (!res.ok) throw new Error('Erreur chargement etablissement')
  return res.json()
}

export async function updateEstablishment(token: string, id: string, data: EstablishmentInput) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/establishments/${id}`, {
    method: 'PATCH',
    headers: authHeadersWithToken(token),
    body: JSON.stringify(data),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur mise a jour etablissement')
  }

  return res.json()
}

export async function getEstablishments(token: string) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/establishments`, {
    headers: authHeadersWithToken(token),
  }))

  if (!res.ok) throw new Error('Erreur chargement etablissements')
  return res.json()
}

export async function createEstablishment(token: string, data: CreateEstablishmentInput) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/establishments`, {
    method: 'POST',
    headers: authHeadersWithToken(token),
    body: JSON.stringify(data),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur creation etablissement')
  }

  return res.json()
}

export async function deactivateEstablishment(token: string, id: string) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/establishments/${id}`, {
    method: 'DELETE',
    headers: authHeadersWithToken(token),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur desactivation etablissement')
  }

  return res.json()
}

export async function getUsers(token: string) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/users`, {
    headers: authHeadersWithToken(token),
  }))

  if (!res.ok) throw new Error('Erreur chargement utilisateurs')
  return res.json()
}

export async function createUser(token: string, data: CreateUserInput) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: authHeadersWithToken(token),
    body: JSON.stringify(data),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur creation utilisateur')
  }

  return res.json()
}

export async function updateUser(token: string, id: string, data: UpdateUserInput) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: authHeadersWithToken(token),
    body: JSON.stringify(data),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur mise a jour utilisateur')
  }

  return res.json()
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

export async function launchCampaignWithCsv(token: string, id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await handleAuthResponse(await fetch(`${API_URL}/campaigns/${id}/launch-with-csv`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur lancement campagne CSV')
  }

  return res.json()
}

export async function createDossier(token: string, data: DossierInput) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/dossiers`, {
    method: 'POST',
    headers: authHeadersWithToken(token),
    body: JSON.stringify(data),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur creation dossier')
  }

  return res.json()
}

export async function updateDossier(token: string, id: string, data: DossierUpdateInput) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/dossiers/${id}`, {
    method: 'PATCH',
    headers: authHeadersWithToken(token),
    body: JSON.stringify(data),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur modification dossier')
  }

  return res.json()
}

export async function deleteDossier(token: string, id: string) {
  const res = await handleAuthResponse(await fetch(`${API_URL}/dossiers/${id}`, {
    method: 'DELETE',
    headers: authHeadersWithToken(token),
  }))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'Erreur suppression dossier')
  }

  return res.json()
}
