const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || ''

type RouteContext = {
  params: Promise<{
    id: string
    action: string
  }>
}

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, { status })
}

async function updateAppointment(request: Request, context: RouteContext) {
  const token = new URL(request.url).searchParams.get('t')
  if (!token) {
    return { body: { message: 'Token manquant' }, status: 401, token: '' }
  }

  if (!BACKEND_URL) {
    return { body: { message: 'Configuration API manquante' }, status: 500, token }
  }

  const { id, action } = await context.params
  if (action !== 'confirm' && action !== 'cancel') {
    return { body: { message: 'Action invalide' }, status: 400, token }
  }

  try {
    const backendResponse = await fetch(
      `${BACKEND_URL}/patient/portal/rdv/${encodeURIComponent(id)}/${action}?t=${encodeURIComponent(token)}`,
      { method: 'PATCH', cache: 'no-store' },
    )
    const body = await backendResponse.json().catch(() => null)

    return { body, status: backendResponse.status, token }
  } catch {
    return { body: { message: 'Impossible de joindre le serveur patient' }, status: 502, token }
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const result = await updateAppointment(request, context)
  return jsonResponse(result.body, result.status)
}

export async function POST(request: Request, context: RouteContext) {
  await updateAppointment(request, context)
  return new Response(null, { status: 204 })
}
