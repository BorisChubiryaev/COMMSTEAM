import { db } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const signal = await db.signal.findUnique({
    where: { id },
    include: {
      assignee: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      },
    },
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
    'meanings', 'distribution', 'publicationType', 'aiContent', 'status',
    'reach', 'engagement', 'mediaMentions', 'traffic', 'leads',
    'businessImpact', 'whatWorked', 'whatDidntWork', 'newInsights',
    'meaningMapUpdate', 'assigneeId',
  ]
  
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field]
    }
  }
  
  const signal = await db.signal.update({
    where: { id },
    data,
    include: {
      assignee: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  return Response.json(signal)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.comment.deleteMany({ where: { signalId: id } })
  await db.signal.delete({ where: { id } })
  return Response.json({ success: true })
}
