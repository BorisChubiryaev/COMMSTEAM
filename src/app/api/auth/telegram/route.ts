import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, verifyTelegramLogin, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'
import { tgGetChatMemberStatus } from '@/lib/telegram'

// Statuses that count as "currently in the team chat".
const ALLOWED_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted'])

function buildName(data: { first_name?: string; last_name?: string; username?: string; id: string }) {
  const full = [data.first_name, data.last_name].filter(Boolean).join(' ').trim()
  return full || data.username || `tg${data.id}`
}

type AuthResult =
  | { ok: true; token: string; member: { id: string; name: string } }
  | { ok: false; status: number; error: string }

// Shared logic for both the POST (JSON) and GET (redirect) login flows.
async function authenticate(data: Record<string, string>): Promise<AuthResult> {
  const verified = await verifyTelegramLogin(data)
  if (!verified) {
    return { ok: false, status: 401, error: 'Подпись Telegram не прошла проверку' }
  }

  const teamChatId = process.env.TELEGRAM_NOTIFY_CHAT_ID?.trim()
  if (!teamChatId) {
    return { ok: false, status: 503, error: 'Командный чат не настроен (TELEGRAM_NOTIFY_CHAT_ID)' }
  }

  const status = await tgGetChatMemberStatus(teamChatId, verified.id)
  if (!status || !ALLOWED_STATUSES.has(status)) {
    return { ok: false, status: 403, error: 'Доступ только для участников командного чата. Попросите добавить вас в группу.' }
  }

  const name = buildName(verified)
  const member = await db.teamMember.upsert({
    where: { telegramId: verified.id },
    create: {
      name,
      telegramId: verified.id,
      telegramChatId: verified.id,
      telegramUsername: verified.username || null,
      avatar: verified.photo_url || null,
    },
    update: {
      name,
      telegramChatId: verified.id,
      telegramUsername: verified.username || null,
      avatar: verified.photo_url || null,
    },
  })

  const token = await createSession({ sub: member.id, tid: verified.id, name: member.name })
  return { ok: true, token, member }
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}

// POST — used by the JS callback flow (data is the Telegram user object).
export async function POST(req: Request) {
  const payload = await req.json().catch(() => null)
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const data: Record<string, string> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value != null) data[key] = String(value)
  }

  const result = await authenticate(data)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const response = NextResponse.json({ user: result.member })
  response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions())
  return response
}

// GET — used by the Telegram Login Widget redirect flow (data-auth-url).
// Telegram redirects the browser here with the auth fields in the query string.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const data: Record<string, string> = {}
  url.searchParams.forEach((value, key) => { data[key] = value })

  const result = await authenticate(data)
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(result.error)}`, url.origin))
  }

  const response = NextResponse.redirect(new URL('/', url.origin))
  response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions())
  return response
}
