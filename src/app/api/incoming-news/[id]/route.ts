import { db } from '@/lib/db'

const ALLOWED_STATUSES = new Set(['new', 'converted', 'duplicate', 'ignored'])

function statusAction(status: string) {
  if (status === 'ignored') return 'ignored'
  if (status === 'new') return 'restored'
  if (status === 'duplicate') return 'marked_duplicate'
  return 'edited'
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await req.json()
  const status = String(body.status || '').trim()

  if (status && !ALLOWED_STATUSES.has(status)) {
    return Response.json({ error: 'Неверный статус входящей новости' }, { status: 400 })
  }

  const data: Record<string, string | number | null> = {}
  if (status) data.status = status
  if ('duplicateOfId' in body) data.duplicateOfId = body.duplicateOfId || null
  if ('signalId' in body) data.signalId = body.signalId || null
  if ('duplicateScore' in body) data.duplicateScore = body.duplicateScore || null
  if ('duplicateReason' in body) data.duplicateReason = body.duplicateReason || null

  const item = await db.incomingNews.update({
    where: { id },
    data,
    include: {
      signal: true,
      duplicateOf: true,
      decisionHistory: { orderBy: { createdAt: 'desc' } },
    },
  })

  await db.decisionHistory.create({
    data: {
      incomingNewsId: id,
      signalId: item.signalId,
      action: status ? statusAction(status) : 'edited',
      actor: String(body.actor || 'user'),
      note: body.note ? String(body.note) : null,
      metadata: JSON.stringify(data),
    },
  })

  const freshItem = await db.incomingNews.findUnique({
    where: { id },
    include: {
      signal: true,
      duplicateOf: true,
      decisionHistory: { orderBy: { createdAt: 'desc' } },
    },
  })

  return Response.json(freshItem || item)
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  await db.incomingNews.delete({ where: { id } })
  return Response.json({ success: true })
}
