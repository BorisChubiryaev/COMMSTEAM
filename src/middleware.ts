import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth'

// API paths reachable without a session:
//  - the auth flow itself,
//  - the Telegram webhook (authenticated by its own secret header),
//  - cron jobs (authenticated by CRON_SECRET).
const PUBLIC_API_PREFIXES = [
  '/api/auth/',
  '/api/integrations/telegram/webhook',
  '/api/cron/',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Требуется вход через Telegram' }, { status: 401 })
  }

  return NextResponse.next()
}

// Only guard data APIs. The page shell ('/') renders the login screen itself
// when /api/auth/me returns 401, so it stays public.
export const config = {
  matcher: ['/api/:path*'],
}
