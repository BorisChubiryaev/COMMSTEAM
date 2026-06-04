import { db } from '@/lib/db'

export async function GET() {
  const members = await db.teamMember.findMany({
    orderBy: { name: 'asc' },
  })
  return Response.json(members)
}

export async function POST(req: Request) {
  const body = await req.json()
  const member = await db.teamMember.create({
    data: {
      name: body.name,
      avatar: body.avatar || null,
      role: body.role || null,
      email: body.email || null,
    },
  })
  return Response.json(member)
}
