import { db } from '@/lib/db'
import { notifyMember } from '@/lib/notify'
import { syncSignalKnowledge } from '@/lib/knowledge'
import { SESSION_COOKIE, verifySession } from '@/lib/auth'
import { after } from 'next/server'
import { cookies } from 'next/headers'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function getActorId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = await verifySession(token)
  return session?.sub ?? null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  
  const signals = await db.signal.findMany({
    where: status ? { status } : undefined,
    include: {
      assignee: true,
      collaborators: true,
      contacts: true,
      calendarEvent: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(signals)
}

export async function POST(req: Request) {
  const body = await req.json()
  const signal = await db.signal.create({
    data: {
      title: body.title,
      content: body.content || null,
      link: body.link || null,
      aiSummary: body.aiSummary || null,
      source: body.source || null,
      signalType: body.signalType || null,
      launchDate: body.launchDate ? new Date(body.launchDate) : null,
      launchLocation: body.launchLocation || null,
      status: body.status || 'input',
      assigneeId: body.assigneeId || null,
      contacts: Array.isArray(body.contactIds) ? { connect: body.contactIds.map((id: string) => ({ id })) } : undefined,
      collaborators: Array.isArray(body.collaboratorIds) ? { connect: body.collaboratorIds.map((id: string) => ({ id })) } : undefined,
    },
    include: {
      assignee: true,
      collaborators: true,
      contacts: true,
      calendarEvent: true,
      comments: { include: { author: true } },
    },
  })

  // Notify the assignee — but not when they assigned the signal to themselves
  // (the creator is the assignee here), since self-pings are just noise.
  const actorId = await getActorId()
  if (signal.assignee && signal.assignee.id !== actorId) {
    after(() => notifyMember(
      signal.assignee,
      `👤 Вам назначен сигнал: <b>${escapeHtml(signal.title)}</b>`,
    ))
  }

  after(() => syncSignalKnowledge(signal.id))

  return Response.json(signal)
}
