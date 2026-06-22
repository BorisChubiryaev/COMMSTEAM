import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const code = String(body?.code || '').trim()
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Введите 6-значный код из Telegram' }, { status: 400 })
  }

  const member = await db.teamMember.findFirst({
    where: { loginCode: code, loginCodeExpiresAt: { gt: new Date() } },
  })
  if (!member) {
    return NextResponse.json({ error: 'Неверный или истёкший код. Запросите новый командой /login.' }, { status: 401 })
  }

  // One-time use: clear the code immediately.
  await db.teamMember.update({
    where: { id: member.id },
    data: { loginCode: null, loginCodeExpiresAt: null },
  })

  const token = await createSession({ sub: member.id, tid: member.telegramId || '', name: member.name })

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
