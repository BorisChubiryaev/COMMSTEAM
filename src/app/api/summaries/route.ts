import { db } from '@/lib/db'

export async function GET() {
  const summaries = await db.periodSummary.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(summaries)
}

export async function POST(req: Request) {
  const body = await req.json()
  const summary = await db.periodSummary.create({
    data: {
      title: body.title,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      aiSummary: body.aiSummary || null,
    },
  })
  return Response.json(summary)
}
