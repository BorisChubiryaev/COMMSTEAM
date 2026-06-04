import { db } from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.json()
  const comment = await db.comment.create({
    data: {
      content: body.content,
      authorId: body.authorId,
      signalId: body.signalId || null,
      contactId: body.contactId || null,
    },
    include: { author: true },
  })
  return Response.json(comment)
}
