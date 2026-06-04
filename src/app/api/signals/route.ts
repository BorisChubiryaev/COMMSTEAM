import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  
  const signals = await db.signal.findMany({
    where: status ? { status } : undefined,
    include: {
      assignee: true,
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
      status: body.status || 'input',
      assigneeId: body.assigneeId || null,
    },
    include: {
      assignee: true,
      comments: { include: { author: true } },
    },
  })
  return Response.json(signal)
}
