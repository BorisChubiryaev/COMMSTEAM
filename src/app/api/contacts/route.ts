import { db } from '@/lib/db'

export async function GET() {
  const contacts = await db.contact.findMany({
    include: {
      comments: {
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  })
  return Response.json(contacts)
}

export async function POST(req: Request) {
  const body = await req.json()
  const contact = await db.contact.create({
    data: {
      name: body.name,
      company: body.company || null,
      role: body.role || null,
      email: body.email || null,
      phone: body.phone || null,
      telegram: body.telegram || null,
      notes: body.notes || null,
      tags: body.tags || null,
    },
    include: {
      comments: { include: { author: true } },
    },
  })
  return Response.json(contact)
}
