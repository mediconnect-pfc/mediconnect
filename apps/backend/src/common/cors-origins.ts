const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|::1)(:\d+)?$/i;
const LOCAL_IPV6_ORIGIN_PATTERN = /^https?:\/\/\[::1\](:\d+)?$/i;
const TUNNEL_ORIGIN_PATTERNS = [
  /^https?:\/\/[^/]+\.trycloudflare\.com$/i,
  /^https?:\/\/[^/]+\.ngrok-free\.app$/i,
  /^https?:\/\/[^/]+\.ngrok\.app$/i,
];

function normalizeOrigin(origin: string): string {
  return origin
    .trim()
    .replace(/^['"`]|['"`]$/g, '')
    .replace(/\/+$/, '');
}

function parseOriginList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

export function configuredCorsOrigins(): string[] {
  return [
    ...parseOriginList(process.env.FRONTEND_URL),
    ...parseOriginList(process.env.PATIENT_PORTAL_URL),
    ...parseOriginList(process.env.CORS_ORIGINS),
  ];
}

export function isAllowedCorsOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);

  if (
    LOCAL_ORIGIN_PATTERN.test(normalized) ||
    LOCAL_IPV6_ORIGIN_PATTERN.test(normalized) ||
    TUNNEL_ORIGIN_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return true;
  }

  return configuredCorsOrigins().includes(normalized);
}
