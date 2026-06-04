import { db } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contact = await db.contact.findUnique({
    where: { id },
    include: {
      comments: {
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!contact) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(contact)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, any> = {}
  const allowedFields = ['name', 'company', 'role', 'email', 'phone', 'telegram', 'notes', 'tags']
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field]
  }
  const contact = await db.contact.update({
    where: { id },
    data,
    include: { comments: { include: { author: true } } },
  })
  return Response.json(contact)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.comment.deleteMany({ where: { contactId: id } })
  await db.contact.delete({ where: { id } })
  return Response.json({ success: true })
}
