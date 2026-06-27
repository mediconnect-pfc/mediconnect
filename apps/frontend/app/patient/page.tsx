import PatientPortalClient, { type PortalData } from './PatientPortalClient'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || ''

type PatientPortalPageProps = {
  searchParams: Promise<{
    t?: string
    token?: string
  }>
}

async function getPortalData(token: string): Promise<{ data: PortalData | null; error: string }> {
  if (!BACKEND_URL) {
    return { data: null, error: 'Configuration API manquante.' }
  }

  try {
    const res = await fetch(`${BACKEND_URL}/patient/portal?t=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)

    if (!res.ok) {
      const message =
        typeof body?.message === 'string'
          ? body.message
          : Array.isArray(body?.message)
            ? body.message.join(', ')
            : 'Token invalide ou expire'

      return { data: null, error: message }
    }

    return { data: body as PortalData, error: '' }
  } catch {
    return { data: null, error: 'Impossible de joindre le serveur patient.' }
  }
}

export default async function PatientPortalPage({ searchParams }: PatientPortalPageProps) {
  const params = await searchParams
  const token = params.t || params.token || ''

  if (!token) {
    return <PatientPortalClient token="" initialData={null} initialError="Token manquant ou invalide." />
  }

  const { data, error } = await getPortalData(token)

  return <PatientPortalClient token={token} initialData={data} initialError={error} />
}
