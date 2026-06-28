const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, { status })
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('t')
  if (!token) {
    return jsonResponse({ message: 'Token manquant' }, 401)
  }

  if (!BACKEND_URL) {
    return jsonResponse({ message: 'Configuration API manquante' }, 500)
  }

  try {
    const backendResponse = await fetch(
      `${BACKEND_URL}/patient/portal?t=${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    )
    const body = await backendResponse.json().catch(() => null)

    return jsonResponse(body, backendResponse.status)
  } catch {
    return jsonResponse({ message: 'Impossible de joindre le serveur patient' }, 502)
  }
}
