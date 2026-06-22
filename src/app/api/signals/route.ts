import { db } from '@/lib/db'
import { notifyTeam } from '@/lib/notify'
import { after } from 'next/server'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

  if (signal.assignee) {
    after(() => notifyTeam(
      `👤 Назначен ответственный: <b>${escapeHtml(signal.assignee!.name)}</b>\nСигнал: ${escapeHtml(signal.title)}`,
    ))
  }

  return Response.json(signal)
}
