const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000'

async function proxy(request: Request, pathParts: string[]) {
  const url = new URL(request.url)
  const target = `${BACKEND_URL}/auth/${pathParts.join('/')}${url.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = await request.arrayBuffer()
  }

  try {
    const backendResponse = await fetch(target, init)
    const responseHeaders = new Headers()

    backendResponse.headers.forEach((value, key) => {
      if (
        key.toLowerCase() === 'content-type' ||
        key.toLowerCase() === 'content-disposition' ||
        key.toLowerCase() === 'set-cookie'
      ) {
        responseHeaders.set(key, value)
      }
    })

    return new Response(await backendResponse.arrayBuffer(), {
      status: backendResponse.status,
      headers: responseHeaders,
    })
  } catch {
    return Response.json(
      { message: 'Impossible de joindre le serveur d’authentification' },
      { status: 502 },
    )
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path)
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path)
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path)
}
