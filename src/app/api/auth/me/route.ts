import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { SESSION_COOKIE, verifySession } from '@/lib/auth'

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = await verifySession(token)
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const member = await db.teamMember.findUnique({ where: { id: session.sub } })
  if (!member) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user: member })
}
