import { db } from '@/lib/db'

export async function GET() {
  const events = await db.event.findMany({
    include: { organizer: true, contacts: true },
    orderBy: { date: 'asc' },
  })
  return Response.json(events)
}

export async function POST(req: Request) {
  const body = await req.json()
  const event = await db.event.create({
    data: {
      title: body.title,
      description: body.description || null,
      date: new Date(body.date),
      endDate: body.endDate ? new Date(body.endDate) : null,
      location: body.location || null,
      type: body.type || null,
      status: body.status || 'planned',
      organizerId: body.organizerId || null,
      contacts: Array.isArray(body.contactIds) ? { connect: body.contactIds.map((id: string) => ({ id })) } : undefined,
    },
    include: { organizer: true, contacts: true },
  })
  return Response.json(event)
}
