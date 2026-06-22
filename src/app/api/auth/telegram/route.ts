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

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null)
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  // Normalize every value to string for HMAC verification.
  const data: Record<string, string> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value != null) data[key] = String(value)
  }

  const verified = await verifyTelegramLogin(data)
  if (!verified) {
    return NextResponse.json({ error: 'Подпись Telegram не прошла проверку' }, { status: 401 })
  }

  // Gate access by membership in the team chat.
  const teamChatId = process.env.TELEGRAM_NOTIFY_CHAT_ID?.trim()
  if (!teamChatId) {
    return NextResponse.json({ error: 'Командный чат не настроен (TELEGRAM_NOTIFY_CHAT_ID)' }, { status: 503 })
  }

  const status = await tgGetChatMemberStatus(teamChatId, verified.id)
  if (!status || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { error: 'Доступ только для участников командного чата. Попросите добавить вас в группу.' },
      { status: 403 },
    )
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

  const response = NextResponse.json({ user: member })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return response
}
