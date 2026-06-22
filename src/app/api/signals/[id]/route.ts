import { db } from '@/lib/db'
import { notifyTeam } from '@/lib/notify'
import { after } from 'next/server'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function eventTypeFromPublicationType(publicationType: string | null) {
  if (publicationType === 'Выступление') return 'Выступление'
  if (publicationType === 'Мероприятие/Митап') return 'Мероприятие'
  return 'Встреча'
}

const signalInclude = {
  assignee: true,
  collaborators: true,
  contacts: true,
  calendarEvent: true,
  comments: {
    include: { author: true },
    orderBy: { createdAt: 'desc' as const },
  },
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const signal = await db.signal.findUnique({
    where: { id },
    include: signalInclude,
  })
  if (!signal) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(signal)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  
  const data: Record<string, any> = {}
  const allowedFields = [
    'title', 'content', 'link', 'aiSummary', 'source', 'signalType',
    'relevance', 'alignment', 'urgency', 'potential', 'risks', 'priority',
    'meanings', 'distribution', 'publicationType', 'aiContent', 'launchDate',
    'launchLocation', 'status',
    'reach', 'engagement', 'mediaMentions', 'traffic', 'leads',
    'businessImpact', 'whatWorked', 'whatDidntWork', 'newInsights',
    'meaningMapUpdate', 'assigneeId',
  ]
  
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = field === 'launchDate' && body[field] ? new Date(body[field]) : body[field]
    }
  }

  if ('contactIds' in body) {
    data.contacts = {
      set: Array.isArray(body.contactIds) ? body.contactIds.map((contactId: string) => ({ id: contactId })) : [],
    }
  }

  if ('collaboratorIds' in body) {
    data.collaborators = {
      set: Array.isArray(body.collaboratorIds) ? body.collaboratorIds.map((memberId: string) => ({ id: memberId })) : [],
    }
  }

  const existing = await db.signal.findUnique({
    where: { id },
    select: { calendarEventId: true, assigneeId: true },
  })

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const syncCalendar = 'launchDate' in body || 'launchLocation' in body || 'publicationType' in body || 'title' in body || 'content' in body || 'assigneeId' in body || 'contactIds' in body

  const signal = await db.$transaction(async (tx) => {
    const updated = await tx.signal.update({
      where: { id },
      data,
      include: signalInclude,
    })

    if (!syncCalendar) return updated

    if (!updated.launchDate) {
      if (existing.calendarEventId) {
        await tx.event.delete({ where: { id: existing.calendarEventId } }).catch(() => null)
        return tx.signal.update({
          where: { id },
          data: { calendarEventId: null },
          include: signalInclude,
        })
      }
      return updated
    }

    const eventContactLinks = updated.contacts.map((contact) => ({ id: contact.id }))
    const eventData = {
      title: `Запуск: ${updated.title}`,
      description: updated.content || updated.aiSummary || null,
      date: updated.launchDate,
      location: updated.launchLocation || null,
      type: eventTypeFromPublicationType(updated.publicationType),
      status: 'planned',
      organizerId: updated.assigneeId || null,
    }

    if (updated.calendarEventId) {
      await tx.event.update({
        where: { id: updated.calendarEventId },
        data: { ...eventData, contacts: { set: eventContactLinks } },
      })
      return tx.signal.findUniqueOrThrow({
        where: { id },
        include: signalInclude,
      })
    }

    const event = await tx.event.create({
      data: { ...eventData, contacts: { connect: eventContactLinks } },
    })
    return tx.signal.update({
      where: { id },
      data: { calendarEventId: event.id },
      include: signalInclude,
    })
  }, { timeout: 15000 })

  // Notify the team when the assignee changes to a new person.
  const assigneeChanged = 'assigneeId' in body && body.assigneeId && body.assigneeId !== existing.assigneeId
  if (assigneeChanged && signal.assignee) {
    after(() => notifyTeam(
      `👤 Назначен ответственный: <b>${escapeHtml(signal.assignee!.name)}</b>\nСигнал: ${escapeHtml(signal.title)}`,
    ))
  }

  return Response.json(signal)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.comment.deleteMany({ where: { signalId: id } })
  await db.signal.delete({ where: { id } })
  return Response.json({ success: true })
}
