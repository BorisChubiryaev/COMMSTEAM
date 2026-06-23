import { db } from '@/lib/db'
import { syncEventKnowledge } from '@/lib/knowledge'
import { after } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, any> = {}
  const allowedFields = ['title', 'description', 'date', 'endDate', 'location', 'type', 'status', 'organizerId', 'responsible', 'tentative', 'dateText']
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = field === 'date' || field === 'endDate' ? new Date(body[field]) : body[field]
    }
  }
  if ('contactIds' in body) {
    data.contacts = {
      set: Array.isArray(body.contactIds) ? body.contactIds.map((contactId: string) => ({ id: contactId })) : [],
    }
  }
  const event = await db.event.update({
    where: { id },
    data,
    include: { organizer: true, contacts: true },
  })
  after(() => syncEventKnowledge(event.id))
  return Response.json(event)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.event.delete({ where: { id } })
  return Response.json({ success: true })
}
