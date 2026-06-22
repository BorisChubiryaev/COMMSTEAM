// Telegram Login verification + lightweight signed session cookie.
//
// Everything here uses Web Crypto (crypto.subtle) so it runs in both the
// Node route handlers and the Edge middleware. No external dependencies.

export const SESSION_COOKIE = 'commsteam_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days
const LOGIN_MAX_AGE_SECONDS = 60 * 60 * 24 // reject Telegram payloads older than 1 day

export type TelegramAuthData = {
  id: string
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: string
  hash: string
}

export type SessionPayload = {
  sub: string // TeamMember id
  tid: string // telegram id
  name: string
  exp: number // unix seconds
}

const encoder = new TextEncoder()

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256(input: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(input)))
}

async function hmacSha256(keyBytes: Uint8Array, message: string) {
  const key = await crypto.subtle.importKey('raw', keyBytes as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)))
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Verify a Telegram Login Widget payload (https://core.telegram.org/widgets/login#checking-authorization).
 * Returns the typed data when the signature and freshness check pass, else null.
 */
export async function verifyTelegramLogin(data: Record<string, string>): Promise<TelegramAuthData | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token || !data.hash || !data.id || !data.auth_date) return null

  const checkString = Object.keys(data)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n')

  const secretKey = await sha256(token)
  const computed = bytesToHex(await hmacSha256(secretKey, checkString))
  if (!timingSafeEqual(computed, data.hash)) return null

  const authDate = Number(data.auth_date)
  if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > LOGIN_MAX_AGE_SECONDS) return null

  return data as TelegramAuthData
}

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET?.trim()
  if (!secret) throw new Error('AUTH_SECRET is not configured')
  return encoder.encode(secret)
}

/** Create a signed session token: base64url(payload).base64url(hmac). */
export async function createSession(input: Omit<SessionPayload, 'exp'>): Promise<string> {
  const payload: SessionPayload = { ...input, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = bytesToBase64Url(await hmacSha256(getSessionSecret(), body))
  return `${body}.${signature}`
}

/** Verify a session token and return its payload, or null if invalid/expired. */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  let expected: string
  try {
    expected = bytesToBase64Url(await hmacSha256(getSessionSecret(), body))
  } catch {
    return null
  }
  if (!timingSafeEqual(expected, signature)) return null

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS
